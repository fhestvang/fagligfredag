from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.duckdb_service import db_service
from app.models.data import (
    TableInfo, ColumnInfo, QueryResult,
    UpdateRequest, InsertRequest, DeleteRequest
)

router = APIRouter()


@router.get("/schemas", response_model=list[str])
async def list_schemas():
    """List all database schemas."""
    try:
        return db_service.list_schemas()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tables/{schema}", response_model=list[TableInfo])
async def list_tables(schema: str):
    """List all tables in a schema."""
    try:
        return db_service.list_tables(schema)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema/{schema}/{table}", response_model=list[ColumnInfo])
async def get_table_schema(schema: str, table: str):
    """Get column information for a table."""
    try:
        return db_service.get_table_schema(schema, table)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/query", response_model=QueryResult)
async def query_table(
    schema: str = Query(..., description="Schema name"),
    table: str = Query(..., description="Table name"),
    limit: int = Query(100, ge=1, le=1000, description="Number of rows to return"),
    offset: int = Query(0, ge=0, description="Number of rows to skip"),
    order_by: Optional[str] = Query(None, description="Column to order by"),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Order direction"),
):
    """Query table data with pagination."""
    try:
        return db_service.query_table(
            schema=schema,
            table=table,
            limit=limit,
            offset=offset,
            order_by=order_by,
            order_dir=order_dir
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update")
async def update_record(request: UpdateRequest):
    """Update a single record."""
    try:
        print(f"Update request: schema={request.schema_name}, table={request.table_name}, pk_column={request.pk_column}, pk_value={request.pk_value}, updates={request.updates}")
        db_service.update_record(
            schema=request.schema_name,
            table=request.table_name,
            pk_column=request.pk_column,
            pk_value=request.pk_value,
            updates=request.updates
        )
        return {"success": True, "message": "Record updated successfully"}
    except Exception as e:
        import traceback
        print(f"Update error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insert")
async def insert_record(request: InsertRequest):
    """Insert a new record."""
    try:
        db_service.insert_record(
            schema=request.schema_name,
            table=request.table_name,
            data=request.data
        )
        return {"success": True, "message": "Record inserted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_record(request: DeleteRequest):
    """Delete a single record."""
    try:
        db_service.delete_record(
            schema=request.schema_name,
            table=request.table_name,
            pk_column=request.pk_column,
            pk_value=request.pk_value
        )
        return {"success": True, "message": "Record deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
