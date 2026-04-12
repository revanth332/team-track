# app/api/v1/auth.py
from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.config import settings
from app.core.token_manager import TokenManager
from app.services import user_service

router = APIRouter()
token_manager = TokenManager()

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    username = credentials.username
    passkey = credentials.passkey
    
    # 1. Admin Login Logic
    if username.lower() == "admin":
        if passkey != settings.ADMIN_PASSKEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect admin passkey"
            )
        role = "admin"
        
    # 2. Regular User Login Logic
    else:
        if passkey != settings.USER_PASSKEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect user passkey"
            )
            
        # Check if user exists in the DB (assuming 'username' is their email)
        user = await user_service.get_user_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in the system"
            )
            
        # Extract their role from the DB profile (fallback to 'member' if missing)
        role = user.get("role", "member")
        name = user.get("name", "Unknown User")
        
    # 3. Create the JWT Token payload
    token_payload = {
        "sub": username, # 'sub' is the standard JWT field for the user identity
        "role": role,
        "name":name
    }
    
    # Generate and return the token
    token = token_manager.get_jwt_token(data=token_payload)
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }