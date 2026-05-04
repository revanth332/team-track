from typing import Optional

from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    passkey: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
