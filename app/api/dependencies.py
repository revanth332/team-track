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
        is_admin: str = payload.get("admin", False)
        name: str = payload.get("name")
        role: str = payload.get("role", "member")
        position: str = payload.get("position")
        lead_id: str = payload.get("lead_id")
        manager_id: str = payload.get("manager_id")
        
        if username is None:
            raise credentials_exception
            
        # Return a simple dictionary (or Pydantic model) with the user info
        return {
            "username": username,
            "name": name,
            "role": role,
            "position": position,
            "lead_id": lead_id,
            "manager_id": manager_id,
            "is_admin": is_admin,
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.PyJWTError:
        raise credentials_exception

# Optional helper specifically for admin-only routes
async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action. Admin only."
        )
    return current_user
