from fastapi import APIRouter, HTTPException, Query

from app.services.diff_service import diff_service
from app.models.diff import Snapshot, DiffResult

router = APIRouter()


@router.post("/snapshot", response_model=Snapshot)
async def take_snapshot(label: str = Query("", description="Optional label for the snapshot")):
    """Take a snapshot of the current database state."""
    try:
        return diff_service.take_snapshot(label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/snapshots")
async def list_snapshots():
    """List all available snapshots."""
    return diff_service.list_snapshots()


@router.get("/snapshots/{snapshot_id}", response_model=Snapshot)
async def get_snapshot(snapshot_id: str):
    """Get a specific snapshot."""
    try:
        return diff_service.get_snapshot(snapshot_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(snapshot_id: str):
    """Delete a snapshot."""
    try:
        diff_service.delete_snapshot(snapshot_id)
        return {"success": True, "message": f"Snapshot '{snapshot_id}' deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=DiffResult)
async def compare_snapshots(
    before_id: str = Query(..., description="Snapshot ID to compare from"),
    after_id: str = Query(..., description="Snapshot ID to compare to")
):
    """Compare two snapshots."""
    try:
        return diff_service.compare_snapshots(before_id, after_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare-current", response_model=DiffResult)
async def compare_with_current(
    snapshot_id: str = Query(..., description="Snapshot ID to compare with current state")
):
    """Compare a snapshot with the current database state."""
    try:
        return diff_service.compare_with_current(snapshot_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
