from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from app.api.dependencies import get_current_user
from app.schemas.leave import LeaveCreate, LeaveResponse
from app.services import leave_service, user_service

router = APIRouter()


def require_lead_or_higher(current_user: dict):
    position = (current_user.get("position") or "").lower()
    role = (current_user.get("role") or "").lower()
    if position not in ["lead", "manager", "superadmin"] and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leads, managers, or admins can manage leaves.",
        )


@router.post("", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
async def mark_member_leave(
    payload: LeaveCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a member as on leave for a specified date range. Lead/Manager/Admin only.
    """
    require_lead_or_higher(current_user)

    if payload.start_date > payload.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date cannot be after end date.",
        )

    # Verify user exists
    target_user = await user_service.get_user_by_username(payload.username.strip().lower())
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{payload.username}' not found.",
        )

    lead_id = current_user.get("username")
    return await leave_service.create_leave(payload, lead_id=lead_id)


@router.get("/active", response_model=List[LeaveResponse])
async def list_active_leaves(
    lead_id: Optional[str] = Query(default=None),
    date_str: Optional[str] = Query(default=None, alias="date"),
    current_user: dict = Depends(get_current_user),
):
    """
    List all active leaves for today (or specified date).
    """
    position = (current_user.get("position") or "").lower()
    filter_lead_id = lead_id
    if position == "lead" and not filter_lead_id:
        filter_lead_id = current_user.get("username")

    return await leave_service.get_active_leaves(lead_id=filter_lead_id, date_str=date_str)


@router.get("/user/{username}/active", response_model=Optional[LeaveResponse])
async def get_user_active_leave(
    username: str,
    date_str: Optional[str] = Query(default=None, alias="date"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get active leave for a specific user.
    """
    return await leave_service.get_active_leave_for_user(username, date_str=date_str)


@router.get("/user/{username}", response_model=List[LeaveResponse])
async def get_user_leaves(
    username: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get all leave history for a specific user.
    """
    return await leave_service.get_leaves_for_user(username)


@router.post("/{leave_id}/end-early", response_model=LeaveResponse)
async def end_leave_early(
    leave_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    End an active leave early. Lead/Manager/Admin only.
    """
    require_lead_or_higher(current_user)
    updated = await leave_service.end_leave_early(leave_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave not found or cannot be ended.",
        )
    return updated


@router.delete("/{leave_id}", status_code=status.HTTP_200_OK)
async def delete_leave_record(
    leave_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a leave record. Lead/Manager/Admin only.
    """
    require_lead_or_higher(current_user)
    success = await leave_service.delete_leave(leave_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave record not found.",
        )
    return {"message": "Leave deleted successfully", "id": leave_id}
