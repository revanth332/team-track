from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from typing import List, Optional
from datetime import date
from app.schemas.update import WeeklyUpdateCreate, WeeklyUpdateModify, WeeklyUpdateResponse
from app.services import update_service
from app.api.dependencies import get_current_user

router = APIRouter() 

@router.post("/", response_model=WeeklyUpdateResponse, status_code=status.HTTP_201_CREATED)
async def submit_weekly_update(
    update_data: WeeklyUpdateCreate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a new weekly status update.
    """
    return await update_service.create_weekly_update(update_data)

@router.get("/", response_model=List[WeeklyUpdateResponse])
async def list_weekly_updates(
    week_end_date: Optional[date] = Query(None, description="Filter by the Monday of the week (YYYY-MM-DD)"),
    name: Optional[str] = Query(None, description="Filter updates by team member's name"),
    lead_id: Optional[str] = Query(None, description="Filter updates by lead username"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch all updates, optionally filtered by a specific week.
    """
    position = (current_user.get("position") or "").lower()
    manager_id = None
    if position == "manager":
        lead_id = lead_id.strip().lower() if lead_id else None
        manager_id = current_user.get("username") or None
    else:
        lead_id = current_user.get("username") if position == "lead" else current_user.get("lead_id")
        if not lead_id:
            return []
    return await update_service.get_weekly_updates(
        week_end_date,
        name,
        lead_id=lead_id,
        manager_id=manager_id,
    )

@router.put("/{update_id}", response_model=WeeklyUpdateResponse)
async def edit_weekly_update(
    update_id: str,
    update_data: WeeklyUpdateModify = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Edit a previously submitted update (e.g., to fix a typo).
    """
    updated_doc = await update_service.modify_weekly_update(update_id, update_data)
    if not updated_doc:
        raise HTTPException(status_code=404, detail="Update not found")
    return updated_doc

@router.post("/{update_id}/seen", response_model=WeeklyUpdateResponse)
async def mark_update_as_seen(
    update_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a weekly update as seen by the lead.
    """
    updated_doc = await update_service.mark_update_as_seen(update_id)
    if not updated_doc:
        raise HTTPException(status_code=404, detail="Update not found")
    return updated_doc

@router.delete("/{update_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user)])
async def delete_weekly_update(update_id: str):
    """
    Delete a weekly update (e.g., if it was submitted in error).
    """
    success = await update_service.delete_weekly_update(update_id)
    if not success:
        raise HTTPException(status_code=404, detail="Update not found")
    return None
