# app/api/dependencies.py
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

# This tells FastAPI to look for a Bearer token in the request headers
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Decodes the JWT token and returns the current user's data (username and role).
    """

    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token using your SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        name: str = payload.get("name")
        position: str = payload.get("position")
        lead_id: str = payload.get("lead_id")
        manager_id: str = payload.get("manager_id")
        
        if username is None:
            raise credentials_exception
            
        # Return a simple dictionary (or Pydantic model) with the user info
        return {
            "username": username,
            "name": name,
            "position": position,
            "lead_id": lead_id,
            "manager_id": manager_id,
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.PyJWTError:
        raise credentials_exception


def get_hierarchy_ids(current_user: dict, lead_id: str = None) -> dict:
    position = (current_user.get("position") or "").lower()
    username = current_user.get("username")
    requested_lead_id = lead_id.strip().lower() if lead_id else None

    if position == "manager":
        return {
            "lead_id": requested_lead_id,
            "manager_id": username,
        }

    if position == "lead":
        return {
            "lead_id": username,
            "manager_id": current_user.get("manager_id"),
        }

    return {
        "lead_id": current_user.get("lead_id"),
        "manager_id": current_user.get("manager_id"),
    }


def require_lead_user(current_user: dict) -> str:
    if (current_user.get("position") or "").lower() != "lead":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leads can perform this action",
        )
    return current_user["username"]

# Optional helper specifically for admin-only routes
async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action. Admin only."
        )
    return current_user
