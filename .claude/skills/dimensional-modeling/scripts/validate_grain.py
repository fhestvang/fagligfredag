#!/usr/bin/env python3
"""
Validate fact table grain by checking for duplicate primary keys.

Usage:
    python validate_grain.py <duckdb_path> <table_name> <key_columns>

Example:
    python validate_grain.py data/nyc_taxi.duckdb fct_trips trip_key
    python validate_grain.py data/nyc_taxi.duckdb fct_orders order_key,line_number
"""

import sys
import duckdb


def validate_grain(db_path: str, table_name: str, key_columns: str) -> bool:
    """
    Check if key columns uniquely identify rows in the table.

    Returns True if grain is valid (no duplicates), False otherwise.
    """
    keys = [k.strip() for k in key_columns.split(',')]
    key_list = ', '.join(keys)

    query = f"""
    SELECT
        {key_list},
        COUNT(*) as row_count
    FROM {table_name}
    GROUP BY {key_list}
    HAVING COUNT(*) > 1
    ORDER BY row_count DESC
    LIMIT 10
    """

    try:
        conn = duckdb.connect(db_path, read_only=True)
        result = conn.execute(query).fetchall()
        conn.close()

        if not result:
            print(f"PASS: Grain is valid. Key columns ({key_list}) uniquely identify rows.")
            return True

        print(f"FAIL: Found {len(result)} duplicate key combinations (showing top 10):")
        print(f"Columns: {key_list}, row_count")
        for row in result:
            print(f"  {row}")
        return False

    except Exception as e:
        print(f"ERROR: {e}")
        return False


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)

    db_path = sys.argv[1]
    table_name = sys.argv[2]
    key_columns = sys.argv[3]

    success = validate_grain(db_path, table_name, key_columns)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
