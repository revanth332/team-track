from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime

class WeeklyUpdateBase(BaseModel):
    name: str = Field(..., example="Jane Doe")
    role: str = Field(..., example="Frontend Engineer")
    project_info: dict = Field(..., example={"project_name": "Project Alpha","client":"Client Beta", "task_description": "Worked on UI components"})
    # We use week_start_date (e.g., the Monday of that week) to easily group everyone's updates together
    week_start_date: date = Field(..., example="2026-04-06")
    username: str = Field(..., example="jane_doe")

class WeeklyUpdateCreate(WeeklyUpdateBase):
    pass

class WeeklyUpdateModify(BaseModel):
    name: Optional[str] = None
    empid: Optional[str] = None
    week_start_date: Optional[date] = None
    project_info: Optional[dict] = None


class WeeklyUpdateResponse(WeeklyUpdateBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)