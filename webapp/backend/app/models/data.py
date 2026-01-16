from typing import Any, Optional
from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True


class TableInfo(BaseModel):
    name: str
    schema_name: str
    column_count: int
    row_count: Optional[int] = None
    table_type: str = "BASE TABLE"  # BASE TABLE or VIEW


class QueryResult(BaseModel):
    data: list[dict[str, Any]]
    columns: list[ColumnInfo]
    total_count: int
    page: int
    page_size: int


class UpdateRequest(BaseModel):
    schema_name: str
    table_name: str
    pk_column: str
    pk_value: Any
    updates: dict[str, Any]


class InsertRequest(BaseModel):
    schema_name: str
    table_name: str
    data: dict[str, Any]


class DeleteRequest(BaseModel):
    schema_name: str
    table_name: str
    pk_column: str
    pk_value: Any
