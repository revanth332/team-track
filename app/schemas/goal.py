from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime

class LinkItem(BaseModel):
    name: str = Field(..., example="Figma Design")
    url: str = Field(..., example="https://figma.com/...")

class TimelineValue(BaseModel):
    blog: Optional[int] = Field(default=0, ge=0, le=3, description="0 to 3")
    video: Optional[int] = Field(default=0, ge=0, le=6, description="0 to 6")
    poc: Optional[int] = Field(default=0, ge=0, le=2, description="0 to 2")

class GoalBase(BaseModel):
    assignee: str = Field(..., example="Jane Doe")
    title: str = Field(..., example="System Design Crash Course")
    description: str = Field(...)
    links: List[LinkItem] =[]
    type: Literal["blog", "video", "poc"] = Field(..., example="video")
    status: Literal["In Progress", "In review", "completed", "On hold", "Canceled", "Pending"] = "Pending"
    progress: float = Field(default=0, example=25.5) # Percentage or raw number
    timeline_value: TimelineValue
    idea_id: Optional[str] = None
    year: int = Field(..., example=2026)
    quarter: Literal["Q1", "Q2", "Q3", "Q4"] = Field(..., example="Q2")

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    assignee: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    links: Optional[List[LinkItem]] = None
    type: Optional[Literal["blog", "video", "poc"]] = None
    status: Optional[Literal["In Progress", "In review", "completed", "On hold", "Canceled", "Pending"]] = None
    progress: Optional[float] = None
    timeline_value: Optional[TimelineValue] = None
    year: Optional[int] = None
    quarter: Optional[Literal["Q1", "Q2", "Q3", "Q4"]] = None

class GoalResponse(GoalBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)