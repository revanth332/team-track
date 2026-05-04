from fastapi import APIRouter, HTTPException, Query, status, Depends, Body
from app.schemas.idea import IdeaCreate, IdeaListResponse, IdeaUpdate, IdeaResponse
from app.services import idea_service
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def add_new_idea(
    idea: IdeaCreate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Add a new raw idea to the backlog.
    """
    return await idea_service.create_idea(idea)

@router.get("/", response_model=IdeaListResponse)
async def list_all_ideas(
    username: str = Query(None, description="Filter ideas by submitter's username"),
    lead_id: str = Query(None, description="Filter ideas by lead username"),
    manager_id: str = Query(None, description="Filter ideas by manager username"),
    title: str = Query(None, description="Filter ideas by title keyword"),
    status: str = Query(None, description="Filter ideas by status (Pending, Approved, Rejected)"),
    tag: str = Query(None, description="Filter ideas by tag"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch all ideas.
    """
    position = (current_user.get("position") or "").lower()
    if position == "manager":
        lead_id = lead_id.strip().lower() if lead_id else None
        manager_id = manager_id.strip().lower() if manager_id else None
    else:
        lead_id = current_user.get("lead_id")
        manager_id = None
        if not lead_id:
            return {
                "status": "success",
                "count": 0,
                "total": 0,
                "page": page,
                "per_page": per_page,
                "data": [],
            }
    return await idea_service.get_all_ideas(
        username,
        title,
        status,
        tag,
        page,
        per_page,
        manager_id=manager_id,
        lead_id=lead_id,
    )

@router.put("/{idea_id}", response_model=IdeaResponse)
async def modify_idea(
    idea_id: str,
    idea: IdeaUpdate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    existing_idea = await idea_service.get_idea_by_id(idea_id)

    if idea.status and idea.status not in ["Pending", "Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    if idea.blog_assignee and existing_idea["status"] != "Approved":
        raise HTTPException(status_code=400, detail="Idea must be approved before assigning")

    if idea.video_assignee and existing_idea["status"] != "Approved":
        raise HTTPException(status_code=400, detail="Idea must be approved before assigning")

    updated_idea = await idea_service.update_idea(idea_id, idea)

    if not updated_idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    return updated_idea

@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user)])
async def remove_idea(idea_id: str):
    """
    Delete an idea from the backlog.
    """
    success = await idea_service.delete_idea(idea_id)
    if not success:
        raise HTTPException(status_code=404, detail="Idea not found")
    return None
