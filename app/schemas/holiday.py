from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class HolidayBase(BaseModel):
    name: str = Field(..., example="Republic Day", description="Name of the holiday")
    date: str = Field(..., example="2026-01-26", description="Holiday date in YYYY-MM-DD format")
    description: Optional[str] = Field(default=None, example="National Holiday")


class HolidayCreate(HolidayBase):
    pass


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None


class HolidayResponse(HolidayBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True)
