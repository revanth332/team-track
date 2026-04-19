from http.client import HTTPException

from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_database
from app.schemas.update import WeeklyUpdateCreate, WeeklyUpdateModify

def update_helper(update_doc) -> dict:
    return {
        "id": str(update_doc["_id"]),
        "name": update_doc.get("name"),
        "role": update_doc.get("role"),
        "username": update_doc.get("username"),
        "week_end_date": update_doc.get("week_end_date"),
        "projects": update_doc.get("projects"),
        "occupancy":update_doc.get("occupancy"),
        "created_at": update_doc.get("created_at")
    }

async def create_weekly_update(data: WeeklyUpdateCreate):
    db = get_database()
    update_dict = data.model_dump()
    
    # 1. Convert Date to Datetime for MongoDB FIRST!
    if update_dict.get("week_end_date"):
        update_dict["week_end_date"] = datetime.combine(
            update_dict["week_end_date"], 
            datetime.min.time()
        )

    # 2. NOW you can safely query the database
    existing_update = await db.weekly_updates.find_one({
        "username": update_dict["username"],
        "week_end_date": update_dict["week_end_date"]
    })
    
    if existing_update:
        raise HTTPException(
            status_code=400, 
            detail="Weekly update already exists for this week"
        )
    
    # 3. Auto-generate created_at timestamp
    update_dict["created_at"] = datetime.now(timezone.utc)

    # 4. Insert and return
    result = await db.weekly_updates.insert_one(update_dict)
    new_update = await db.weekly_updates.find_one({"_id": result.inserted_id})
    return update_helper(new_update)

async def get_weekly_updates(week_end_date: str = None,name: str = None):
    db = get_database()
    query = {}
    
    # If the frontend requests a specific week, filter by it
    if week_end_date:
        # Convert string/date to datetime midnight
        parsed_date = datetime.combine(week_end_date, datetime.min.time())
        query["week_end_date"] = parsed_date
    if name:
        query["name"] = name

    updates =[]
    # Sort descending by created_at so newest updates are at the top
    async for doc in db.weekly_updates.find(query).sort("created_at", -1):
        updates.append(update_helper(doc))
        
    return updates

async def modify_weekly_update(update_id: str, data: WeeklyUpdateModify):
    db = get_database()
    if not ObjectId.is_valid(update_id):
        return None
        
    update_data = data.model_dump(exclude_unset=True)
    
    if "week_end_date" in update_data and update_data["week_end_date"]:
        update_data["week_end_date"] = datetime.combine(update_data["week_end_date"], datetime.min.time())

    if update_data:
        await db.weekly_updates.update_one({"_id": ObjectId(update_id)}, {"$set": update_data})
    
    updated_doc = await db.weekly_updates.find_one({"_id": ObjectId(update_id)})
    return update_helper(updated_doc) if updated_doc else None

async def delete_weekly_update(update_id: str):
    db = get_database()
    if not ObjectId.is_valid(update_id):
        return False
    
    result = await db.weekly_updates.delete_one({"_id": ObjectId(update_id)})
    return result.deleted_count > 0