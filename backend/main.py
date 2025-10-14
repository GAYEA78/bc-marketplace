import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
import google.auth.transport.requests
import requests

# Load environment variables
load_dotenv()

#FastAPI 
app = FastAPI()


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


SCOPES = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
]


@app.get("/")
def read_root():
    return {"message": "BC Marketplace Backend is running!"}

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
def auth_google_callback(code: str):
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


    # bc email enforcement
    if not user_email.endswith("@bc.edu"):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Email '{user_email}' is not a valid @bc.edu address."
        )

    # If it is a BC email, for today we just return a success message
    # In the future, we will create a user in the database and issue a JWT token here.
    return {
        "message": "Authentication successful!",
        "user_info": {
            "name": user_info.get("name"),
            "email": user_email,
            "picture": user_info.get("picture"),
        }
    }