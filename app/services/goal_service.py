from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_database
from app.schemas.goal import GoalCreate, GoalUpdate

status_progress_mapping = {
    "blog":{
        "progress":{
            "Pending": 0,
            "Make Document":1,
            "Document Review": 2,
            "Make Final Draft":3,
            "Completed": 4,
        },
        "total":10
    },
    "video":{
        "progress":{
            "Pending": 0,
            "Make PPT": 1,
            "PPT Review": 2,
            "Format PPT(Sales)": 3,
            "Record Video": 4,
            "Video Review": 5,
            "Format Video(Sales)": 6,
            "Completed": 7
        },
        "total":28 
    }
}


def goal_helper(goal_doc) -> dict:
    return {
        "id": str(goal_doc["_id"]),
        "assignee_username": goal_doc.get("assignee_username"),
        "assignee": goal_doc.get("assignee"),
        "title": goal_doc.get("title"),
        "description": goal_doc.get("description"),
        "links": goal_doc.get("links",[]),
        "type": goal_doc.get("type"),
        "status": goal_doc.get("status"),
        "progress": goal_doc.get("progress", 0),
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
    if "status" in update_dict:
        status_value = status_progress_mapping[goal_data.type]["progress"].get(goal_data.status, 0)
        total_value = status_progress_mapping[goal_data.type]["total"]
        current_sum = (status_value * (status_value+1))//2
        progress = int((current_sum / total_value) * 100)
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