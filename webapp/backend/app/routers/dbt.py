from fastapi import APIRouter, HTTPException

from app.services.dbt_service import dbt_service
from app.models.pipeline import DbtRunRequest, JobStatus

router = APIRouter()


@router.post("/run", response_model=JobStatus)
async def run_dbt(request: DbtRunRequest):
    """Run a dbt command (run, test, compile, build)."""
    try:
        job = await dbt_service.run_dbt(
            command=request.command,
            select=request.select,
            full_refresh=request.full_refresh
        )
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of a dbt job."""
    job = dbt_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/models")
async def list_models():
    """List available dbt models."""
    return dbt_service.list_models()
