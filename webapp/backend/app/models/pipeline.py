from typing import Optional, Literal
from pydantic import BaseModel
from datetime import datetime


class PipelineRunRequest(BaseModel):
    year: int = 2023
    month: int = 1
    taxi_type: Literal["yellow", "green", "fhv", "fhvhv"] = "yellow"
    write_disposition: Literal["replace", "merge", "append"] = "replace"
    row_limit: Optional[int] = 10000


class DbtRunRequest(BaseModel):
    command: Literal["run", "test", "compile", "build"] = "run"
    select: Optional[str] = None
    full_refresh: bool = False


class JobStatus(BaseModel):
    job_id: str
    job_type: Literal["dlt_load", "dbt_run", "dbt_test", "dbt_build"]
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    message: Optional[str] = None
    result: Optional[dict] = None


class WebSocketMessage(BaseModel):
    type: Literal["log", "progress", "status", "complete", "error"]
    timestamp: datetime
    payload: dict
