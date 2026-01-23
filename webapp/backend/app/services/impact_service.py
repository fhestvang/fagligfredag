from typing import Optional
from datetime import datetime

from app.services.source_service import source_service
from app.services.dag_service import dag_service
from app.models.impact import (
    ImpactAnalysis, SourceChange, AffectedModel, SuggestedCommand
)


class ImpactService:
    def __init__(self):
        self._previous_schemas = {}  # Cache for tracking schema changes

    def analyze_source_changes(
        self,
        table_name: str,
        previous_schema: Optional[dict] = None,
        previous_data: Optional[list] = None
    ) -> ImpactAnalysis:
        """Analyze impact of changes to a source table."""
        try:
            current_table = source_service.get_table(table_name)
        except FileNotFoundError:
            return ImpactAnalysis(
                source_table=table_name,
                has_changes=False,
                schema_changes=[],
                row_count_change=0,
                affected_models=[],
                suggested_commands=[],
                summary=f"Source table '{table_name}' not found"
            )

        # Handle both dict (new Parquet service) and Pydantic model (old JSON service)
        if isinstance(current_table, dict):
            current_schema = {
                col["name"]: col["type"] for col in current_table["schema"]["columns"]
            }
            current_data = current_table["data"]
            current_row_count = current_table.get("total_count", len(current_data))
        else:
            current_schema = {
                col.name: col.type for col in current_table.schema_.columns
            }
            current_data = current_table.data
            current_row_count = len(current_data)

        schema_change_descriptions = []
        row_count_change = 0

        # Compare schemas if we have previous state
        if previous_schema:
            # Detect added columns
            for col_name, col_type in current_schema.items():
                if col_name not in previous_schema:
                    schema_change_descriptions.append(
                        f"Column '{col_name}' ({col_type}) added"
                    )

            # Detect removed columns
            for col_name, col_type in previous_schema.items():
                if col_name not in current_schema:
                    schema_change_descriptions.append(
                        f"Column '{col_name}' removed"
                    )

            # Detect type changes
            for col_name in current_schema:
                if col_name in previous_schema:
                    if current_schema[col_name] != previous_schema[col_name]:
                        schema_change_descriptions.append(
                            f"Column '{col_name}' type: {previous_schema[col_name]} -> {current_schema[col_name]}"
                        )

        # Compare row counts if we have previous data
        if previous_data is not None:
            prev_count = len(previous_data)
            row_count_change = current_row_count - prev_count

        has_changes = len(schema_change_descriptions) > 0 or row_count_change != 0

        # Get affected models from DAG
        affected_models = self._get_affected_models(table_name, schema_change_descriptions, row_count_change)

        # Generate suggested commands
        suggested_commands = self._generate_commands(table_name, schema_change_descriptions, row_count_change, affected_models)

        # Generate summary
        summary = self._generate_summary(schema_change_descriptions, row_count_change, affected_models)

        return ImpactAnalysis(
            source_table=table_name,
            has_changes=has_changes,
            schema_changes=schema_change_descriptions,
            row_count_change=row_count_change,
            affected_models=affected_models,
            suggested_commands=suggested_commands,
            summary=summary
        )

    def _get_affected_models(
        self,
        table_name: str,
        schema_changes: list[str],
        row_count_change: int
    ) -> list[AffectedModel]:
        """Get all models affected by changes to source table."""
        affected = []

        try:
            dag = dag_service.get_dag()
        except FileNotFoundError:
            return affected

        # Find the source node
        source_node_id = None
        for node in dag.nodes:
            if node.resource_type == "source":
                # Match by table name in source name (e.g., "nyc_taxi_raw.trips")
                if table_name in node.name:
                    source_node_id = node.id
                    break

        if not source_node_id:
            # Try to find by looking at raw model
            for node in dag.nodes:
                if node.name == f"raw_{table_name}" or node.name == table_name:
                    source_node_id = node.id
                    break

        if not source_node_id:
            return affected

        # Get downstream models
        node_map = {n.id: n for n in dag.nodes}
        downstream = self._get_all_downstream(source_node_id, node_map)

        # Determine impact severity based on changes
        has_schema_changes = len(schema_changes) > 0
        has_column_removed = any("removed" in c.lower() for c in schema_changes)

        for node_id in downstream:
            node = node_map.get(node_id)
            if not node or node.resource_type != "model":
                continue

            if has_column_removed:
                severity = "high"
                reason = "Uses columns that may have been removed from source"
            elif has_schema_changes:
                severity = "medium"
                reason = "Schema changes in upstream source"
            else:
                severity = "low"
                reason = "Data changes in upstream source"

            affected.append(AffectedModel(
                name=node.name,
                model_id=node.id,
                layer=node.layer,
                severity=severity,
                reason=reason
            ))

        return affected

    def _get_all_downstream(self, node_id: str, node_map: dict) -> set:
        """Get all downstream nodes recursively."""
        result = set()
        to_process = [node_id]
        processed = set()

        while to_process:
            current = to_process.pop()
            if current in processed:
                continue
            processed.add(current)

            node = node_map.get(current)
            if node:
                for dep in node.dependents:
                    if dep not in processed:
                        result.add(dep)
                        to_process.append(dep)

        return result

    def _generate_commands(
        self,
        table_name: str,
        schema_changes: list[str],
        row_count_change: int,
        affected_models: list[AffectedModel]
    ) -> list[SuggestedCommand]:
        """Generate suggested dbt commands based on changes."""
        commands = []

        if not schema_changes and row_count_change == 0:
            return commands

        has_schema_changes = len(schema_changes) > 0
        has_column_removed = any("removed" in c.lower() for c in schema_changes)

        # First: sync source to DuckDB
        commands.append(SuggestedCommand(
            command=f"# Sync source to DuckDB first (via webapp API or manual)",
            description="Sync the edited JSON source to DuckDB before running dbt",
            priority=0
        ))

        # Determine the first model name from affected models
        first_model = None
        for m in affected_models:
            if m.layer in ["raw", "staging"]:
                first_model = m.name
                break

        if not first_model and affected_models:
            first_model = affected_models[0].name

        if first_model:
            # Basic run command
            commands.append(SuggestedCommand(
                command=f"dbt run --select {first_model}+",
                description=f"Run {first_model} and all downstream models",
                priority=1
            ))

            # If schema changed, suggest full refresh
            if has_schema_changes:
                commands.append(SuggestedCommand(
                    command=f"dbt run --full-refresh --select {first_model}+",
                    description="Full refresh for schema changes (rebuilds incremental models)",
                    priority=2
                ))

            # Test command
            commands.append(SuggestedCommand(
                command=f"dbt test --select {first_model}+",
                description="Run tests on affected models",
                priority=3
            ))

        # If column removed, warn about potential failures
        if has_column_removed:
            commands.append(SuggestedCommand(
                command="# WARNING: Column removed - check model SQL for references",
                description="Models may fail if they reference the removed column",
                priority=0
            ))

        return sorted(commands, key=lambda c: c.priority)

    def _generate_summary(
        self,
        schema_changes: list[str],
        row_count_change: int,
        affected_models: list[AffectedModel]
    ) -> str:
        """Generate a human-readable summary."""
        if not schema_changes and row_count_change == 0:
            return "No changes detected in source data."

        parts = []

        if schema_changes:
            parts.append(f"{len(schema_changes)} schema change(s)")
        if row_count_change != 0:
            parts.append(f"{row_count_change:+d} rows")

        # Count affected models by severity
        high = [m for m in affected_models if m.severity == "high"]
        medium = [m for m in affected_models if m.severity == "medium"]

        if high:
            parts.append(f"{len(high)} model(s) may fail")
        if medium:
            parts.append(f"{len(medium)} model(s) will update")

        return " | ".join(parts) if parts else "Changes detected"

    def cache_current_state(self, table_name: str) -> dict:
        """Cache the current state of a source table for comparison."""
        try:
            table = source_service.get_table(table_name)
            # Handle both dict (new Parquet service) and Pydantic model (old JSON service)
            if isinstance(table, dict):
                schema = {col["name"]: col["type"] for col in table["schema"]["columns"]}
                row_count = table.get("total_count", len(table["data"]))
            else:
                schema = {col.name: col.type for col in table.schema_.columns}
                row_count = len(table.data)

            self._previous_schemas[table_name] = {
                "schema": schema,
                "row_count": row_count,
                "cached_at": datetime.now().isoformat()
            }
            return self._previous_schemas[table_name]
        except FileNotFoundError:
            return {}

    def get_cached_state(self, table_name: str) -> Optional[dict]:
        """Get cached state for a source table."""
        return self._previous_schemas.get(table_name)


impact_service = ImpactService()
