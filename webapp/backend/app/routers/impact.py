from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.impact_service import impact_service
from app.models.impact import ImpactAnalysis

router = APIRouter()


class AnalyzeRequest(BaseModel):
    table_name: str
    previous_schema: Optional[dict] = None
    previous_row_count: Optional[int] = None


@router.post("/analyze", response_model=ImpactAnalysis)
async def analyze_impact(request: AnalyzeRequest):
    """Analyze impact of changes to a source table."""
    try:
        # Convert previous row count to list length indicator
        prev_data = None
        if request.previous_row_count is not None:
            prev_data = [{}] * request.previous_row_count  # Dummy list for count comparison

        return impact_service.analyze_source_changes(
            table_name=request.table_name,
            previous_schema=request.previous_schema,
            previous_data=prev_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cache/{table_name}")
async def cache_state(table_name: str):
    """Cache the current state of a source table for later comparison."""
    try:
        state = impact_service.cache_current_state(table_name)
        return {"success": True, "cached_state": state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/{table_name}")
async def get_cached_state(table_name: str):
    """Get the cached state of a source table."""
    state = impact_service.get_cached_state(table_name)
    if state is None:
        raise HTTPException(status_code=404, detail=f"No cached state for '{table_name}'")
    return state
