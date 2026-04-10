# Pydantic model for request validation
from typing import Optional
from pydantic import BaseModel
from app.schemas.shift import ShiftBase


class UpdateSheetRequest(BaseModel):
    header_row: Optional[int] = 1
    record: ShiftBase

class GetSheetRequest(BaseModel):
    header_row: Optional[int] = 1
    page: Optional[int] = 1
    per_page: Optional[int] = 100