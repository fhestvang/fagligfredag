#!/usr/bin/env python3
"""
Check referential integrity between fact and dimension tables.

Usage:
    python check_referential_integrity.py <duckdb_path> <fact_table> <fk_column> <dim_table> <pk_column>

Example:
    python check_referential_integrity.py data/nyc_taxi.duckdb fct_trips pickup_location_key dim_location location_key
"""

import sys
import duckdb


def check_referential_integrity(
    db_path: str,
    fact_table: str,
    fk_column: str,
    dim_table: str,
    pk_column: str
) -> bool:
    """
    Check if all foreign keys in fact table exist in dimension table.

    Returns True if referential integrity holds, False otherwise.
    """
    query = f"""
    SELECT
        f.{fk_column} as orphan_key,
        COUNT(*) as orphan_count
    FROM {fact_table} f
    LEFT JOIN {dim_table} d ON f.{fk_column} = d.{pk_column}
    WHERE d.{pk_column} IS NULL
      AND f.{fk_column} IS NOT NULL
    GROUP BY f.{fk_column}
    ORDER BY orphan_count DESC
    LIMIT 10
    """

    try:
        conn = duckdb.connect(db_path, read_only=True)
        result = conn.execute(query).fetchall()

        # Get total orphan count
        total_query = f"""
        SELECT COUNT(*)
        FROM {fact_table} f
        LEFT JOIN {dim_table} d ON f.{fk_column} = d.{pk_column}
        WHERE d.{pk_column} IS NULL
          AND f.{fk_column} IS NOT NULL
        """
        total = conn.execute(total_query).fetchone()[0]
        conn.close()

        if total == 0:
            print(f"PASS: All {fk_column} values in {fact_table} exist in {dim_table}.{pk_column}")
            return True

        print(f"FAIL: Found {total} orphan records (showing top 10 FK values):")
        print(f"orphan_key, count")
        for row in result:
            print(f"  {row[0]}: {row[1]} records")

        print(f"\nRecommendation: Add unknown member row with key -1 to {dim_table}")
        return False

    except Exception as e:
        print(f"ERROR: {e}")
        return False


def main():
    if len(sys.argv) != 6:
        print(__doc__)
        sys.exit(1)

    db_path = sys.argv[1]
    fact_table = sys.argv[2]
    fk_column = sys.argv[3]
    dim_table = sys.argv[4]
    pk_column = sys.argv[5]

    success = check_referential_integrity(db_path, fact_table, fk_column, dim_table, pk_column)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
