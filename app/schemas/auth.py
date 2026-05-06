from typing import Optional

from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    passkey: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class PasswordUpdateRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)

class MessageResponse(BaseModel):
    message: str

class PasswordResetRequest(BaseModel):
    username: str = Field(..., min_length=3)
