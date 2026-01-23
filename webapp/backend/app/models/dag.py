from typing import Optional
from pydantic import BaseModel


class DagNode(BaseModel):
    id: str
    unique_id: str = ""  # Same as id, for frontend compatibility
    name: str
    resource_type: str  # model, source, seed, test
    package_name: str
    schema_name: Optional[str] = None
    database: Optional[str] = None
    fqn: list[str] = []
    depends_on: list[str] = []
    dependents: list[str] = []  # Reverse dependencies
    materialized: Optional[str] = None  # view, table, incremental
    materialization: Optional[str] = None  # Alias for materialized
    layer: str = "unknown"  # source, raw, staging, intermediate, marts
    description: Optional[str] = None
    columns: list[dict] = []

    def model_post_init(self, __context):
        # Ensure unique_id and materialization are set
        if not self.unique_id:
            self.unique_id = self.id
        if not self.materialization and self.materialized:
            self.materialization = self.materialized


class DagEdge(BaseModel):
    source: str
    target: str


class Dag(BaseModel):
    nodes: list[DagNode]
    edges: list[DagEdge]


class SelectorResult(BaseModel):
    selector: str
    selected_nodes: list[str]
    explanation: str


class ModelPreview(BaseModel):
    node: DagNode
    sample_data: list[dict]
    row_count: int
    sql: Optional[str] = None
