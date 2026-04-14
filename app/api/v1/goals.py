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

@router.get("/", response_model=List[GoalResponse], dependencies=[Depends(get_current_user)])
async def list_all_goals(username:str = Query(None, description="Filter goals by submitter's username"),year: int = Query(None, description="Filter goals by year"),quarter:str = Query(None, description="Filter goals by quarter (e.g. Q1, Q2)")):
    """ Fetch all Quarterly Goals """
    return await goal_service.get_all_goals(username,year,quarter)

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