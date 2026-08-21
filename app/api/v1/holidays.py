from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from app.api.dependencies import get_current_user
from app.schemas.holiday import HolidayCreate, HolidayResponse, HolidayUpdate
from app.services import holiday_service

router = APIRouter()


@router.get("", response_model=List[HolidayResponse])
async def list_holidays(
    year: Optional[int] = Query(default=None, description="Filter holidays by year"),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieves all configured holidays, optionally filtered by year.
    """
    return await holiday_service.get_all_holidays(year=year)


@router.post("", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
async def add_holiday(
    payload: HolidayCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Creates a new holiday record.
    """
    return await holiday_service.create_holiday(payload)


@router.get("/{holiday_id}", response_model=HolidayResponse)
async def get_holiday(
    holiday_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieves a single holiday by ID.
    """
    holiday = await holiday_service.get_holiday_by_id(holiday_id)
    if not holiday:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found",
        )
    return holiday


@router.put("/{holiday_id}", response_model=HolidayResponse)
async def update_holiday(
    holiday_id: str,
    payload: HolidayUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates an existing holiday record.
    """
    holiday = await holiday_service.update_holiday(holiday_id, payload)
    if not holiday:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found",
        )
    return holiday


@router.delete("/{holiday_id}", status_code=status.HTTP_200_OK)
async def delete_holiday(
    holiday_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Deletes a holiday record by ID.
    """
    success = await holiday_service.delete_holiday(holiday_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found",
        )
    return {"message": "Holiday deleted successfully", "id": holiday_id}
