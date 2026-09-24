import os
import time
import asyncio
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from app.core.config import settings
from app.core.http_client import get_http_client
from app.services.metrics_service import METRIC_ZOHO_TOKEN_CALLS, increment_daily_metric_safe

# Load environment variables from .env
load_dotenv()

def _env(name: str, default: str = None) -> str:
    value = os.getenv(name, default)
    return value.strip() if isinstance(value, str) else value


# Configuration from environment
ZOHO_CLIENT_ID = _env("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = _env("ZOHO_CLIENT_SECRET")
ZOHO_REFRESH_TOKEN = _env("ZOHO_REFRESH_TOKEN")
ZOHO_DOMAIN = _env("ZOHO_DOMAIN", "com")


class ZohoTokenError(Exception):
    """Raised when Zoho access token generation fails."""


def _validate_zoho_config():
    missing = [
        name
        for name, value in {
            "ZOHO_CLIENT_ID": ZOHO_CLIENT_ID,
            "ZOHO_CLIENT_SECRET": ZOHO_CLIENT_SECRET,
            "ZOHO_REFRESH_TOKEN": ZOHO_REFRESH_TOKEN,
            "ZOHO_DOMAIN": ZOHO_DOMAIN,
        }.items()
        if not value
    ]
    if missing:
        raise ZohoTokenError(f"Missing Zoho OAuth configuration: {', '.join(missing)}")


def _zoho_token_error_message(response_data: dict) -> str:
    error = response_data.get("error", "unknown_error")
    description = response_data.get("error_description")
    if error == "invalid_code":
        return (
            "Zoho rejected ZOHO_REFRESH_TOKEN as invalid or revoked. "
            "Generate a new refresh token for the same client_id/client_secret and Zoho "
            f"data center (accounts.zoho.{ZOHO_DOMAIN})."
        )
    if description:
        return f"Zoho token refresh failed ({error}): {description}"
    return f"Zoho token refresh failed ({error})"

class TokenManager:
    """Manages Zoho OAuth Token generation and caching"""
    def __init__(self):
        self.access_token = None
        self.expires_at = 0
        self._lock = None

    async def get_zoho_token(self) -> str:
        # Return cached token if it is still valid
        if self.access_token and time.time() < self.expires_at:
            return self.access_token
        
        if self._lock is None:
            self._lock = asyncio.Lock()
            
        async with self._lock:
            # Re-check inside lock
            if self.access_token and time.time() < self.expires_at:
                return self.access_token
            # Otherwise, request a new access token
            _validate_zoho_config()
            url = f"https://accounts.zoho.{ZOHO_DOMAIN}/oauth/v2/token"
            payload = {
                "refresh_token": ZOHO_REFRESH_TOKEN,
                "client_id": ZOHO_CLIENT_ID,
                "client_secret": ZOHO_CLIENT_SECRET,
                "grant_type": "refresh_token"
            }
            
            client = get_http_client()
            await increment_daily_metric_safe(
                METRIC_ZOHO_TOKEN_CALLS,
                metadata={"url": url},
            )
            response = await client.post(url, data=payload)
            response_data = {}
            try:
                response_data = response.json()
            except ValueError:
                pass
            
            if response.status_code != 200:
                if response_data:
                    raise ZohoTokenError(_zoho_token_error_message(response_data))
                raise ZohoTokenError(
                    f"Zoho token refresh failed, HTTP status {response.status_code}: {response.text}"
                )
            
            if "access_token" in response_data:
                self.access_token = response_data["access_token"]
                # Zoho tokens usually expire in 3600 seconds. 
                # We subtract 60 seconds as a safe buffer.
                self.expires_at = time.time() + response_data.get("expires_in", 3600) - 60
                return self.access_token
            else:
                raise ZohoTokenError(_zoho_token_error_message(response_data))


    def get_jwt_token(self,data: dict):
        # Make a copy of the data so we don't modify the original
        to_encode = data.copy()
        
        # Calculate expiration time
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        
        # Generate the JWT token string
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

token_manager = TokenManager()

