from typing import Any, Optional
from pydantic import BaseModel


class ColumnSchema(BaseModel):
    name: str
    type: str
    nullable: bool = True


class TableSchema(BaseModel):
    columns: list[ColumnSchema]
    primary_key: str


class SourceMetadata(BaseModel):
    source: str
    last_modified: str
    row_count: int


class SourceTable(BaseModel):
    schema_: TableSchema
    data: list[dict[str, Any]]
    metadata: SourceMetadata

    class Config:
        # Allow 'schema' field name in JSON
        populate_by_name = True

    @classmethod
    def from_json(cls, json_data: dict) -> "SourceTable":
        return cls(
            schema_=TableSchema(**json_data["schema"]),
            data=json_data["data"],
            metadata=SourceMetadata(**json_data["metadata"])
        )

    def to_json(self) -> dict:
        return {
            "schema": self.schema_.model_dump(),
            "data": self.data,
            "metadata": self.metadata.model_dump()
        }


class SourceTableInfo(BaseModel):
    name: str
    row_count: int
    column_count: int
    last_modified: str
    primary_key: str


class AddColumnRequest(BaseModel):
    name: str
    type: str
    nullable: bool = True
    default_value: Any = None


class UpdateRowRequest(BaseModel):
    updates: dict[str, Any]


class AddRowRequest(BaseModel):
    data: dict[str, Any]
