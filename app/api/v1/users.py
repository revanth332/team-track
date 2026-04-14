from fastapi import APIRouter, HTTPException, status, Body
from typing import List
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import user_service

router = APIRouter()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(user: UserCreate = Body(...)):
    """
    Create a new team member profile.
    """
    # Check if user already exists by email
    existing_user = await user_service.get_user_by_username(user.username)
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="A user with this username already exists."
        )
    
    return await user_service.create_user(user)

@router.get("/", response_model=List[UserResponse])
async def list_team_members():
    """
    Fetch all team members for the directory.
    """
    return await user_service.get_all_users()

# @router.get("/{user_id}", response_model=UserResponse)
# async def get_member_profile(user_id: str):
#     """
#     Get detailed profile of a specific member.
#     """
#     user = await user_service.get_user_by_id(user_id)
#     if not user:
#         raise HTTPException(status_code=404, detail="Member not found")
#     return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_member_profile(user_id: str, user_update: UserUpdate = Body(...)):
    """
    Update skills, projects, or shift timings.
    """
    updated_user = await user_service.update_user(user_id, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Member not found")
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(user_id: str):
    """
    Remove a member from the team.
    """
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return None