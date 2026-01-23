"""
Source Service - Manages editable Parquet source files for demonstrating incremental loads.

The workflow:
1. Load sample data from NYC TLC or existing DuckDB
2. Save as local Parquet file in data/source/
3. User edits the Parquet data (add/remove/modify rows/columns)
4. When ready, run dlt pipeline to load edited Parquet into DuckDB
5. Run dbt to transform data
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
import json

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

from app.config import DATA_DIR, DATABASE_PATH


class SourceService:
    def __init__(self):
        self.source_dir = DATA_DIR / "source"
        self.source_dir.mkdir(parents=True, exist_ok=True)

    def _get_parquet_path(self, table_name: str) -> Path:
        return self.source_dir / f"{table_name}.parquet"

    def _get_metadata_path(self, table_name: str) -> Path:
        return self.source_dir / f"{table_name}_metadata.json"

    def _load_metadata(self, table_name: str) -> dict:
        path = self._get_metadata_path(table_name)
        if path.exists():
            with open(path, "r") as f:
                return json.load(f)
        return {"primary_key": "unique_id", "last_modified": None}

    def _save_metadata(self, table_name: str, metadata: dict) -> None:
        path = self._get_metadata_path(table_name)
        with open(path, "w") as f:
            json.dump(metadata, f, indent=2, default=str)

    def list_tables(self) -> list[dict]:
        """List all source Parquet tables."""
        tables = []
        for path in self.source_dir.glob("*.parquet"):
            try:
                pq_file = pq.ParquetFile(path)
                schema = pq_file.schema_arrow
                num_rows = pq_file.metadata.num_rows
                metadata = self._load_metadata(path.stem)

                tables.append({
                    "name": path.stem,
                    "row_count": num_rows,
                    "column_count": len(schema),
                    "last_modified": metadata.get("last_modified") or datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
                    "primary_key": metadata.get("primary_key", "unique_id"),
                    "file_path": str(path),
                })
            except Exception as e:
                print(f"Error reading {path}: {e}")
        return tables

    def get_table(self, table_name: str, limit: int = 100, offset: int = 0) -> dict:
        """Get table data with schema and pagination."""
        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        # Read Parquet file
        table = pq.read_table(path)
        df = table.to_pandas()

        total_count = len(df)
        data_slice = df.iloc[offset:offset + limit]

        # Convert to records with proper type handling
        records = []
        for _, row in data_slice.iterrows():
            record = {}
            for col in df.columns:
                val = row[col]
                if val is None or (hasattr(val, 'isna') and val.isna()):
                    record[col] = None
                elif hasattr(val, 'isoformat'):
                    record[col] = val.isoformat()
                elif hasattr(val, 'item'):
                    record[col] = val.item()  # numpy types
                else:
                    record[col] = val
            records.append(record)

        # Build schema info
        columns = []
        for field in table.schema:
            columns.append({
                "name": field.name,
                "type": str(field.type),
                "nullable": field.nullable,
            })

        metadata = self._load_metadata(table_name)

        return {
            "schema": {
                "columns": columns,
                "primary_key": metadata.get("primary_key", "unique_id"),
            },
            "data": records,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
        }

    def save_table(self, table_name: str, table_data: dict) -> dict:
        """Save entire table data (used for bulk updates)."""
        import pandas as pd

        path = self._get_parquet_path(table_name)

        # Convert data to DataFrame
        df = pd.DataFrame(table_data.get("data", []))

        # Convert to Parquet
        table = pa.Table.from_pandas(df)
        pq.write_table(table, path)

        # Update metadata
        schema_info = table_data.get("schema", {})
        metadata = {
            "primary_key": schema_info.get("primary_key", "unique_id"),
            "last_modified": datetime.now().isoformat(),
        }
        self._save_metadata(table_name, metadata)

        return {"success": True, "rows_saved": len(df)}

    def add_row(self, table_name: str, row_data: dict[str, Any]) -> dict:
        """Add a new row to the table."""
        import pandas as pd

        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        # Read existing data
        df = pd.read_parquet(path)
        metadata = self._load_metadata(table_name)
        pk = metadata.get("primary_key", "unique_id")

        # Generate new primary key if not provided
        if pk not in row_data or row_data[pk] is None:
            if pk in df.columns:
                existing_ids = df[pk].dropna().tolist()
                # Try to find max numeric ID
                numeric_ids = [int(x) for x in existing_ids if str(x).isdigit()]
                if numeric_ids:
                    row_data[pk] = max(numeric_ids) + 1
                else:
                    row_data[pk] = f"{table_name}_{len(df) + 1}"
            else:
                row_data[pk] = f"{table_name}_{len(df) + 1}"

        # Add missing columns with None
        for col in df.columns:
            if col not in row_data:
                row_data[col] = None

        # Append row
        new_df = pd.concat([df, pd.DataFrame([row_data])], ignore_index=True)

        # Save
        pq.write_table(pa.Table.from_pandas(new_df), path)
        metadata["last_modified"] = datetime.now().isoformat()
        self._save_metadata(table_name, metadata)

        return {"success": True, "row": row_data}

    def update_row(self, table_name: str, pk_value: Any, updates: dict[str, Any]) -> dict:
        """Update an existing row."""
        import pandas as pd

        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        df = pd.read_parquet(path)
        metadata = self._load_metadata(table_name)
        pk = metadata.get("primary_key", "unique_id")

        # Find and update row
        mask = df[pk] == pk_value
        if not mask.any():
            # Try string comparison
            mask = df[pk].astype(str) == str(pk_value)

        if not mask.any():
            raise ValueError(f"Row with {pk}={pk_value} not found")

        for col, val in updates.items():
            if col in df.columns:
                df.loc[mask, col] = val

        # Save
        pq.write_table(pa.Table.from_pandas(df), path)
        metadata["last_modified"] = datetime.now().isoformat()
        self._save_metadata(table_name, metadata)

        updated_row = df[mask].iloc[0].to_dict()
        return {"success": True, "row": updated_row}

    def delete_row(self, table_name: str, pk_value: Any) -> dict:
        """Delete a row from the table."""
        import pandas as pd

        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        df = pd.read_parquet(path)
        metadata = self._load_metadata(table_name)
        pk = metadata.get("primary_key", "unique_id")

        original_len = len(df)

        # Remove row
        mask = df[pk] != pk_value
        if mask.all():
            # Try string comparison
            mask = df[pk].astype(str) != str(pk_value)

        df = df[mask]

        if len(df) == original_len:
            raise ValueError(f"Row with {pk}={pk_value} not found")

        # Save
        pq.write_table(pa.Table.from_pandas(df), path)
        metadata["last_modified"] = datetime.now().isoformat()
        self._save_metadata(table_name, metadata)

        return {"success": True}

    def add_column(
        self,
        table_name: str,
        column_name: str,
        column_type: str,
        nullable: bool = True,
        default_value: Any = None
    ) -> dict:
        """Add a new column to the table."""
        import pandas as pd

        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        df = pd.read_parquet(path)

        if column_name in df.columns:
            raise ValueError(f"Column '{column_name}' already exists")

        # Add column with default value
        df[column_name] = default_value

        # Save
        pq.write_table(pa.Table.from_pandas(df), path)
        metadata = self._load_metadata(table_name)
        metadata["last_modified"] = datetime.now().isoformat()
        self._save_metadata(table_name, metadata)

        return {"success": True}

    def remove_column(self, table_name: str, column_name: str) -> dict:
        """Remove a column from the table."""
        import pandas as pd

        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        df = pd.read_parquet(path)
        metadata = self._load_metadata(table_name)

        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found")

        if column_name == metadata.get("primary_key"):
            raise ValueError("Cannot remove primary key column")

        df = df.drop(columns=[column_name])

        # Save
        pq.write_table(pa.Table.from_pandas(df), path)
        metadata["last_modified"] = datetime.now().isoformat()
        self._save_metadata(table_name, metadata)

        return {"success": True}

    def create_from_duckdb(self, table_name: str, source_table: str = "nyc_taxi_raw.trips", limit: int = 100) -> dict:
        """Create a new source Parquet file from DuckDB data."""
        import pandas as pd

        conn = duckdb.connect(str(DATABASE_PATH), read_only=True)
        try:
            df = conn.execute(f"SELECT * FROM {source_table} LIMIT {limit}").fetchdf()
        finally:
            conn.close()

        if df.empty:
            raise ValueError(f"No data found in {source_table}")

        path = self._get_parquet_path(table_name)
        pq.write_table(pa.Table.from_pandas(df), path)

        # Determine primary key
        pk = "unique_id" if "unique_id" in df.columns else df.columns[0]

        metadata = {
            "primary_key": pk,
            "last_modified": datetime.now().isoformat(),
            "source": source_table,
        }
        self._save_metadata(table_name, metadata)

        return {"success": True, "rows_loaded": len(df), "path": str(path)}

    def reload_from_duckdb(self, table_name: str, limit: int = 100) -> dict:
        """Reload/reset source Parquet from DuckDB (undo all edits)."""
        return self.create_from_duckdb(table_name, f"nyc_taxi_raw.{table_name}", limit)

    def sync_to_duckdb(self, table_name: str) -> dict:
        """
        Sync the edited Parquet file to DuckDB.
        This simulates what dlt would do - loads the Parquet into the raw schema.
        """
        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")

        conn = duckdb.connect(str(DATABASE_PATH))
        try:
            # Create schema if needed
            conn.execute("CREATE SCHEMA IF NOT EXISTS nyc_taxi_raw")

            # Load Parquet directly into DuckDB
            conn.execute(f"""
                CREATE OR REPLACE TABLE nyc_taxi_raw.{table_name} AS
                SELECT * FROM read_parquet('{path}')
            """)

            # Get row count
            result = conn.execute(f"SELECT COUNT(*) FROM nyc_taxi_raw.{table_name}").fetchone()
            row_count = result[0] if result else 0

            conn.commit()
            return {"success": True, "rows_synced": row_count}
        finally:
            conn.close()

    def get_parquet_path(self, table_name: str) -> str:
        """Get the path to the Parquet file for use by dlt pipeline."""
        path = self._get_parquet_path(table_name)
        if not path.exists():
            raise FileNotFoundError(f"Source table '{table_name}' not found")
        return str(path)


source_service = SourceService()
