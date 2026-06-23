from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NoteOut(BaseModel):
    id: str = Field(alias="_id")
    title: str
    transcript: str
    summary: str
    key_points: list[str]
    action_items: list[str]
    tags: list[str]
    duration_seconds: int
    word_count: int
    created_at: datetime
    status: str

    class Config:
        populate_by_name = True
