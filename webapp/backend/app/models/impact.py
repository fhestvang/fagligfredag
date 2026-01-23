from typing import Optional
from pydantic import BaseModel


class SourceChange(BaseModel):
    change_type: str  # "column_added", "column_removed", "column_type_changed", "rows_added", "rows_removed", "rows_modified"
    column_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: str


class AffectedModel(BaseModel):
    name: str
    model_id: str
    layer: str
    severity: str  # "high", "medium", "low"
    reason: str


class SuggestedCommand(BaseModel):
    command: str
    description: str
    priority: int  # 1 = highest


class ImpactAnalysis(BaseModel):
    source_table: str
    has_changes: bool
    schema_changes: list[str]  # Human-readable schema change descriptions
    row_count_change: int
    affected_models: list[AffectedModel]
    suggested_commands: list[SuggestedCommand]
    summary: str
