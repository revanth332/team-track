import os
import time
import requests
from fastapi import FastAPI
from dotenv import load_dotenv
    # app/core/security.py
import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings

# Load environment variables from .env
load_dotenv()

app = FastAPI(title="Zoho Sheet Integration API")

# Configuration from environment
ZOHO_CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
ZOHO_REFRESH_TOKEN = os.getenv("ZOHO_REFRESH_TOKEN")
ZOHO_DOMAIN = os.getenv("ZOHO_DOMAIN", "com")

class TokenManager:
    """Manages Zoho OAuth Token generation and caching"""
    def __init__(self):
        self.access_token = None
        self.expires_at = 0

    def get_zoho_token(self) -> str:
        # Return cached token if it is still valid
        if time.time() < self.expires_at:
            return self.access_token
        
        # Otherwise, request a new access token
        url = f"https://accounts.zoho.{ZOHO_DOMAIN}/oauth/v2/token"
        payload = {
            "refresh_token": ZOHO_REFRESH_TOKEN,
            "client_id": ZOHO_CLIENT_ID,
            "client_secret": ZOHO_CLIENT_SECRET,
            "grant_type": "refresh_token"
        }
        
        response = requests.post(url, data=payload,verify=False)
        response_data = response.json()
        
        if "access_token" in response_data:
            self.access_token = response_data["access_token"]
            # Zoho tokens usually expire in 3600 seconds. 
            # We subtract 60 seconds as a safe buffer.
            self.expires_at = time.time() + response_data.get("expires_in", 3600) - 60
            return self.access_token
        else:
            raise Exception(f"Failed to refresh token: {response_data}")


    def get_jwt_token(self,data: dict):
        # Make a copy of the data so we don't modify the original
        to_encode = data.copy()
        
        # Calculate expiration time
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        
        # Generate the JWT token string
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

