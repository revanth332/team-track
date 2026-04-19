from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional,Set
from datetime import datetime
from enum import Enum

class ContentType(str, Enum):
    BLOG = "blog"
    VIDEO = "video"

class IdeaBase(BaseModel):
    username: Optional[str] = Field(default=None, example="alice_johnson")
    title: str = Field(..., example="System Design Crash Course Video")
    description: str = Field(..., example="A 10-minute video explaining load balancers.")
    links: List[str] = Field(default=[], example=["https://example.com/reference"])
    status: Optional[str] = Field(default="pending", example="pending")
    blog_assignee: Optional[str] = Field(default=None, example="John Smith")
    video_assignee: Optional[str] = Field(default=None, example="Emily Davis")
    blog_assignee_username: Optional[str] = Field(default=None, example="john_smith")
    video_assignee_username: Optional[str] = Field(default=None, example="emily_davis")
    added_by: Optional[str] = Field(default=None, example="Alice Johnson")
    tags: List[ContentType] = Field(
        ..., 
        description="Must contain 'blog', 'video', or both.",
    )

class IdeaCreate(IdeaBase):
    pass

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    links: Optional[List[str]] = None
    status: Optional[str] = None
    blog_assignee: Optional[str] = None
    video_assignee: Optional[str] = None
    blog_assignee_username: Optional[str] = Field(default=None, example="john_smith")
    video_assignee_username: Optional[str] = Field(default=None, example="emily_davis")
    added_by: Optional[str] = None
    tags: Optional[List[ContentType]] = None


class IdeaResponse(IdeaBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)