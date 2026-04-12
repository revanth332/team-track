from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime

class LinkItem(BaseModel):
    name: str = Field(..., example="Figma Design")
    url: str = Field(..., example="https://figma.com/...")


class GoalBase(BaseModel):
    assignee: str = Field(..., example="Jane Doe")
    title: str = Field(..., example="System Design Crash Course")
    description: str = Field(...)
    links: List[LinkItem] =[]
    type: Literal["blog", "video", "poc"] = Field(..., example="video")
    status: Literal["Make Document","Document Review","Make Final Draft","Make PPT","PPT Review", "Format PPT(Sales)", "Completed", "Record Video", "Canceled", "Pending","Format Video(Sales)"] = "Pending"
    progress: float = Field(default=0, example=25.5) # Percentage or raw number
    idea_id: Optional[str] = None
    year: int = Field(..., example=2026)
    quarter: Literal["Q1", "Q2", "Q3", "Q4"] = Field(..., example="Q2")
    profile_image: Optional[str] = Field(None, example="https://example.com/profile.jpg")

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    assignee: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    links: Optional[List[LinkItem]] = None
    type: Optional[Literal["blog", "video"]] = None
    status: Optional[Literal["Make Document","Document Review","Make Final Draft","Make PPT","PPT Review", "Format PPT(Sales)", "Completed", "Record Video", "Canceled", "Pending","Format Video(Sales)"]] = None
    progress: Optional[float] = None
    year: Optional[int] = None
    quarter: Optional[Literal["Q1", "Q2", "Q3", "Q4"]] = None
    profile_image: Optional[str] = None

class GoalResponse(GoalBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)