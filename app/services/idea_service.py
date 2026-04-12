from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_database
from app.schemas.idea import IdeaCreate, IdeaUpdate
from app.schemas.goal import GoalCreate
from app.services.goal_service import create_goal


def idea_helper(idea_doc) -> dict:
    return {
        "id": str(idea_doc["_id"]),
        "username": idea_doc.get("username"),
        "title": idea_doc.get("title"),
        "description": idea_doc.get("description"),
        "links": idea_doc.get("links",[]),
        "status": idea_doc.get("status"),
        "blog_assignee": idea_doc.get("blog_assignee"),
        "video_assignee": idea_doc.get("video_assignee"),
        "blog_assignee_username":idea_doc.get("blog_assignee_username"),
        "video_assignee_username": idea_doc.get("video_assignee_username"),
        "added_by": idea_doc.get("added_by"),
        "created_at": idea_doc.get("created_at")
    }

async def create_idea(idea_data: IdeaCreate):
    db = get_database()
    idea_dict = idea_data.model_dump()
    
    # Auto-generate timestamp
    idea_dict["created_at"] = datetime.now(timezone.utc)

    result = await db.ideas.insert_one(idea_dict)
    new_idea = await db.ideas.find_one({"_id": result.inserted_id})
    return idea_helper(new_idea)

async def get_all_ideas():
    db = get_database()
    ideas =[]
    # Sort by newest first
    async for idea in db.ideas.find().sort("created_at", -1):
        ideas.append(idea_helper(idea))
    return ideas

async def update_idea(idea_id: str, idea_data: IdeaUpdate):
    db = get_database()
    if not ObjectId.is_valid(idea_id):
        return None
        
    update_dict = idea_data.model_dump(exclude_unset=True)
    
    if update_dict:
        await db.ideas.update_one({"_id": ObjectId(idea_id)}, {"$set": update_dict})
    
    updated_idea = await db.ideas.find_one({"_id": ObjectId(idea_id)})
    
    if updated_idea and updated_idea.get("status") == "Approved" and (idea_data.blog_assignee or idea_data.video_assignee):
        
        # Check if a goal already exists for this idea to prevent duplicates
        existing_goal = await db.goals.find_one({"idea_id": idea_id})
        type = None
        assignee = None
        if idea_data.blog_assignee:
            type = "blog"
            assignee = idea_data.blog_assignee
            assignee_username = idea_data.blog_assignee_username
        elif idea_data.video_assignee:
            type = "video"
            assignee = idea_data.video_assignee
            assignee_username = idea_data.video_assignee_username

        if not existing_goal:
            # Convert simple idea links to the Goal link dictionary format
            idea_links = updated_idea.get("links", [])
            formatted_links =[{"name": "Idea Reference", "url": link} for link in idea_links]
            
            # Calculate current quarter & year dynamically
            current_month = datetime.now().month
            current_quarter = f"Q{(current_month - 1) // 3 + 1}"
            
            # Create the auto-generated Goal payload
            new_goal = GoalCreate(
                assignee=assignee,
                assignee_username=assignee,
                title=updated_idea.get("title"),
                description=updated_idea.get("description"),
                links=formatted_links,
                type=type, # Defaulting to blog, user can update later
                status="Pending",
                progress=0,
                idea_id=idea_id, # Linking them together!
                year=datetime.now().year,
                quarter=current_quarter
            )
            
            # Save the new goal
            await create_goal(new_goal)

    return idea_helper(updated_idea) if updated_idea else None

async def delete_idea(idea_id: str):
    db = get_database()
    if not ObjectId.is_valid(idea_id):
        return False
        
    result = await db.ideas.delete_one({"_id": ObjectId(idea_id)})
    return result.deleted_count > 0