from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_database
from app.schemas.idea import IdeaCreate, IdeaUpdate

def idea_helper(idea_doc) -> dict:
    return {
        "id": str(idea_doc["_id"]),
        "username": idea_doc.get("username"),
        "title": idea_doc.get("title"),
        "description": idea_doc.get("description"),
        "links": idea_doc.get("links",[]),
        "approved": idea_doc.get("approved"),
        "assigned_to": idea_doc.get("assigned_to"),
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
    return idea_helper(updated_idea) if updated_idea else None

async def delete_idea(idea_id: str):
    db = get_database()
    if not ObjectId.is_valid(idea_id):
        return False
        
    result = await db.ideas.delete_one({"_id": ObjectId(idea_id)})
    return result.deleted_count > 0