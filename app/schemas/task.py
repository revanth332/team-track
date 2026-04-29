from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


TaskStatus = Literal["Pending", "Submitted", "Approved", "Rejected"]


class TaskBase(BaseModel):
    title: str = Field(..., example="Python Lists Challenge")
    problem_url: str = Field(..., example="https://www.hackerrank.com/challenges/python-lists")
    description: Optional[str] = Field(default=None, example="Complete all test cases for the challenge.")
    tags: List[str] = Field(default_factory=list, example=["python", "sql"])


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    problem_url: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class TaskSubmission(BaseModel):
    screenshot_url: str = Field(..., example="https://example.com/submissions/task-123.png")
    notes: Optional[str] = Field(default=None, example="All public test cases passed.")


class TaskReview(BaseModel):
    status: Literal["Approved", "Rejected"]
    review_comments: Optional[str] = Field(default=None, example="Verified successful test case completion.")


class TaskResponse(TaskBase):
    id: str
    username: str
    status: TaskStatus
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    screenshot_url: Optional[str] = None
    submission_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)
