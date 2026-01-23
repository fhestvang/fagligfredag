from fastapi import APIRouter, HTTPException, Query

from app.services.dag_service import dag_service
from app.models.dag import Dag, SelectorResult, ModelPreview

router = APIRouter()


@router.get("/", response_model=Dag)
async def get_dag():
    """Get the full dbt DAG from manifest.json."""
    try:
        return dag_service.get_dag()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/select", response_model=SelectorResult)
async def get_selector_result(
    selector: str = Query(..., description="dbt selector (e.g., 'stg_trips+', '+fct_trips')")
):
    """Parse dbt selector and return matching nodes."""
    try:
        return dag_service.get_selector_result(selector)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/{model_name}", response_model=ModelPreview)
async def get_model_preview(
    model_name: str,
    limit: int = Query(10, ge=1, le=100)
):
    """Get model details and sample data."""
    try:
        return dag_service.get_model_preview(model_name, limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
