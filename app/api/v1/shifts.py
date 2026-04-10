from fastapi import APIRouter, HTTPException, status, Body, Query
from app.schemas.shift import ShiftUpdate, ShiftResponse
from app.services import shift_service,sheet_service
from app.schemas.sheet import GetSheetRequest, UpdateSheetRequest

# Prefix and tags are handled in router.py!
router = APIRouter() 

# @router.get("/", response_model=List[ShiftResponse])
@router.get("/")
async def list_shifts(request: GetSheetRequest = Query(...)):
    """
    Fetch shift changes. Optionally filter by a date range.
    """
    # Example Validation: Ensure start_date isn't after end_date
    # if start_date and end_date and start_date > end_date:
    #     raise HTTPException(
    #         status_code=400, 
    #         detail="start_date cannot be after end_date"
    #     )
        
    # return await shift_service.get_shifts(start_date, end_date)
    return await sheet_service.get_zoho_sheet_data(request)

@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def log_shift_change(shift: UpdateSheetRequest = Body(...)):
    """
    Log a new shift delay or change.
    """
    return await sheet_service.update_zoho_sheet(shift)

@router.put("/{shift_id}", response_model=ShiftResponse)
async def modify_shift_change(shift_id: str, shift: ShiftUpdate = Body(...)):
    """
    Update an existing shift log (e.g., if a mistake was made in entry).
    """
    updated_shift = await shift_service.update_shift(shift_id, shift)
    if not updated_shift:
        raise HTTPException(status_code=404, detail="Shift log not found")
    return updated_shift