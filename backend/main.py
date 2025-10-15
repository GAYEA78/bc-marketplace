import os
from sqlalchemy.orm import Session
from fastapi import Depends
import database as db
from datetime import datetime
from datetime import timedelta
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
import google.auth.transport.requests
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List
from sqlalchemy.orm import joinedload
from sqlalchemy import or_ 
import schemas 
from typing import List, Optional

# Load environment variables
load_dotenv()

#FastAPI 
app = FastAPI()

db.Base.metadata.create_all(bind=db.engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google OAuth2 configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://127.0.0.1:8000/auth/google/callback" 

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SCOPES = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
]

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

    if not user_email.endswith("@bc.edu"):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Email '{user_email}' is not a valid @bc.edu address."
        )

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

    
    # Create the token
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user.id, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Redirect the user
    redirect_url = f"http://localhost:5173/auth/callback?token={encoded_jwt}"

    return RedirectResponse(redirect_url)

@app.post("/listings", response_model=schemas.Listing)
def create_listing(
    listing: schemas.ListingCreate, 
    db_session: Session = Depends(db.get_db), 
    current_user: schemas.User = Depends(get_current_user)
):
    new_listing = db.Listing(
        **listing.model_dump(), 
        owner_id=current_user.id
    )
    db_session.add(new_listing)
    db_session.commit()
    db_session.refresh(new_listing)
    return new_listing


@app.get("/listings", response_model=List[schemas.Listing])
def get_all_listings(
    db_session: Session = Depends(db.get_db),
    query: Optional[str] = None,
    category: Optional[str] = None
):
    listings_query = (
        db_session.query(db.Listing)
        .options(joinedload(db.Listing.owner))
    )
    if query:
        matching_categories = []
        for cat in db.ListingCategory:
            if cat.value.lower().startswith(query.lower()):
                matching_categories.append(cat)
        search_conditions = [db.Listing.title.ilike(f"%{query}%")]
        if matching_categories:
            search_conditions.append(db.Listing.category.in_(matching_categories))

        listings_query = listings_query.filter(or_(*search_conditions))
    if category:
        listings_query = listings_query.filter(db.Listing.category == category)

    listings = listings_query.order_by(db.Listing.created_at.desc()).all()

    return listings