from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    passkey: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str