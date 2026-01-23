from typing import Any
from fastapi import APIRouter, HTTPException, Query

from app.services.source_service import source_service
from app.models.source import (
    SourceTableInfo, AddColumnRequest, UpdateRowRequest, AddRowRequest
)

router = APIRouter()


@router.get("/tables")
async def list_source_tables():
    """List all source Parquet tables."""
    return source_service.list_tables()


@router.get("/tables/{table_name}")
async def get_source_table(
    table_name: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get source Parquet table data with pagination."""
    try:
        return source_service.get_table(table_name, limit, offset)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tables/{table_name}")
async def save_source_table(table_name: str, table_data: dict):
    """Save entire source table (schema + data)."""
    try:
        source_service.save_table(table_name, table_data)
        return {"success": True, "message": f"Table '{table_name}' saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tables/{table_name}/rows")
async def add_row(table_name: str, request: AddRowRequest):
    """Add a new row to source table."""
    try:
        result = source_service.add_row(table_name, request.data)
        return result  # Service already returns {"success": True, "row": ...}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tables/{table_name}/rows/{pk_value}")
async def update_row(table_name: str, pk_value: str, request: UpdateRowRequest):
    """Update a row in source table."""
    try:
        # Try to convert pk_value to int if it looks like a number
        try:
            pk = int(pk_value)
        except ValueError:
            pk = pk_value

        result = source_service.update_row(table_name, pk, request.updates)
        return result  # Service already returns {"success": True, "row": ...}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tables/{table_name}/rows/{pk_value}")
async def delete_row(table_name: str, pk_value: str):
    """Delete a row from source table."""
    try:
        # Try to convert pk_value to int if it looks like a number
        try:
            pk = int(pk_value)
        except ValueError:
            pk = pk_value

        source_service.delete_row(table_name, pk)
        return {"success": True, "message": "Row deleted"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tables/{table_name}/columns")
async def add_column(table_name: str, request: AddColumnRequest):
    """Add a new column to source table."""
    try:
        source_service.add_column(
            table_name,
            request.name,
            request.type,
            request.nullable,
            request.default_value
        )
        return {"success": True, "message": f"Column '{request.name}' added"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tables/{table_name}/columns/{column_name}")
async def remove_column(table_name: str, column_name: str):
    """Remove a column from source table."""
    try:
        source_service.remove_column(table_name, column_name)
        return {"success": True, "message": f"Column '{column_name}' removed"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tables/{table_name}/sync")
async def sync_to_duckdb(table_name: str):
    """Sync source JSON to DuckDB."""
    try:
        result = source_service.sync_to_duckdb(table_name)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload")
async def reload_from_duckdb(
    table_name: str = Query("trips"),
    limit: int = Query(100, ge=1, le=10000)
):
    """Reload source Parquet from DuckDB (reset to original dlt data)."""
    try:
        result = source_service.reload_from_duckdb(table_name, limit)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_source_table(
    table_name: str = Query("trips"),
    source_table: str = Query("nyc_taxi_raw.trips"),
    limit: int = Query(100, ge=1, le=10000)
):
    """Create a new source Parquet file from DuckDB data."""
    try:
        result = source_service.create_from_duckdb(table_name, source_table, limit)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tables/{table_name}/path")
async def get_parquet_path(table_name: str):
    """Get the path to the Parquet file."""
    try:
        path = source_service.get_parquet_path(table_name)
        return {"path": path}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
