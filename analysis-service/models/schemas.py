"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel
from typing import Any


class AnalyzeRequest(BaseModel):
    comments: list[dict[str, Any]]
    ai_threshold: int = 20
    post_url: str = "sample"


class JobRequest(BaseModel):
    analysis_id: str
    user_id: str
    post_url: str
    platform: str = "instagram"


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    ai: dict
