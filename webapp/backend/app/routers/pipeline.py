from fastapi import APIRouter, HTTPException

from app.services.dlt_service import dlt_service
from app.models.pipeline import PipelineRunRequest, JobStatus

router = APIRouter()


@router.post("/run", response_model=JobStatus)
async def run_pipeline(request: PipelineRunRequest):
    """Start a dlt pipeline run."""
    try:
        job = await dlt_service.run_pipeline(
            year=request.year,
            month=request.month,
            taxi_type=request.taxi_type,
            write_disposition=request.write_disposition,
            row_limit=request.row_limit
        )
        return job
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of a pipeline job."""
    job = dlt_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs", response_model=list[JobStatus])
async def list_jobs():
    """List all pipeline jobs."""
    return dlt_service.get_all_jobs()


@router.post("/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running pipeline job."""
    if dlt_service.cancel_job(job_id):
        return {"success": True, "message": "Job cancelled"}
    raise HTTPException(status_code=404, detail="Job not found or already completed")
