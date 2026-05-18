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
from math import ceil

def normalize_active_projects(active_projects) -> list:
    if not isinstance(active_projects, list):
        return []

    normalized_projects = []
    for project in active_projects:
        if isinstance(project, str):
            title = project.strip()
            if title:
                normalized_projects.append({
                    "title": title,
                    "description": "",
                    "is_active": True,
                    "occupancy": 0,
                })
            continue

        if not isinstance(project, dict):
            continue

        title = project.get("title")
        description = project.get("description")
        is_active = project.get("is_active")
        occupancy = project.get("occupancy")

        if (
            not isinstance(title, str)
            or not isinstance(description, str)
            or not isinstance(is_active, bool)
            or not isinstance(occupancy, int)
            or isinstance(occupancy, bool)
        ):
            continue

        normalized_projects.append({
            "title": title,
            "description": description,
            "is_active": is_active,
            "occupancy": occupancy,
        })

    return normalized_projects

def calculate_bandwidth(active_projects) -> int:
    normalized_projects = normalize_active_projects(active_projects)
    total_occupancy = sum(project["occupancy"] for project in normalized_projects)
    return max(0, min(100, 100 - total_occupancy))

def normalize_optional_text(value):
    if not isinstance(value, str):
        return value
    value = value.strip()
    return value or None

# Helper function to map MongoDB document to our Pydantic Response
def user_helper(user) -> dict:
    active_projects = normalize_active_projects(user.get("active_projects"))
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
        "active_projects": active_projects,
        
        # Pull the time strings from DB (Pydantic will auto-convert them back to time objects for the API response)
        "shift_start": user.get("shift_start"),
        "shift_end": user.get("shift_end"),
        
        "skills": user.get("skills",[]),
        "birthday": user.get("birthday"),
        "bandwidth": calculate_bandwidth(active_projects)
    }

def user_detail_helper(user) -> dict:
    user_data = user_helper(user)
    if (user.get("position") or "").lower() == "lead":
        user_data["shift_sheet_name"] = user.get("shift_sheet_name")
    return user_data

def user_summary_helper(user) -> dict:
    return {
        "name": user.get("name"),
        "username": user.get("username"),
    }

def user_bandwidth_helper(user) -> dict:
    return {
        "name": user.get("name"),
        "username": user.get("username"),
        "bandwidth": calculate_bandwidth(user.get("active_projects")),
    }

async def create_user(user_data: UserCreate):
    db = get_database()
    user_dict = user_data.model_dump()
    if user_data.password:
        user_dict["password_hash"] = hash_password(user_data.password)
    user_dict.pop("password", None)
    user_dict["active_projects"] = normalize_active_projects(user_dict.get("active_projects"))
    user_dict["bandwidth"] = calculate_bandwidth(user_dict["active_projects"])
    
    # 1. Convert birthday to datetime (BSON requirement)
    if user_dict.get("birthday"):
        user_dict["birthday"] = datetime.combine(user_dict["birthday"], datetime.min.time())

    # 2. Convert time objects to formatted strings ("HH:MM:SS") for MongoDB
    if user_dict.get("shift_start"):
        user_dict["shift_start"] = user_dict["shift_start"].isoformat()
    if user_dict.get("shift_end"):
        user_dict["shift_end"] = user_dict["shift_end"].isoformat()
    if "shift_sheet_name" in user_dict:
        user_dict["shift_sheet_name"] = normalize_optional_text(user_dict.get("shift_sheet_name"))

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

def build_users_query(lead_id: str = None, manager_id: str = None, position: str = None, name: str = None):
    query = {"position": {"$ne": "superadmin"}}
    if lead_id:
        query["lead_id"] = lead_id
    if manager_id:
        query["manager_id"] = manager_id
    if position:
        normalized_position = position.strip().lower()
        if normalized_position == "superadmin":
            return None
        query["position"] = normalized_position
    if name:
        query["$or"] =[
            # "$options": "i" makes the search case-insensitive
            {"name": {"$regex": name, "$options": "i"}},
            {"username": {"$regex": name, "$options": "i"}}
        ]
    return query

async def get_all_users(lead_id: str = None, manager_id: str = None, position: str = None,name: str = None):
    db = get_database()
    query = build_users_query(
        lead_id=lead_id,
        manager_id=manager_id,
        position=position,
        name=name,
    )
    if query is None:
        return []
    users =[]
    async for user in db.users.find(query):
        users.append(user_helper(user))
    return users

async def get_users_bandwidth(lead_id: str = None, manager_id: str = None):
    db = get_database()
    query = build_users_query(lead_id=lead_id, manager_id=manager_id)
    if query is None:
        return []

    users = []
    async for user in db.users.find(query).sort("name", 1):
        users.append(user_bandwidth_helper(user))
    return users

async def get_unassigned_employees(position: str = None):
    db = get_database()
    query = {
        "position": position if position else "employee",
        "$and": [
            {"$or": [{"lead_id": {"$exists": False}}, {"lead_id": None}, {"lead_id": ""}]},
            {"$or": [{"manager_id": {"$exists": False}}, {"manager_id": None}, {"manager_id": ""}]},
        ],
    }
    users = []
    async for user in db.users.find(query).sort("name", 1):
        users.append(user_summary_helper(user))
    return users

async def get_paginated_users(
    lead_id: str = None,
    manager_id: str = None,
    position: str = None,
    name: str = None,
    page: int = 1,
    limit: int = 10,
):
    db = get_database()
    query = build_users_query(
        lead_id=lead_id,
        manager_id=manager_id,
        position=position,
        name=name,
    )
    if query is None:
        return {
            "users": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
        }

    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    users = []
    cursor = db.users.find(query).sort("name", 1).skip(skip).limit(limit)
    async for user in cursor:
        users.append(user_helper(user))

    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": ceil(total / limit) if total else 0,
    }

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

async def get_user_detail_by_username(username: str):
    db = get_database()
    user = await db.users.find_one({"username": username})
    if user:
        return user_detail_helper(user)
    return None

async def get_user_document_by_username(username: str):
    db = get_database()
    return await db.users.find_one({"username": username})

async def get_user_documents_by_usernames(usernames: list[str]):
    db = get_database()
    users = []
    async for user in db.users.find({"username": {"$in": usernames}}):
        users.append(user)
    return users

async def assign_user(user_data: UserAssign):
    db = get_database()
    update_data = {
        "lead_id": user_data.lead_id,
        "manager_id": user_data.manager_id,
    }
    result = await db.users.update_many(
        {"username": {"$in": user_data.usernames}},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        return []

    updated_users = []
    async for user in db.users.find({"username": {"$in": user_data.usernames}}):
        updated_users.append(user_helper(user))
    return updated_users

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

async def update_user_password(username: str, new_password: str):
    db = get_database()
    result = await db.users.update_one(
        {"username": username},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    return result.matched_count == 1

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

    if "active_projects" in update_data:
        update_data["active_projects"] = normalize_active_projects(update_data["active_projects"])
        update_data["bandwidth"] = calculate_bandwidth(update_data["active_projects"])
    if "shift_sheet_name" in update_data:
        update_data["shift_sheet_name"] = normalize_optional_text(update_data.get("shift_sheet_name"))

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
