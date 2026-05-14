from fastapi import APIRouter, HTTPException, Query, status, Depends, Body
from typing import List
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.services import goal_service
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def add_new_goal(
    goal: GoalCreate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """ Manually create a Quarterly Goal """
    return await goal_service.create_goal(goal)

@router.get("/", response_model=List[GoalResponse])
async def list_all_goals(
    lead_id: str=Query(None),
    username: str = Query(None, description="Filter goals by submitter's username"),
    year: int = Query(None, description="Filter goals by year"),
    quarter: str = Query(None, description="Filter goals by quarter (e.g. Q1, Q2)"),
    type: str = Query(None, description="Filter goals by type"),
    current_user: dict = Depends(get_current_user),
):
    """ Fetch all Quarterly Goals """
    position = (current_user.get("position") or "").lower()
    manager_id = None
    if position == "manager":
        lead_id = lead_id.strip().lower() if lead_id else None
        manager_id = current_user.get("username") or None
    else:
        lead_id = current_user.get("username") if position == "lead" else current_user.get("lead_id")
        if not lead_id:
            return []
    return await goal_service.get_all_goals(username, year, quarter, type, lead_id, manager_id)

@router.put("/{goal_id}", response_model=GoalResponse)
async def modify_goal(
    goal_id: str, 
    goal: GoalUpdate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """ Update goal progress, status, or timeline """
    updated_goal = await goal_service.update_goal(goal_id, goal)
    if not updated_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated_goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user)])
async def remove_goal(goal_id: str):
    """ Delete a Goal """
    success = await goal_service.delete_goal(goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None
