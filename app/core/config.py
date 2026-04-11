import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # --- Project Metadata ---
    PROJECT_NAME: str = "Team Management MVP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # --- MongoDB Settings ---
    # These will be overwritten by what's in your .env file
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "team-track"
    
    # --- Security & JWT (For later) ---
    ADMIN_PASSKEY: str = "admin_secret_123" # Default, override in .env
    USER_PASSKEY: str = "team_secret_123"
    
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_ME" 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # --- CORS Settings ---
    # Allow the frontend (e.g., localhost:3000) to talk to the backend
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000", # Next.js/React default
        "http://localhost:5173", # Vite default
    ]

    # Tells Pydantic to read from a .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore"
    )

# Instantiate the settings to be used across the app
settings = Settings()