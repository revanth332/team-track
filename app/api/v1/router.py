from fastapi import APIRouter
from app.api.v1 import users

# Create the master router for version 1 of the API
api_router = APIRouter()

# Include sub-routers from different modules
# We define the prefixes here so they are managed centrally

api_router.include_router(
    users.router, 
    prefix="/users", 
    tags=["Users"]
)

# api_router.include_router(
#     goals.router, 
#     prefix="/goals", 
#     tags=["Quarterly Goals"]
# )

# api_router.include_router(
#     shifts.router, 
#     prefix="/shifts", 
#     tags=["Shift Delays & Changes"]
# )

# api_router.include_router(
#     updates.router, 
#     prefix="/updates", 
#     tags=["Weekly Status Updates"]
# )