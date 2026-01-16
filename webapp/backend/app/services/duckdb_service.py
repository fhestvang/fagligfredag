import duckdb
from typing import Any, Optional
from contextlib import contextmanager

from app.config import DUCKDB_PATH
from app.models.data import ColumnInfo, TableInfo, QueryResult


class DuckDBService:
    def __init__(self, db_path: str = DUCKDB_PATH):
        self.db_path = db_path

    @contextmanager
    def get_connection(self, read_only: bool = True):
        """Context manager for database connections."""
        conn = duckdb.connect(self.db_path, read_only=read_only)
        try:
            yield conn
        finally:
            conn.close()

    def list_schemas(self) -> list[str]:
        """List all schemas in the database."""
        with self.get_connection() as conn:
            result = conn.execute("""
                SELECT DISTINCT schema_name
                FROM information_schema.schemata
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
                ORDER BY schema_name
            """).fetchall()
            return [row[0] for row in result]

    def list_tables(self, schema: str) -> list[TableInfo]:
        """List all tables in a schema."""
        with self.get_connection() as conn:
            result = conn.execute("""
                SELECT table_name,
                       (SELECT COUNT(*) FROM information_schema.columns c
                        WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as col_count,
                       table_type
                FROM information_schema.tables t
                WHERE table_schema = ?
                ORDER BY table_name
            """, [schema]).fetchall()

            tables = []
            for row in result:
                # Get row count (can be slow for large tables)
                try:
                    count_result = conn.execute(f'SELECT COUNT(*) FROM "{schema}"."{row[0]}"').fetchone()
                    row_count = count_result[0] if count_result else None
                except:
                    row_count = None

                tables.append(TableInfo(
                    name=row[0],
                    schema_name=schema,
                    column_count=row[1],
                    row_count=row_count,
                    table_type=row[2]
                ))
            return tables

    def get_table_schema(self, schema: str, table: str) -> list[ColumnInfo]:
        """Get column information for a table."""
        with self.get_connection() as conn:
            result = conn.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = ? AND table_name = ?
                ORDER BY ordinal_position
            """, [schema, table]).fetchall()

            return [
                ColumnInfo(
                    name=row[0],
                    type=row[1],
                    nullable=row[2] == 'YES'
                )
                for row in result
            ]

    def query_table(
        self,
        schema: str,
        table: str,
        limit: int = 100,
        offset: int = 0,
        order_by: Optional[str] = None,
        order_dir: str = "asc",
        filters: Optional[dict[str, Any]] = None
    ) -> QueryResult:
        """Query table data with pagination."""
        with self.get_connection() as conn:
            # Get total count
            count_query = f'SELECT COUNT(*) FROM "{schema}"."{table}"'
            total_count = conn.execute(count_query).fetchone()[0]

            # Build main query
            query = f'SELECT * FROM "{schema}"."{table}"'
            params = []

            # Add filters if provided
            if filters:
                where_clauses = []
                for col, val in filters.items():
                    where_clauses.append(f'"{col}" = ?')
                    params.append(val)
                if where_clauses:
                    query += " WHERE " + " AND ".join(where_clauses)

            # Add ordering
            if order_by:
                query += f' ORDER BY "{order_by}" {order_dir.upper()}'

            # Add pagination
            query += f" LIMIT {limit} OFFSET {offset}"

            result = conn.execute(query, params)
            columns = [ColumnInfo(name=desc[0], type=str(desc[1])) for desc in result.description]
            data = [dict(zip([c.name for c in columns], row)) for row in result.fetchall()]

            return QueryResult(
                data=data,
                columns=columns,
                total_count=total_count,
                page=offset // limit + 1,
                page_size=limit
            )

    def update_record(
        self,
        schema: str,
        table: str,
        pk_column: str,
        pk_value: Any,
        updates: dict[str, Any]
    ) -> bool:
        """Update a single record."""
        with self.get_connection(read_only=False) as conn:
            set_clauses = ", ".join([f'"{k}" = ?' for k in updates.keys()])
            query = f'UPDATE "{schema}"."{table}" SET {set_clauses} WHERE "{pk_column}" = ?'
            params = list(updates.values()) + [pk_value]
            conn.execute(query, params)
            return True

    def insert_record(self, schema: str, table: str, data: dict[str, Any]) -> bool:
        """Insert a new record."""
        with self.get_connection(read_only=False) as conn:
            columns = ", ".join([f'"{k}"' for k in data.keys()])
            placeholders = ", ".join(["?" for _ in data])
            query = f'INSERT INTO "{schema}"."{table}" ({columns}) VALUES ({placeholders})'
            conn.execute(query, list(data.values()))
            return True

    def delete_record(self, schema: str, table: str, pk_column: str, pk_value: Any) -> bool:
        """Delete a single record."""
        with self.get_connection(read_only=False) as conn:
            query = f'DELETE FROM "{schema}"."{table}" WHERE "{pk_column}" = ?'
            conn.execute(query, [pk_value])
            return True

    def execute_query(self, query: str) -> list[dict[str, Any]]:
        """Execute a raw SQL query (read-only)."""
        with self.get_connection() as conn:
            result = conn.execute(query)
            columns = [desc[0] for desc in result.description]
            return [dict(zip(columns, row)) for row in result.fetchall()]


# Singleton instance
db_service = DuckDBService()
