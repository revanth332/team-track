from bson import ObjectId
from datetime import date, datetime, timezone
from app.core.database import get_database
from app.schemas.shift import ShiftCreate, ShiftUpdate

def shift_helper(shift) -> dict:
    return {
        "id": str(shift["#"]),
        "name": shift.get("Employee Name"),
        "empid": shift.get("Emp ID"),
        "date": shift.get("Date"),
        "actual_shift":shift.get("Hubble Timings"),
        "worked_shift": shift.get("Shift Timings"),
        "project": shift.get("Project Name"),
        "reason": shift.get("Reason"),
        "lead_approval": shift.get("Sandeep Lead Approval"),
        "lead_remarks": shift.get("Lead Remarks"),
        "hr_verication": shift.get("HR Verified Yes/No"),
        "manager_approval": shift.get("Vamsi Nadenlda Approval"),
        "manager_remarks": shift.get("Manager Comments if any"),
        "hr_lead_comments": shift.get("Lead/HR comments"),
    }

async def create_shift(shift_data: ShiftCreate):
    db = get_database()
    shift_dict = shift_data.model_dump()

    # 1. Convert Date to Datetime (MongoDB requirement)
    shift_dict["date_of_change"] = datetime.combine(shift_dict["date_of_change"], datetime.min.time())
    
    # 2. Convert Time to ISO Strings
    shift_dict["actual_shift_start"] = shift_dict["actual_shift_start"].isoformat()
    shift_dict["actual_shift_end"] = shift_dict["actual_shift_end"].isoformat()
    shift_dict["worked_shift_start"] = shift_dict["worked_shift_start"].isoformat()
    shift_dict["worked_shift_end"] = shift_dict["worked_shift_end"].isoformat()
    
    # 3. Auto-generate created_at timestamp
    shift_dict["created_at"] = datetime.now(timezone.utc)

    result = await db.shifts.insert_one(shift_dict)
    new_shift = await db.shifts.find_one({"_id": result.inserted_id})
    return shift_helper(new_shift)

async def update_shift(shift_id: str, data: ShiftUpdate):
    db = get_database()
    if not ObjectId.is_valid(shift_id):
        return None
        
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle Time/Date conversions if they are being updated
    if "date_of_change" in update_data and update_data["date_of_change"]:
        update_data["date_of_change"] = datetime.combine(update_data["date_of_change"], datetime.min.time())
        
    for time_field in["actual_shift_start", "actual_shift_end", "worked_shift_start", "worked_shift_end"]:
        if time_field in update_data and update_data[time_field]:
            update_data[time_field] = update_data[time_field].isoformat()

    if update_data:
        await db.shifts.update_one({"_id": ObjectId(shift_id)}, {"$set": update_data})
    
    updated_shift = await db.shifts.find_one({"_id": ObjectId(shift_id)})
    return shift_helper(updated_shift) if updated_shift else None

async def get_shifts(start_date: date = None, end_date: date = None):
    db = get_database()
    
    # Start with an empty query (which would return all shifts)
    query = {}
    
    # If the user provided dates, build the date filter
    if start_date or end_date:
        date_filter = {}
        
        if start_date:
            # Convert date to datetime at midnight (00:00:00) to match DB format
            date_filter["$gte"] = datetime.combine(start_date, datetime.min.time())
            
        if end_date:
            # Convert date to datetime at midnight (00:00:00) to match DB format
            date_filter["$lte"] = datetime.combine(end_date, datetime.min.time())
            
        query["date_of_change"] = date_filter

    # Fetch from MongoDB
    shifts =[]
    # Sort by date descending (newest first)
    async for shift in db.shifts.find(query).sort("date_of_change", -1):
        shifts.append(shift_helper(shift))
        
    return shifts