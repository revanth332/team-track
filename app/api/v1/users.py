from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List
from app.api.dependencies import get_current_user
from app.schemas.user import (
    UserAssign,
    UserCreate,
    UserDeAssign,
    UserPositionAssign,
    UserUpdate,
    UserResponse,
)
from app.services import user_service

router = APIRouter()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(user: UserCreate = Body(...)):
    """
    Create a new team member profile.
    """
    username = user.username.strip().lower()
    email = user.email.strip().lower()

    existing_user = await user_service.get_user_by_username(username)
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="A user with this username already exists."
        )

    existing_email = await user_service.get_user_by_email(email)
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    normalized_user = user.model_copy(update={"username": username, "email": email})
    return await user_service.create_user(normalized_user)

@router.get("/", response_model=List[UserResponse])
async def list_team_members(
    lead_id: str = None,
    manager_id: str = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch all team members for the directory.
    """
    position = (current_user.get("position") or "").lower()

    if position == "manager":
        normalized_lead_id = lead_id.strip().lower() if lead_id else None
        normalized_manager_id = manager_id.strip().lower() if manager_id else None
        if not normalized_lead_id and not normalized_manager_id:
            normalized_manager_id = current_user.get("username")
        return await user_service.get_all_users(
            lead_id=normalized_lead_id,
            manager_id=normalized_manager_id,
        )

    current_lead_id = current_user.get("lead_id")
    if not current_lead_id:
        return []
    return await user_service.get_all_users(lead_id=current_lead_id)

@router.get("/all", response_model=List[UserResponse])
async def list_team_members(
    position: str = None,
    name: str = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch all team members for the directory.
    """
    position_from_token = (current_user.get("position") or "").lower()

    if position_from_token != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can access the full user list."
        )
    return await user_service.get_all_users(position,name)

@router.post("/assign", response_model=UserResponse)
async def assign_user(
    assignment: UserAssign = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Assign a user to a lead and manager.
    """
    position = (current_user.get("position") or "").lower()
    username = assignment.username.strip().lower()
    lead_id = assignment.lead_id.strip().lower() if assignment.lead_id else None
    manager_id = assignment.manager_id.strip().lower() if assignment.manager_id else None

    if position not in {"manager", "lead"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and leads can assign users."
        )

    existing_user = await user_service.get_user_document_by_username(username)
    if not existing_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if position == "lead" and existing_user.get("lead_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already assigned to a lead."
        )

    normalized_assignment = assignment.model_copy(
        update={
            "username": username,
            "lead_id": lead_id,
            "manager_id": manager_id,
        }
    )
    updated_user = await user_service.assign_user(normalized_assignment)
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user

@router.post("/assign-position", response_model=UserResponse)
async def assign_user_position(
    assignment: UserPositionAssign = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Assign a position to a user. Only managers can assign positions.
    """
    current_position = (current_user.get("position") or "").lower()
    if current_position != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can assign positions."
        )

    normalized_assignment = assignment.model_copy(
        update={
            "username": assignment.username.strip().lower(),
            "position": assignment.position.strip().lower(),
        }
    )
    updated_user = await user_service.assign_user_position(normalized_assignment)
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user

@router.post("/deassign", response_model=UserResponse)
async def deassign_user(
    assignment: UserDeAssign = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Remove a user's lead and manager assignment.
    """
    current_position = (current_user.get("position") or "").lower()
    if current_position not in {"manager", "lead"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and leads can deassign users."
        )
    
    is_deassigning_lead = current_position == "lead"
    is_deassigning_manager = current_position == "manager"

    normalized_assignment = assignment.model_copy(
        update={"username": assignment.username.strip().lower()}
    )
    updated_user = await user_service.deassign_user(normalized_assignment,is_deassigning_lead,is_deassigning_manager)
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user

@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(get_current_user)])
async def update_member_profile(user_id: str, user_update: UserUpdate = Body(...)):
    """
    Update skills, projects, or shift timings.
    """
    updated_user = await user_service.update_user(user_id, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Member not found")
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user)])
async def delete_member(user_id: str):
    """
    Remove a member from the team.
    """
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return None
