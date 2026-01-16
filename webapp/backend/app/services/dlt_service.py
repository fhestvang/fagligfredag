import asyncio
import subprocess
import uuid
from datetime import datetime
from typing import Optional

from app.config import DLT_PIPELINE_PATH, DLT_PIPELINE_SCRIPT, VENV_PYTHON, DUCKDB_PATH
from app.services.websocket_manager import ws_manager
from app.models.pipeline import JobStatus


class DltService:
    """Service for running dlt pipeline operations."""

    def __init__(self):
        self.active_jobs: dict[str, JobStatus] = {}
        self.processes: dict[str, subprocess.Popen] = {}

    async def run_pipeline(
        self,
        year: int = 2023,
        month: int = 1,
        taxi_type: str = "yellow",
        write_disposition: str = "replace",
        row_limit: Optional[int] = 10000
    ) -> JobStatus:
        """Run the dlt pipeline with specified parameters."""
        job_id = str(uuid.uuid4())[:8]

        job = JobStatus(
            job_id=job_id,
            job_type="dlt_load",
            status="queued",
            started_at=datetime.now(),
            message=f"Loading {taxi_type} taxi data for {year}-{month:02d}"
        )
        self.active_jobs[job_id] = job

        # Subscribe all current connections to this job
        for client_id in ws_manager.active_connections:
            ws_manager.subscribe_to_job(client_id, job_id)

        # Start the pipeline in background
        asyncio.create_task(self._execute_pipeline(
            job_id, year, month, taxi_type, write_disposition, row_limit
        ))

        return job

    async def _execute_pipeline(
        self,
        job_id: str,
        year: int,
        month: int,
        taxi_type: str,
        write_disposition: str,
        row_limit: Optional[int]
    ):
        """Execute the pipeline subprocess and stream output."""
        job = self.active_jobs[job_id]
        job.status = "running"

        await ws_manager.send_status(job_id, "running", job.started_at.isoformat())
        await ws_manager.send_log(
            f"Starting dlt pipeline: {taxi_type} taxi, {year}-{month:02d}, mode={write_disposition}",
            level="info",
            source="dlt",
            job_id=job_id
        )

        # Build the Python script to run
        script = f"""
import sys
sys.path.insert(0, r'{DLT_PIPELINE_PATH}')
from nyc_taxi_pipeline import nyc_taxi_source
import dlt

# Configure the pipeline
pipeline = dlt.pipeline(
    pipeline_name="nyc_taxi_pipeline",
    destination="duckdb",
    dataset_name="nyc_taxi_raw",
)

# Create the source
source = nyc_taxi_source(
    year={year},
    month={month},
    taxi_type="{taxi_type}",
    write_disposition="{write_disposition}"
)

# Run the pipeline
print("Starting data load...")
info = pipeline.run(source)
print(f"Load completed!")
print(f"Rows loaded: {{info.loads_ids}}")
print(info)
"""

        try:
            # Run the script
            env = {
                "DUCKDB_PATH": DUCKDB_PATH,
                "PYTHONUNBUFFERED": "1"
            }

            process = await asyncio.create_subprocess_exec(
                str(VENV_PYTHON), "-c", script,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(DLT_PIPELINE_PATH),
                env={**dict(__import__('os').environ), **env}
            )

            # Stream stdout
            async def read_stream(stream, level):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    text = line.decode().strip()
                    if text:
                        await ws_manager.send_log(text, level=level, source="dlt", job_id=job_id)

            await asyncio.gather(
                read_stream(process.stdout, "info"),
                read_stream(process.stderr, "error")
            )

            await process.wait()

            if process.returncode == 0:
                job.status = "completed"
                job.ended_at = datetime.now()
                await ws_manager.send_complete(
                    job_id, "dlt_load", True,
                    {"message": "Pipeline completed successfully"}
                )
            else:
                job.status = "failed"
                job.ended_at = datetime.now()
                job.message = f"Pipeline failed with exit code {process.returncode}"
                await ws_manager.send_complete(
                    job_id, "dlt_load", False,
                    {"message": job.message}
                )

        except Exception as e:
            job.status = "failed"
            job.ended_at = datetime.now()
            job.message = str(e)
            await ws_manager.send_log(f"Error: {e}", level="error", source="dlt", job_id=job_id)
            await ws_manager.send_complete(
                job_id, "dlt_load", False,
                {"message": str(e)}
            )

    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get the status of a job."""
        return self.active_jobs.get(job_id)

    def get_all_jobs(self) -> list[JobStatus]:
        """Get all jobs."""
        return list(self.active_jobs.values())

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job."""
        if job_id in self.processes:
            self.processes[job_id].terminate()
            if job_id in self.active_jobs:
                self.active_jobs[job_id].status = "cancelled"
                self.active_jobs[job_id].ended_at = datetime.now()
            return True
        return False


# Singleton instance
dlt_service = DltService()
