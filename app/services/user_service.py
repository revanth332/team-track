from bson import ObjectId
from app.core.database import get_database
from app.core.security import hash_password
from app.schemas.user import (
    UserAssign,
    UserCreate,
    UserDeAssign,
    UserPositionAssign,
    UserRegister,
    UserUpdate,
)
from datetime import datetime

# Helper function to map MongoDB document to our Pydantic Response
def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "username": user.get("username"),
        "email": user.get("email"),
        "empid": user.get("empid", ""),
        "image": user.get("image"),
        "role": user.get("role", "member"),
        "lead_id": user.get("lead_id"),
        "manager_id": user.get("manager_id"),
        "position": user.get("position"),
        "active_projects": user.get("active_projects",[]),
        
        # Pull the time strings from DB (Pydantic will auto-convert them back to time objects for the API response)
        "shift_start": user.get("shift_start"),
        "shift_end": user.get("shift_end"),
        
        "skills": user.get("skills",[]),
        "birthday": user.get("birthday"),
        "bandwidth": user.get("bandwidth", {"percentage": 100, "hours": 0})
    }

async def create_user(user_data: UserCreate):
    db = get_database()
    user_dict = user_data.model_dump()
    if user_data.password:
        user_dict["password_hash"] = hash_password(user_data.password)
    user_dict.pop("password", None)
    
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

async def register_user(user_data: UserRegister):
    full_user_data = UserCreate(
        name=user_data.full_name,
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        position="employee"  # Explicit override from your original code
    )
    return await create_user(full_user_data)

async def get_all_users(lead_id: str = None, manager_id: str = None, position: str = None,name: str = None):
    db = get_database()
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    if manager_id:
        query["manager_id"] = manager_id
    if position:
        query["position"] = position
    if name:
        query["$or"] =[
            # "$options": "i" makes the search case-insensitive
            {"name": {"$regex": name, "$options": "i"}},
            {"username": {"$regex": name, "$options": "i"}}
        ]

    users =[]
    async for user in db.users.find(query):
        users.append(user_helper(user))
    return users

async def get_user_by_id(user_id: str):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        return user_helper(user)
    return None

async def get_user_by_username(username:str):
    db = get_database()
    user = await db.users.find_one({"username":username})
    if user:
        return user_helper(user)
    return None

async def get_user_document_by_username(username: str):
    db = get_database()
    return await db.users.find_one({"username": username})

async def assign_user(user_data: UserAssign):
    db = get_database()
    update_data = {
        "lead_id": user_data.lead_id,
        "manager_id": user_data.manager_id,
    }
    result = await db.users.update_one(
        {"username": user_data.username},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        return None

    updated_user = await db.users.find_one({"username": user_data.username})
    return user_helper(updated_user)

async def assign_user_position(user_data: UserPositionAssign):
    db = get_database()
    result = await db.users.update_one(
        {"username": user_data.username},
        {"$set": {"position": user_data.position}}
    )
    if result.matched_count == 0:
        return None

    updated_user = await db.users.find_one({"username": user_data.username})
    return user_helper(updated_user)

async def deassign_user(user_data: UserDeAssign, is_deassigning_lead: bool, is_deassigning_manager: bool):
    db = get_database()
    deassign_dict = {}
    if is_deassigning_lead:
        deassign_dict["lead_id"] = None
    if is_deassigning_manager:
        deassign_dict["manager_id"] = None
    result = await db.users.update_one(
        {"username": user_data.username},
        {"$set": deassign_dict}
    )
    if result.matched_count == 0:
        return None

    updated_user = await db.users.find_one({"username": user_data.username})
    return user_helper(updated_user)

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

async def delete_user(user_id: str):
    db = get_database()
    delete_result = await db.users.delete_one({"_id": ObjectId(user_id)})
    return delete_result.deleted_count == 1
