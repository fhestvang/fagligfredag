import asyncio
import uuid
from datetime import datetime
from typing import Optional

from app.config import DBT_PROJECT_PATH, VENV_PYTHON
from app.services.websocket_manager import ws_manager
from app.models.pipeline import JobStatus


class DbtService:
    """Service for running dbt operations."""

    def __init__(self):
        self.active_jobs: dict[str, JobStatus] = {}

    async def run_dbt(
        self,
        command: str = "run",
        select: Optional[str] = None,
        full_refresh: bool = False
    ) -> JobStatus:
        """Run a dbt command."""
        job_id = str(uuid.uuid4())[:8]
        job_type = f"dbt_{command}"

        job = JobStatus(
            job_id=job_id,
            job_type=job_type,
            status="queued",
            started_at=datetime.now(),
            message=f"Running dbt {command}"
        )
        self.active_jobs[job_id] = job

        # Subscribe all current connections to this job
        for client_id in ws_manager.active_connections:
            ws_manager.subscribe_to_job(client_id, job_id)

        # Start the command in background
        asyncio.create_task(self._execute_dbt(job_id, command, select, full_refresh))

        return job

    async def _execute_dbt(
        self,
        job_id: str,
        command: str,
        select: Optional[str],
        full_refresh: bool
    ):
        """Execute dbt command and stream output."""
        job = self.active_jobs[job_id]
        job.status = "running"

        await ws_manager.send_status(job_id, "running", job.started_at.isoformat())
        await ws_manager.send_log(
            f"Starting dbt {command}",
            level="info",
            source="dbt",
            job_id=job_id
        )

        # Build command arguments
        args = [str(VENV_PYTHON), "-m", "dbt", command]

        if select:
            args.extend(["--select", select])

        if full_refresh and command in ["run", "build"]:
            args.append("--full-refresh")

        # Add project and profiles dir
        args.extend([
            "--project-dir", str(DBT_PROJECT_PATH),
            "--profiles-dir", str(DBT_PROJECT_PATH)
        ])

        try:
            process = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(DBT_PROJECT_PATH)
            )

            # Stream output
            async def read_stream(stream, level):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    text = line.decode().strip()
                    if text:
                        # Detect dbt log levels from output
                        actual_level = level
                        if "ERROR" in text:
                            actual_level = "error"
                        elif "WARN" in text:
                            actual_level = "warning"
                        await ws_manager.send_log(text, level=actual_level, source="dbt", job_id=job_id)

            await asyncio.gather(
                read_stream(process.stdout, "info"),
                read_stream(process.stderr, "error")
            )

            await process.wait()

            if process.returncode == 0:
                job.status = "completed"
                job.ended_at = datetime.now()
                await ws_manager.send_complete(
                    job_id, f"dbt_{command}", True,
                    {"message": f"dbt {command} completed successfully"}
                )
            else:
                job.status = "failed"
                job.ended_at = datetime.now()
                job.message = f"dbt {command} failed with exit code {process.returncode}"
                await ws_manager.send_complete(
                    job_id, f"dbt_{command}", False,
                    {"message": job.message}
                )

        except Exception as e:
            job.status = "failed"
            job.ended_at = datetime.now()
            job.message = str(e)
            await ws_manager.send_log(f"Error: {e}", level="error", source="dbt", job_id=job_id)
            await ws_manager.send_complete(
                job_id, f"dbt_{command}", False,
                {"message": str(e)}
            )

    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get the status of a job."""
        return self.active_jobs.get(job_id)

    def list_models(self) -> list[dict]:
        """List available dbt models (from dbt_project.yml structure)."""
        # Simple static list based on known models
        return [
            {"name": "raw_trips", "path": "raw/raw_trips", "materialization": "view"},
            {"name": "stg_trips", "path": "staging/stg_trips", "materialization": "view"},
            {"name": "fct_daily_trips", "path": "marts/fct_daily_trips", "materialization": "table"},
            {"name": "fct_location_stats", "path": "marts/fct_location_stats", "materialization": "table"},
        ]


# Singleton instance
dbt_service = DbtService()
