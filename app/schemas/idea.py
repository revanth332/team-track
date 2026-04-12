from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class IdeaBase(BaseModel):
    title: str = Field(..., example="System Design Crash Course Video")
    description: str = Field(..., example="A 10-minute video explaining load balancers.")
    links: List[str] = Field(default=[], example=["https://example.com/reference"])
    approved: Optional[bool] = Field(default=None, example=True)
    blog_assignee: Optional[str] = Field(default=None, example="John Smith")
    video_assignee: Optional[str] = Field(default=None, example="Emily Davis")

class IdeaCreate(IdeaBase):
    pass

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    links: Optional[List[str]] = None
    approved: Optional[bool] = None
    blog_assignee: Optional[str] = None
    video_assignee: Optional[str] = None

class IdeaResponse(IdeaBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)