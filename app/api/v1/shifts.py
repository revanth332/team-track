from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from app.api.dependencies import get_current_user
from app.schemas.shift import ShiftResponse
from app.services import sheet_service
from app.schemas.sheet import GetSheetRequest, UpdateSheetRequest, CreateSheetRequest

# Prefix and tags are handled in router.py!
router = APIRouter() 

# @router.get("/", response_model=List[ShiftResponse])
@router.get("/")
async def list_shifts(
    request: GetSheetRequest = Depends(),
    lead_id: str = Query(None, description="Lead username for manager sheet selection"),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch shift changes. Optionally filter by a date range.
    """
    if not request.year or not request.month:
        raise HTTPException(status_code=400, detail="Year and month query parameters are required")
    return await sheet_service.get_zoho_sheet_data(request, current_user, lead_id)

@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def log_shift_change(
    shift: CreateSheetRequest = Body(...),
    lead_id: str = Query(None, description="Lead username for manager sheet selection"),
    current_user: dict = Depends(get_current_user),
):
    """
    Log a new shift delay or change.
    """
    return await sheet_service.add_row_zoho_sheet(shift, current_user, lead_id)
# @router.get("/",dependencies=[Depends(get_current_user)])
# async def list_shifts(request: GetSheetRequest = Query(...)):
#     """
#     Fetch shift changes. Optionally filter by a date range.
#     """
#     if not request.year or not request.month:
#         raise HTTPException(status_code=400, detail="Year and month query parameters are required")
#     return await sheet_service.get_zoho_sheet_data(request)

@router.put("/", response_model=ShiftResponse)
async def update_shift_change(
    shift: UpdateSheetRequest = Body(...),
    name: str = Query(..., description="Employee Name for verification"),
    date: str = Query(..., description="Date string for verification"),
    lead_id: str = Query(None, description="Lead username for manager sheet selection"),
    current_user: dict = Depends(get_current_user),
):
    """
    Update an existing shift change.
    """
    return await sheet_service.update_row_zoho_sheet(shift, name, date, current_user, lead_id)

@router.delete("/")
async def delete_shift_change(
    name: str = Query(..., description="Employee Name for verification"),
    date: str = Query(..., description="Date string for verification"),
    lead_id: str = Query(None, description="Lead username for manager sheet selection"),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an existing shift change.
    """
    return await sheet_service.delete_row_zoho_sheet(name, date, current_user, lead_id)
