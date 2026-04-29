from fastapi import APIRouter
from app.api.v1 import ideas, shifts, updates, users, auth, goals, tasks

# Create the master router for version 1 of the API
api_router = APIRouter()

api_router.include_router(
    users.router, 
    prefix="/users", 
    tags=["Users"]
)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["Shift Delays"])
api_router.include_router(updates.router, prefix="/updates", tags=["Weekly Updates"])
api_router.include_router(ideas.router, prefix="/ideas", tags=["Ideas Backlog"])
api_router.include_router(goals.router, prefix="/goals", tags=["Quarterly Goals"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
