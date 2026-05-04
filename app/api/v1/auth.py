# app/api/v1/auth.py
from fastapi import APIRouter, Body, HTTPException, status
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password
from app.core.token_manager import TokenManager
from app.schemas.user import UserRegister
from app.services import user_service

router = APIRouter()
token_manager = TokenManager()


def create_token_response(user: dict) -> dict:
    username = user.get("username")
    position = user.get("position")
    if position:
        position = position.lower()

    token_payload = {
        "sub": username,
        "name": user.get("name", "Unknown User"),
        "position": position,
        "lead_id": user.get("lead_id"),
        "manager_id": user.get("manager_id"),
    }

    token = token_manager.get_jwt_token(data=token_payload)
    return {
        "access_token": token,
        "token_type": "bearer"
    }


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
    return create_token_response(user)

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister = Body(...)):
    username = user.username.strip().lower()

    existing_user = await user_service.get_user_by_username(username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists."
        )

    normalized_user = user.model_copy(update={"username": username})
    created_user = await user_service.register_user(normalized_user)
    return create_token_response(created_user)
