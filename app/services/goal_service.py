from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_database
from app.schemas.goal import GoalCreate, GoalUpdate

def goal_helper(goal_doc) -> dict:
    return {
        "id": str(goal_doc["_id"]),
        "username": goal_doc.get("username"),
        "assignee": goal_doc.get("assignee"),
        "title": goal_doc.get("title"),
        "description": goal_doc.get("description"),
        "links": goal_doc.get("links",[]),
        "type": goal_doc.get("type"),
        "status": goal_doc.get("status"),
        "progress": goal_doc.get("progress", 0),
        "timeline_value": goal_doc.get("timeline_value", {}),
        "idea_id": goal_doc.get("idea_id"),
        "year": goal_doc.get("year"),
        "quarter": goal_doc.get("quarter"),
        "created_at": goal_doc.get("created_at")
    }

async def create_goal(goal_data: GoalCreate):
    db = get_database()
    goal_dict = goal_data.model_dump()
    goal_dict["created_at"] = datetime.now(timezone.utc)

    result = await db.goals.insert_one(goal_dict)
    new_goal = await db.goals.find_one({"_id": result.inserted_id})
    return goal_helper(new_goal)

async def get_all_goals():
    db = get_database()
    goals =[]
    async for goal in db.goals.find().sort("created_at", -1):
        goals.append(goal_helper(goal))
    return goals

async def update_goal(goal_id: str, goal_data: GoalUpdate):
    db = get_database()
    if not ObjectId.is_valid(goal_id):
        return None
        
    update_dict = goal_data.model_dump(exclude_unset=True)
    
    # Calculate progress percentage based on timeline_value if provided
    if "timeline_value" in update_dict and update_dict["timeline_value"] and update_dict["type"]:
        tv = update_dict["timeline_value"]
        # Sum of current values / Sum of max possible values (3 for blog, 6 for video, 2 for poc)
        current_sum = 0
        max_sum = 3

        print(update_dict,"kjhgkjhgkjhgkjh",tv)
        if update_dict["type"] == "blog":
            current_sum = tv["blog"]
            max_sum = 3
        elif update_dict["type"] == "video":
            current_sum = tv["video"] + tv["poc"]
            max_sum = 8
        
        # Calculate percentage and round to 2 decimal places
        progress = int((current_sum / max_sum) * 100)
        update_dict["progress"] = progress

    if update_dict:
        await db.goals.update_one({"_id": ObjectId(goal_id)}, {"$set": update_dict})
    
    updated_goal = await db.goals.find_one({"_id": ObjectId(goal_id)})
    return goal_helper(updated_goal) if updated_goal else None

async def delete_goal(goal_id: str):
    db = get_database()
    if not ObjectId.is_valid(goal_id):
        return False
    result = await db.goals.delete_one({"_id": ObjectId(goal_id)})
    return result.deleted_count > 0