# app/api/v1/auth.py
from fastapi import APIRouter, Body, HTTPException, status
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password
from app.core.token_manager import TokenManager
from app.schemas.user import UserRegister, UserResponse
from app.services import user_service

router = APIRouter()
token_manager = TokenManager()

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    username = credentials.username.strip().lower()
    password = credentials.password or credentials.passkey

    if not password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    user = await user_service.get_user_document_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    role = user.get("role", "member")
    name = user.get("name", "Unknown User")
    position = user.get("position")
    if position:
        position = position.lower()
    lead_id = user.get("lead_id")
    manager_id = user.get("manager_id")
    is_admin = role == "admin"
        
    token_payload = {
        "sub": username,
        "username": username,
        "role": role,
        "name":name,
        "position": position,
        "lead_id": lead_id,
        "manager_id": manager_id,
        "admin": is_admin
    }
    
    # Generate and return the token
    token = token_manager.get_jwt_token(data=token_payload)
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister = Body(...)):
    username = user.username.strip().lower()
    email = user.email.strip().lower()

    existing_user = await user_service.get_user_by_username(username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists."
        )

    existing_email = await user_service.get_user_by_email(email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    normalized_user = user.model_copy(update={"username": username, "email": email})
    return await user_service.register_user(normalized_user)
