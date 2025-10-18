import os
from datetime import datetime, timedelta
import jwt
import json
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow
import requests
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
import database as db
import schemas
from fastapi import FastAPI, HTTPException, Depends, status, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi import File, Form, UploadFile
import uuid
import shutil
from fastapi import BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType


load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = os.getenv("MAIL_FROM"),
    MAIL_PORT = int(os.getenv("MAIL_PORT")),
    MAIL_SERVER = os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS = str(os.getenv("MAIL_STARTTLS", "false")).lower() == 'true',
    MAIL_SSL_TLS  = str(os.getenv("MAIL_SSL_TLS", "false")).lower() == 'true',

    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True,
    TEMPLATE_FOLDER=Path(__file__).parent / "templates",
)

fm = FastMail(conf)

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, thread_id: str):
        await websocket.accept()
        if thread_id not in self.active_connections:
            self.active_connections[thread_id] = []
        self.active_connections[thread_id].append(websocket)

    def disconnect(self, websocket: WebSocket, thread_id: str):
        self.active_connections[thread_id].remove(websocket)

    async def broadcast(self, message: str, thread_id: str):
        if thread_id in self.active_connections:
            for connection in self.active_connections[thread_id]:
                await connection.send_text(message)

manager = ConnectionManager()

FRONTEND_URLS = os.getenv("FRONTEND_URLS", "http://localhost:5173")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in FRONTEND_URLS.split(",") if o.strip()]
app = FastAPI()

os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", f"{BACKEND_BASE_URL}/auth/google/callback")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SCOPES = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
]

@app.on_event("startup")
def on_startup():
    db.Base.metadata.create_all(bind=db.engine)

def get_current_user(token: str = Depends(oauth2_scheme), db_session: Session = Depends(db.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db_session.query(db.User).filter(db.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_admin_user(current_user: schemas.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized: Admin access required"
        )
    return current_user

@app.get("/")
def read_root():
    return {"message": "Backend"}

@app.get("/auth/google/login")
def auth_google():
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    authorization_url, state = flow.authorization_url(prompt="consent")
    return RedirectResponse(authorization_url)

@app.get("/auth/google/callback")
def auth_google_callback(code: str, db_session: Session = Depends(db.get_db)):
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    flow.fetch_token(code=code)
    credentials = flow.credentials
    user_info_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"},
    )
    if not user_info_res.ok:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")
    user_info = user_info_res.json()
    user_email = user_info.get("email", "")
    #if not user_email.endswith("@bc.edu"):
        #raise HTTPException(status_code=403, detail=f"Access denied. Email '{user_email}' is not a valid @bc.edu address.")
    user = db_session.query(db.User).filter(db.User.bc_email == user_email).first()
    if user:
        user.last_login_at = datetime.utcnow()
    else:
        user = db.User(
            name=user_info.get("name"),
            bc_email=user_email,
            photo_url=user_info.get("picture")
        )
        db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user.id, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={encoded_jwt}"
    return RedirectResponse(redirect_url)

@app.post("/listings", response_model=schemas.Listing)
def create_listing(
    db_session: Session = Depends(db.get_db),
    current_user: schemas.User = Depends(get_current_user),
    title: str = Form(...),
    description: str = Form(None),
    price: float = Form(...),
    category: str = Form(...),
    main_image_index: int = Form(...),
    files: List[UploadFile] = File(...)
):
    if len(files) > 4:
        raise HTTPException(status_code=400, detail="You can upload a maximum of 4 images.")

    saved_urls = []
    for file in files:
        if file.content_type not in ["image/jpeg", "image/png"]:
            if file.content_type not in ["image/jpeg", "image/png"]:
                raise HTTPException(
                        status_code = status.HTTP_400_BAD_REQUEST,
                        detail = f"Invalid file type: '{file.content_type}'. Only JPG and PNG Images are accepted."
                )

        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"static/images/{unique_filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_urls.append(f"/{file_path}")

    image_urls_dict = {f"image_url_{i+1}": url for i, url in enumerate(saved_urls)}

    main_image_url = saved_urls[main_image_index] if 0 <= main_image_index < len(saved_urls) else None

    listing_data = schemas.ListingCreate(
        title=title,
        description=description,
        price=price,
        category=category,
        main_image_url=main_image_url,
        **image_urls_dict
    )

    new_listing = db.Listing(**listing_data.model_dump(), owner_id=current_user.id)
    db_session.add(new_listing)
    db_session.commit()
    db_session.refresh(new_listing)
    return new_listing

@app.get("/listings", response_model=List[schemas.ListingPublic])
def get_all_listings(db_session: Session = Depends(db.get_db), query: Optional[str] = None, category: Optional[str] = None):
    listings_query = db_session.query(db.Listing).options(
        joinedload(db.Listing.owner)
    )
    if query:
        matching_categories = [cat for cat in db.ListingCategory if cat.value.lower().startswith(query.lower())]
        search_conditions = [db.Listing.title.ilike(f"%{query}%")]
        if matching_categories:
            search_conditions.append(db.Listing.category.in_(matching_categories))
        listings_query = listings_query.filter(or_(*search_conditions))
    if category:
        listings_query = listings_query.filter(db.Listing.category == category)
    
    listings = listings_query.order_by(db.Listing.created_at.desc()).all()
    return listings


@app.get("/users/me/listings", response_model=List[schemas.Listing])
def get_my_listings(
    db_session: Session = Depends(db.get_db), 
    current_user: schemas.User = Depends(get_current_user)
):
    listings = db_session.query(db.Listing).options(
        joinedload(db.Listing.owner)
    ).filter(db.Listing.owner_id == current_user.id).order_by(db.Listing.created_at.desc()).all()
    return listings

@app.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: str, 
    db_session: Session = Depends(db.get_db), 
    current_user: schemas.User = Depends(get_current_user)
):
    listing = db_session.query(db.Listing).filter(db.Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this listing")

    image_urls = [listing.image_url_1, listing.image_url_2, listing.image_url_3, listing.image_url_4]
    for url in image_urls:
        if url:
            try:
                os.remove(url.lstrip('/'))
            except FileNotFoundError:
                pass

    db_session.delete(listing)
    db_session.commit()
    return


@app.delete("/admin/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_listing(
    listing_id: str, 
    db_session: Session = Depends(db.get_db), 
    admin_user: schemas.User = Depends(get_current_admin_user)
):
    listing = db_session.query(db.Listing).filter(db.Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    image_urls = [listing.image_url_1, listing.image_url_2, listing.image_url_3, listing.image_url_4]
    for url in image_urls:
        if url:
            try:
                if "s3.amazonaws.com" in url:
                    filename = url.split('/')[-1]
                    s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=filename)
                else:
                    os.remove(url.lstrip('/'))
            except (FileNotFoundError, Exception):
                pass

    db_session.delete(listing)
    db_session.commit()
    return



@app.post("/listings/{listing_id}/report", status_code=status.HTTP_204_NO_CONTENT)
async def report_listing(
    listing_id: str,
    report: schemas.ReportCreate,
    background_tasks: BackgroundTasks,
    db_session: Session = Depends(db.get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    listing = db_session.query(db.Listing).options(
        joinedload(db.Listing.owner)
    ).filter(db.Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    template_data = {
        "reporter_name": current_user.name,
        "reporter_email": current_user.bc_email,
        "listing_title": listing.title,
        "listing_id": listing.id,
        "owner_name": listing.owner.name,
        "reason": report.reason,
    }

    admin_message = MessageSchema(
        subject=f"New Report for Listing: {listing.title}",
        recipients=["gayearona89@gmail.com"],
        template_body=template_data,
        subtype=MessageType.html,
    )

    confirmation_message = MessageSchema(
        subject=f"We've received your report: {listing.title}",
        recipients=[current_user.bc_email],
        template_body=template_data,
        subtype=MessageType.html,
    )

    background_tasks.add_task(fm.send_message, admin_message, template_name="report_notification.html")
    background_tasks.add_task(fm.send_message, confirmation_message, template_name="report_confirmation.html")

    return


@app.get("/admin/users", response_model=List[schemas.User])
def get_all_users(
    db_session: Session = Depends(db.get_db),
    admin_user: schemas.User = Depends(get_current_admin_user)
):
    return db_session.query(db.User).order_by(db.User.created_at.desc()).all()

@app.get("/admin/reports", response_model=List[schemas.Listing])
def get_reported_listings(
    db_session: Session = Depends(db.get_db),
    admin_user: schemas.User = Depends(get_current_admin_user)
):
    #placeholder
    return db_session.query(db.Listing).order_by(db.Listing.created_at.desc()).all()


@app.get("/listings/{listing_id}", response_model=schemas.ListingPublic)
def get_listing_by_id(listing_id: str, db_session: Session = Depends(db.get_db)):
    listing = db_session.query(db.Listing).options(joinedload(db.Listing.owner)).filter(db.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

@app.post("/threads/{listing_id}", response_model=schemas.Thread)
def create_or_get_thread(listing_id: str, db_session: Session = Depends(db.get_db), current_user: schemas.User = Depends(get_current_user)):
    listing = db_session.query(db.Listing).filter(db.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself")
    thread = db_session.query(db.MessageThread).filter(db.MessageThread.listing_id == listing_id, db.MessageThread.buyer_id == current_user.id).first()
    if not thread:
        thread = db.MessageThread(listing_id=listing_id, buyer_id=current_user.id, seller_id=listing.owner_id)
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
    return thread

@app.websocket("/ws/{thread_id}")
async def websocket_endpoint(websocket: WebSocket, thread_id: str):
    await manager.connect(websocket, thread_id)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        manager.disconnect(websocket, thread_id)

@app.get("/threads", response_model=List[schemas.Thread])
def get_user_threads(db_session: Session = Depends(db.get_db), current_user: schemas.User = Depends(get_current_user)):
    threads = db_session.query(db.MessageThread).options(
        joinedload(db.MessageThread.listing).joinedload(db.Listing.owner),
        joinedload(db.MessageThread.buyer),
        joinedload(db.MessageThread.seller)
    ).filter(
        or_(db.MessageThread.buyer_id == current_user.id, db.MessageThread.seller_id == current_user.id)
    ).order_by(db.MessageThread.updated_at.desc()).all()

    for thread in threads:
        if thread.buyer_id == current_user.id:
            thread.seller.name = "Seller"
        else:
            thread.buyer.name = "Buyer"
            
    return threads

@app.get("/threads/{thread_id}/messages", response_model=List[schemas.Message])
def get_thread_messages(thread_id: str, db_session: Session = Depends(db.get_db), current_user: schemas.User = Depends(get_current_user)):
    thread = db_session.query(db.MessageThread).filter(db.MessageThread.id == thread_id).first()
    if not thread or (thread.buyer_id != current_user.id and thread.seller_id != current_user.id):
        raise HTTPException(status_code=404, detail="Thread not found")
    messages = db_session.query(db.Message).filter(db.Message.thread_id == thread_id).order_by(db.Message.created_at.asc()).all()
    return messages


@app.post("/threads/{thread_id}/messages", response_model=schemas.Message)
async def send_message(
    thread_id: str,
    message: schemas.MessageCreate,
    background_tasks: BackgroundTasks,
    db_session: Session = Depends(db.get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    thread = db_session.query(db.MessageThread).options(
        joinedload(db.MessageThread.listing),
        joinedload(db.MessageThread.buyer),
        joinedload(db.MessageThread.seller),
    ).filter(db.MessageThread.id == thread_id).first()

    if not thread or (thread.buyer_id != current_user.id and thread.seller_id != current_user.id):
        raise HTTPException(status_code=404, detail="Thread not found")

    new_message = db.Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        body=message.body
    )
    thread.updated_at = datetime.utcnow()
    db_session.add(new_message)
    db_session.commit()
    db_session.refresh(new_message)

    recipient = thread.seller if current_user.id == thread.buyer_id else thread.buyer
    sender_role = "a potential buyer" if current_user.id == thread.buyer_id else "the seller"

    template_data = {
        "recipient_name": recipient.name,
        "sender_role": sender_role,
        "listing_title": thread.listing.title,
    }

    message_email = MessageSchema(
        subject="You have a new message on BC Marketplace",
        recipients=[recipient.bc_email],
        template_body=template_data,
        subtype=MessageType.html,
    )

    background_tasks.add_task(
        fm.send_message,
        message_email,
        template_name="new_message.html"
    )

    response_data = schemas.Message.from_orm(new_message)
    await manager.broadcast(response_data.json(), thread_id)

    return new_message



@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user
