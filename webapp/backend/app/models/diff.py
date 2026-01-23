from typing import Any, Optional
from pydantic import BaseModel


class TableSnapshot(BaseModel):
    schema_name: str
    table_name: str
    row_count: int
    columns: list[dict]  # [{"name": str, "type": str}]
    checksum: str
    sample_data: list[dict]


class Snapshot(BaseModel):
    id: str
    timestamp: str
    label: str
    tables: dict[str, TableSnapshot]  # key = "schema.table"


class ColumnDiff(BaseModel):
    name: str
    change_type: str  # "added", "removed", "type_changed"
    old_type: Optional[str] = None
    new_type: Optional[str] = None


class TableDiff(BaseModel):
    table_name: str
    row_count_before: int
    row_count_after: int
    row_count_change: int
    schema_changes: list[ColumnDiff]
    rows_added: int
    rows_removed: int
    rows_modified: int


class DiffResult(BaseModel):
    snapshot_before: str
    snapshot_after: str
    table_diffs: list[TableDiff]
    tables_added: list[str]
    tables_removed: list[str]


class RowDiff(BaseModel):
    pk_value: Any
    change_type: str  # "added", "removed", "modified"
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    changed_columns: list[str] = []
