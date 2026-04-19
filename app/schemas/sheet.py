# Pydantic model for request validation
from typing import Optional
from pydantic import BaseModel
from app.schemas.shift import ShiftBase


class CreateSheetRequest(BaseModel):
    header_row: Optional[int] = 1
    record: Optional[ShiftBase] = None

class UpdateSheetRequest(CreateSheetRequest):
    row_index: int = 0

class GetSheetRequest(BaseModel):
    header_row: Optional[int] = 1
    page: Optional[int] = 1
    per_page: Optional[int] = 100
    name: Optional[str] = None
    year: Optional[int] = None
    month: Optional[int] = None
    date: Optional[str] = None
    status: Optional[str] = None