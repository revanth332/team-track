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
    is_admin = False
    
    # Check passkey against User and Admin secrets
    if passkey == settings.USER_PASSKEY:
        is_admin = False
    elif passkey == settings.ADMIN_PASSKEY:
        is_admin = True
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if user exists in the DB
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
        "sub": username,
        "role": role,
        "name":name,
        "admin": is_admin
    }
    
    # Generate and return the token
    token = token_manager.get_jwt_token(data=token_payload)
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }