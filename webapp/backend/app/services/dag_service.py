import json
import re
from pathlib import Path
from typing import Optional

import duckdb

from app.config import DBT_PROJECT_PATH, DATABASE_PATH
from app.models.dag import DagNode, DagEdge, Dag, SelectorResult, ModelPreview


class DagService:
    def __init__(self):
        self.manifest_path = DBT_PROJECT_PATH / "target" / "manifest.json"
        self._manifest_cache = None
        self._manifest_mtime = None

    def _load_manifest(self) -> dict:
        """Load and cache manifest.json."""
        if not self.manifest_path.exists():
            raise FileNotFoundError(
                f"manifest.json not found at {self.manifest_path}. "
                "Run 'dbt parse' or 'dbt compile' first."
            )

        mtime = self.manifest_path.stat().st_mtime
        if self._manifest_cache is None or self._manifest_mtime != mtime:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                self._manifest_cache = json.load(f)
            self._manifest_mtime = mtime

        return self._manifest_cache

    def _determine_layer(self, node_data: dict) -> str:
        """Determine which layer a node belongs to based on path/name."""
        resource_type = node_data.get("resource_type", "")

        if resource_type == "source":
            return "source"
        if resource_type == "seed":
            return "seed"

        fqn = node_data.get("fqn", [])
        path = node_data.get("path", "")
        name = node_data.get("name", "")

        # Check path or fqn for layer indicators
        path_lower = path.lower()
        fqn_str = "/".join(fqn).lower()

        if "raw" in path_lower or "raw" in fqn_str or name.startswith("raw_"):
            return "raw"
        if "staging" in path_lower or "staging" in fqn_str or name.startswith("stg_"):
            return "staging"
        if "intermediate" in path_lower or "intermediate" in fqn_str or name.startswith("int_"):
            return "intermediate"
        if "marts" in path_lower or "marts" in fqn_str:
            if name.startswith("dim_"):
                return "marts_dim"
            if name.startswith("fct_"):
                return "marts_fact"
            return "marts"

        return "unknown"

    def get_dag(self) -> Dag:
        """Build DAG from manifest.json."""
        manifest = self._load_manifest()
        nodes_data = manifest.get("nodes", {})
        sources_data = manifest.get("sources", {})

        nodes = []
        edges = []
        node_ids = set()

        # Process sources
        for source_id, source in sources_data.items():
            node = DagNode(
                id=source_id,
                unique_id=source_id,
                name=f"{source.get('source_name', '')}.{source.get('name', '')}",
                resource_type="source",
                package_name=source.get("package_name", ""),
                schema_name=source.get("schema", ""),
                database=source.get("database", ""),
                fqn=source.get("fqn", []),
                depends_on=[],
                dependents=[],
                layer="source",
                description=source.get("description", ""),
                columns=[
                    {"name": c.get("name"), "description": c.get("description", "")}
                    for c in source.get("columns", {}).values()
                ]
            )
            nodes.append(node)
            node_ids.add(source_id)

        # Process models, seeds, tests
        for node_id, node_data in nodes_data.items():
            resource_type = node_data.get("resource_type", "")
            if resource_type not in ["model", "seed"]:
                continue

            depends_on_nodes = node_data.get("depends_on", {}).get("nodes", [])
            materialized_val = node_data.get("config", {}).get("materialized", "")

            node = DagNode(
                id=node_id,
                unique_id=node_id,
                name=node_data.get("name", ""),
                resource_type=resource_type,
                package_name=node_data.get("package_name", ""),
                schema_name=node_data.get("schema", ""),
                database=node_data.get("database", ""),
                fqn=node_data.get("fqn", []),
                depends_on=depends_on_nodes,
                dependents=[],
                materialized=materialized_val,
                materialization=materialized_val,
                layer=self._determine_layer(node_data),
                description=node_data.get("description", ""),
                columns=[
                    {"name": c.get("name"), "description": c.get("description", "")}
                    for c in node_data.get("columns", {}).values()
                ]
            )
            nodes.append(node)
            node_ids.add(node_id)

            # Create edges
            for dep in depends_on_nodes:
                edges.append(DagEdge(source=dep, target=node_id))

        # Build reverse dependencies (dependents)
        dependents_map = {n.id: [] for n in nodes}
        for edge in edges:
            if edge.source in dependents_map:
                dependents_map[edge.source].append(edge.target)

        for node in nodes:
            node.dependents = dependents_map.get(node.id, [])

        return Dag(nodes=nodes, edges=edges)

    def get_selector_result(self, selector: str) -> SelectorResult:
        """Parse dbt selector syntax and return matching nodes."""
        dag = self.get_dag()
        node_map = {n.id: n for n in dag.nodes}
        name_to_id = {n.name: n.id for n in dag.nodes}

        # Also map short names (without prefix) to full ids
        for node in dag.nodes:
            if node.resource_type == "source":
                # source:schema.table format
                parts = node.name.split(".")
                if len(parts) == 2:
                    name_to_id[f"source:{parts[0]}.{parts[1]}"] = node.id

        selected = set()
        explanation_parts = []

        # Parse selector
        selector = selector.strip()

        # Handle source:schema.table syntax
        if selector.startswith("source:"):
            source_ref = selector[7:]
            if "+" in source_ref:
                # source:ref+
                base = source_ref.rstrip("+")
                full_id = name_to_id.get(f"source:{base}")
                if full_id:
                    selected.add(full_id)
                    selected.update(self._get_downstream(full_id, node_map))
                    explanation_parts.append(f"Source '{base}' and all downstream models")
            else:
                full_id = name_to_id.get(f"source:{source_ref}")
                if full_id:
                    selected.add(full_id)
                    explanation_parts.append(f"Source '{source_ref}' only")
        else:
            # Handle model selectors
            plus_prefix = selector.startswith("+")
            plus_suffix = selector.endswith("+")
            model_name = selector.strip("+")

            # Find the model
            model_id = name_to_id.get(model_name)
            if model_id:
                selected.add(model_id)

                if plus_prefix and plus_suffix:
                    # +model+ : upstream and downstream
                    selected.update(self._get_upstream(model_id, node_map))
                    selected.update(self._get_downstream(model_id, node_map))
                    explanation_parts.append(
                        f"Model '{model_name}', all upstream dependencies, "
                        "and all downstream dependents"
                    )
                elif plus_prefix:
                    # +model : upstream only
                    selected.update(self._get_upstream(model_id, node_map))
                    explanation_parts.append(
                        f"Model '{model_name}' and all upstream dependencies"
                    )
                elif plus_suffix:
                    # model+ : downstream only
                    selected.update(self._get_downstream(model_id, node_map))
                    explanation_parts.append(
                        f"Model '{model_name}' and all downstream dependents"
                    )
                else:
                    explanation_parts.append(f"Model '{model_name}' only")
            else:
                explanation_parts.append(f"Model '{model_name}' not found")

        return SelectorResult(
            selector=selector,
            selected_nodes=list(selected),
            explanation=" | ".join(explanation_parts) if explanation_parts else "No matches"
        )

    def _get_upstream(self, node_id: str, node_map: dict) -> set:
        """Get all upstream dependencies recursively."""
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
                for dep in node.depends_on:
                    if dep not in processed:
                        result.add(dep)
                        to_process.append(dep)

        return result

    def _get_downstream(self, node_id: str, node_map: dict) -> set:
        """Get all downstream dependents recursively."""
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

    def get_model_preview(self, model_name: str, limit: int = 10) -> ModelPreview:
        """Get model details and sample data."""
        dag = self.get_dag()
        node = None

        for n in dag.nodes:
            if n.name == model_name:
                node = n
                break

        if not node:
            raise ValueError(f"Model '{model_name}' not found")

        # Get sample data from DuckDB
        sample_data = []
        row_count = 0
        sql = None

        if node.resource_type in ["model", "seed"]:
            schema = node.schema_name or "main"
            try:
                conn = duckdb.connect(str(DATABASE_PATH), read_only=True)
                try:
                    # Get row count
                    count_result = conn.execute(
                        f'SELECT COUNT(*) FROM "{schema}"."{node.name}"'
                    ).fetchone()
                    row_count = count_result[0] if count_result else 0

                    # Get sample data
                    rows = conn.execute(
                        f'SELECT * FROM "{schema}"."{node.name}" LIMIT {limit}'
                    ).fetchall()
                    cols = conn.execute(
                        f"""SELECT column_name FROM information_schema.columns
                        WHERE table_schema = '{schema}' AND table_name = '{node.name}'
                        ORDER BY ordinal_position"""
                    ).fetchall()
                    col_names = [c[0] for c in cols]

                    for row in rows:
                        record = {}
                        for i, val in enumerate(row):
                            if hasattr(val, "isoformat"):
                                record[col_names[i]] = val.isoformat()
                            else:
                                record[col_names[i]] = val
                        sample_data.append(record)
                finally:
                    conn.close()
            except Exception:
                pass

        # Get SQL from manifest
        manifest = self._load_manifest()
        for node_id, node_data in manifest.get("nodes", {}).items():
            if node_data.get("name") == model_name:
                sql = node_data.get("raw_code", node_data.get("raw_sql", ""))
                break

        return ModelPreview(
            node=node,
            sample_data=sample_data,
            row_count=row_count,
            sql=sql
        )


dag_service = DagService()
