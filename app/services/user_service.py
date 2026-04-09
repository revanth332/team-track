from bson import ObjectId
from app.core.database import get_database
from app.schemas.user import UserCreate, UserUpdate
from datetime import datetime

# Helper function to map MongoDB document to our Pydantic Response
def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "empid": user.get("empid"),
        "image": user.get("image"),
        "role": user.get("role"),
        "active_projects": user.get("active_projects",[]),
        
        # Pull the time strings from DB (Pydantic will auto-convert them back to time objects for the API response)
        "shift_start": user.get("shift_start"),
        "shift_end": user.get("shift_end"),
        
        "skills": user.get("skills",[]),
        "birthday": user.get("birthday")
    }

async def create_user(user_data: UserCreate):
    db = get_database()
    user_dict = user_data.model_dump()
    
    # 1. Convert birthday to datetime (BSON requirement)
    if user_dict.get("birthday"):
        user_dict["birthday"] = datetime.combine(user_dict["birthday"], datetime.min.time())

    # 2. Convert time objects to formatted strings ("HH:MM:SS") for MongoDB
    if user_dict.get("shift_start"):
        user_dict["shift_start"] = user_dict["shift_start"].isoformat()
    if user_dict.get("shift_end"):
        user_dict["shift_end"] = user_dict["shift_end"].isoformat()

    new_user = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": new_user.inserted_id})
    return user_helper(created_user)

async def get_all_users():
    db = get_database()
    users =[]
    async for user in db.users.find():
        users.append(user_helper(user))
    return users

async def get_user_by_email(email: str):
    db = get_database()
    user = await db.users.find_one({"email": email})
    if user:
        return user_helper(user)
    return None

async def update_user(user_id: str, data: UserUpdate):
    db = get_database()
    update_data = data.model_dump(exclude_unset=True)
    
    # Convert dates/times if they are included in the update request
    if "birthday" in update_data and update_data["birthday"]:
        update_data["birthday"] = datetime.combine(update_data["birthday"], datetime.min.time())
        
    if "shift_start" in update_data and update_data["shift_start"]:
        update_data["shift_start"] = update_data["shift_start"].isoformat()
        
    if "shift_end" in update_data and update_data["shift_end"]:
        update_data["shift_end"] = update_data["shift_end"].isoformat()

    if len(update_data) >= 1:
        updated_result = await db.users.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )
        if updated_result.modified_count == 1:
            return await get_user_by_id(user_id)
            
    return await get_user_by_id(user_id)