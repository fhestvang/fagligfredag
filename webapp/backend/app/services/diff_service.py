import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import uuid

import duckdb

from app.config import DATA_DIR, DATABASE_PATH
from app.models.diff import (
    Snapshot, TableSnapshot, DiffResult, TableDiff, ColumnDiff, RowDiff
)


class DiffService:
    def __init__(self):
        self.snapshots_dir = DATA_DIR / "snapshots"
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)

    def _get_snapshot_path(self, snapshot_id: str) -> Path:
        return self.snapshots_dir / f"{snapshot_id}.json"

    def _compute_checksum(self, data: list[dict]) -> str:
        """Compute MD5 checksum of data for quick comparison."""
        data_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()

    def take_snapshot(self, label: str = "") -> Snapshot:
        """Take a snapshot of all tables in the database."""
        snapshot_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
        timestamp = datetime.now().isoformat()

        tables = {}
        conn = duckdb.connect(str(DATABASE_PATH), read_only=True)

        try:
            # Get all schemas
            schemas = conn.execute(
                "SELECT DISTINCT table_schema FROM information_schema.tables "
                "WHERE table_schema NOT IN ('information_schema', 'pg_catalog')"
            ).fetchall()

            for (schema,) in schemas:
                # Get tables in schema
                table_rows = conn.execute(
                    f"SELECT table_name FROM information_schema.tables "
                    f"WHERE table_schema = '{schema}'"
                ).fetchall()

                for (table_name,) in table_rows:
                    full_name = f"{schema}.{table_name}"
                    try:
                        # Get columns
                        cols = conn.execute(f"""
                            SELECT column_name, data_type
                            FROM information_schema.columns
                            WHERE table_schema = '{schema}' AND table_name = '{table_name}'
                            ORDER BY ordinal_position
                        """).fetchall()

                        columns = [{"name": c[0], "type": c[1]} for c in cols]

                        # Get row count
                        count = conn.execute(
                            f'SELECT COUNT(*) FROM "{schema}"."{table_name}"'
                        ).fetchone()[0]

                        # Get sample data (first 100 rows for checksum)
                        rows = conn.execute(
                            f'SELECT * FROM "{schema}"."{table_name}" LIMIT 100'
                        ).fetchall()

                        col_names = [c["name"] for c in columns]
                        sample_data = []
                        for row in rows:
                            record = {}
                            for i, val in enumerate(row):
                                if hasattr(val, "isoformat"):
                                    record[col_names[i]] = val.isoformat()
                                else:
                                    record[col_names[i]] = val
                            sample_data.append(record)

                        checksum = self._compute_checksum(sample_data)

                        tables[full_name] = TableSnapshot(
                            schema_name=schema,
                            table_name=table_name,
                            row_count=count,
                            columns=columns,
                            checksum=checksum,
                            sample_data=sample_data[:10]  # Keep only 10 for storage
                        )
                    except Exception:
                        pass  # Skip tables we can't read

        finally:
            conn.close()

        snapshot = Snapshot(
            id=snapshot_id,
            timestamp=timestamp,
            label=label or f"Snapshot {snapshot_id}",
            tables=tables
        )

        # Save to file
        path = self._get_snapshot_path(snapshot_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snapshot.model_dump(), f, indent=2, default=str)

        return snapshot

    def list_snapshots(self) -> list[dict]:
        """List all available snapshots."""
        snapshots = []
        for path in sorted(self.snapshots_dir.glob("*.json"), reverse=True):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    snapshots.append({
                        "id": data["id"],
                        "timestamp": data["timestamp"],
                        "label": data["label"],
                        "table_count": len(data["tables"])
                    })
            except Exception:
                pass
        return snapshots

    def get_snapshot(self, snapshot_id: str) -> Snapshot:
        """Load a snapshot by ID."""
        path = self._get_snapshot_path(snapshot_id)
        if not path.exists():
            raise FileNotFoundError(f"Snapshot '{snapshot_id}' not found")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Convert dict to proper model
            tables = {}
            for key, table_data in data["tables"].items():
                tables[key] = TableSnapshot(**table_data)
            return Snapshot(
                id=data["id"],
                timestamp=data["timestamp"],
                label=data["label"],
                tables=tables
            )

    def delete_snapshot(self, snapshot_id: str) -> None:
        """Delete a snapshot."""
        path = self._get_snapshot_path(snapshot_id)
        if path.exists():
            path.unlink()

    def compare_snapshots(
        self,
        before_id: str,
        after_id: str
    ) -> DiffResult:
        """Compare two snapshots and return differences."""
        before = self.get_snapshot(before_id)
        after = self.get_snapshot(after_id)

        before_tables = set(before.tables.keys())
        after_tables = set(after.tables.keys())

        tables_added = list(after_tables - before_tables)
        tables_removed = list(before_tables - after_tables)

        table_diffs = []

        # Compare common tables
        for table_name in before_tables & after_tables:
            before_table = before.tables[table_name]
            after_table = after.tables[table_name]

            # Check schema changes
            before_cols = {c["name"]: c["type"] for c in before_table.columns}
            after_cols = {c["name"]: c["type"] for c in after_table.columns}

            schema_changes = []

            # Added columns
            for col in after_cols:
                if col not in before_cols:
                    schema_changes.append(ColumnDiff(
                        name=col,
                        change_type="added",
                        new_type=after_cols[col]
                    ))

            # Removed columns
            for col in before_cols:
                if col not in after_cols:
                    schema_changes.append(ColumnDiff(
                        name=col,
                        change_type="removed",
                        old_type=before_cols[col]
                    ))

            # Type changes
            for col in before_cols:
                if col in after_cols and before_cols[col] != after_cols[col]:
                    schema_changes.append(ColumnDiff(
                        name=col,
                        change_type="type_changed",
                        old_type=before_cols[col],
                        new_type=after_cols[col]
                    ))

            # Row count changes
            row_change = after_table.row_count - before_table.row_count
            rows_added = max(0, row_change)
            rows_removed = max(0, -row_change)

            # If checksums differ but counts are same, rows were modified
            rows_modified = 0
            if (before_table.checksum != after_table.checksum
                    and before_table.row_count == after_table.row_count):
                rows_modified = 1  # Indicate some modification occurred

            table_diffs.append(TableDiff(
                table_name=table_name,
                row_count_before=before_table.row_count,
                row_count_after=after_table.row_count,
                row_count_change=row_change,
                schema_changes=schema_changes,
                rows_added=rows_added,
                rows_removed=rows_removed,
                rows_modified=rows_modified
            ))

        return DiffResult(
            snapshot_before=before_id,
            snapshot_after=after_id,
            table_diffs=table_diffs,
            tables_added=tables_added,
            tables_removed=tables_removed
        )

    def compare_with_current(self, snapshot_id: str) -> DiffResult:
        """Compare a snapshot with current database state."""
        # Take temporary snapshot of current state
        current = self.take_snapshot(label="__current__")

        # Compare
        result = self.compare_snapshots(snapshot_id, current.id)

        # Delete temporary snapshot
        self.delete_snapshot(current.id)

        return result


diff_service = DiffService()
