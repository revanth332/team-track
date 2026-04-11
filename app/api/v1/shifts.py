from fastapi import APIRouter, status, Body, Query
from app.schemas.shift import ShiftResponse
from app.services import sheet_service
from app.schemas.sheet import GetSheetRequest, UpdateSheetRequest, CreateSheetRequest

# Prefix and tags are handled in router.py!
router = APIRouter() 

# @router.get("/", response_model=List[ShiftResponse])
@router.get("/")
async def list_shifts(request: GetSheetRequest = Query(...)):
    """
    Fetch shift changes. Optionally filter by a date range.
    """
    return await sheet_service.get_zoho_sheet_data(request)

@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def log_shift_change(shift: CreateSheetRequest = Body(...)):
    """
    Log a new shift delay or change.
    """
    return await sheet_service.add_row_zoho_sheet(shift)

@router.put("/", response_model=ShiftResponse)
async def update_shift_change(shift: UpdateSheetRequest = Body(...)):
    """
    Update an existing shift change.
    """
    return await sheet_service.update_row_zoho_sheet(shift)
