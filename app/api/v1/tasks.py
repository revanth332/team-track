from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from typing import Optional

from app.api.dependencies import get_current_user
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskReview, TaskSubmission, TaskUpdate
from app.services import task_service


router = APIRouter()


def require_admin(current_user: dict):
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action",
        )


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a task for the current user to track completed work.
    """
    created_by = current_user.get("name") or current_user["username"]
    return await task_service.create_task(task, current_user["username"], created_by)


@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    username: Optional[str] = Query(None, description="Filter tasks by creator username"),
    status: Optional[str] = Query(None, description="Filter tasks by status"),
    tag: Optional[str] = Query(None, description="Filter tasks by tag"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch tasks. Non-admin users only see their own tasks.
    """
    if not current_user.get("is_admin"):
        username = current_user["username"]
    return await task_service.get_all_tasks(username, status, tag, page, per_page)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch a single task.
    """
    task = await task_service.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not current_user.get("is_admin") and task["username"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="You can only view your own tasks")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task: TaskUpdate = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Update a task.
    """
    existing_task = await task_service.get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not current_user.get("is_admin") and existing_task["username"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")

    updated_task = await task_service.update_task(task_id, task)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task


@router.post("/{task_id}/submit", response_model=TaskResponse)
async def submit_task(
    task_id: str,
    submission: TaskSubmission = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Submit proof of successful task completion.
    """
    updated_task, error = await task_service.submit_task(task_id, submission, current_user["username"])
    if error == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    if error == "forbidden":
        raise HTTPException(status_code=403, detail="You can only submit your own tasks")
    return updated_task


@router.post("/{task_id}/review", response_model=TaskResponse)
async def review_task(
    task_id: str,
    review: TaskReview = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Approve or reject a submitted task.
    """
    require_admin(current_user)
    updated_task = await task_service.review_task(task_id, review, current_user["username"])
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a task.
    """
    existing_task = await task_service.get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not current_user.get("is_admin") and existing_task["username"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="You can only delete your own tasks")

    success = await task_service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return None
