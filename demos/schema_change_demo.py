"""
Schema Change Demo for dlt

Demonstrates how dlt automatically handles schema evolution:
1. Load initial data with base columns
2. Add new columns to subsequent loads
3. dlt automatically adds new columns to the destination table

Run: python demos/schema_change_demo.py
"""

import dlt
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DUCKDB_PATH = str(DATA_DIR / "nyc_taxi.duckdb")


def create_sample_data(include_new_columns: bool = False):
    """Create sample taxi trip data with optional new columns."""

    base_data = {
        "unique_id": ["demo_1", "demo_2", "demo_3"],
        "vendor_id": [1, 2, 1],
        "tpep_pickup_datetime": pd.to_datetime(["2023-01-01 08:00", "2023-01-01 09:00", "2023-01-01 10:00"]),
        "tpep_dropoff_datetime": pd.to_datetime(["2023-01-01 08:30", "2023-01-01 09:45", "2023-01-01 10:20"]),
        "passenger_count": [1, 2, 3],
        "trip_distance": [2.5, 5.0, 3.2],
        "pu_location_id": [100, 150, 200],
        "do_location_id": [120, 180, 220],
        "payment_type": [1, 2, 1],
        "fare_amount": [10.0, 20.0, 15.0],
        "tip_amount": [2.0, 0.0, 3.0],
        "total_amount": [12.0, 20.0, 18.0],
        "_taxi_type": ["yellow", "yellow", "yellow"],
        "_data_year": [2023, 2023, 2023],
        "_data_month": [1, 1, 1],
    }

    if include_new_columns:
        # Add new columns that weren't in the original schema
        base_data["weather_condition"] = ["sunny", "rainy", "cloudy"]
        base_data["traffic_level"] = ["low", "high", "medium"]
        base_data["driver_rating"] = [4.8, 4.5, 4.9]
        # Update unique IDs for new records
        base_data["unique_id"] = ["demo_4", "demo_5", "demo_6"]

    return pd.DataFrame(base_data)


@dlt.source(name="schema_demo")
def schema_demo_source(include_new_columns: bool = False):
    """Source that can optionally include new columns."""

    @dlt.resource(
        name="trips_demo",
        write_disposition="append",
        primary_key="unique_id"
    )
    def trips_resource():
        df = create_sample_data(include_new_columns)
        print(f"\nColumns in this load: {list(df.columns)}")
        print(f"Number of records: {len(df)}")

        for record in df.to_dict('records'):
            yield record

    return trips_resource


def run_demo():
    """Run the schema change demonstration."""

    DATA_DIR.mkdir(exist_ok=True)

    pipeline = dlt.pipeline(
        pipeline_name="schema_demo_pipeline",
        destination=dlt.destinations.duckdb(DUCKDB_PATH),
        dataset_name="schema_demo",
        pipelines_dir=str(PROJECT_ROOT / ".dlt_pipelines"),
    )

    print("=" * 60)
    print("SCHEMA CHANGE DEMO")
    print("=" * 60)

    # Step 1: Load initial data without new columns
    print("\n--- STEP 1: Initial Load (Base Schema) ---")
    source1 = schema_demo_source(include_new_columns=False)
    load_info1 = pipeline.run(source1)
    print(f"Load completed: {load_info1}")

    # Step 2: Load data with new columns
    print("\n--- STEP 2: Second Load (With New Columns) ---")
    print("Adding columns: weather_condition, traffic_level, driver_rating")
    source2 = schema_demo_source(include_new_columns=True)
    load_info2 = pipeline.run(source2)
    print(f"Load completed: {load_info2}")

    # Step 3: Verify schema evolution
    print("\n--- STEP 3: Verify Results ---")
    import duckdb
    conn = duckdb.connect(DUCKDB_PATH)

    # Show table schema
    print("\nTable columns after schema evolution:")
    result = conn.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'schema_demo'
        AND table_name = 'trips_demo'
        ORDER BY ordinal_position
    """).fetchall()

    for col_name, col_type in result:
        print(f"  - {col_name}: {col_type}")

    # Show data
    print("\nAll records (notice NULL for old records in new columns):")
    df = conn.execute("""
        SELECT unique_id, vendor_id, trip_distance,
               weather_condition, traffic_level, driver_rating
        FROM schema_demo.trips_demo
        ORDER BY unique_id
    """).fetchdf()
    print(df.to_string(index=False))

    conn.close()

    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("""
Key observations:
1. Initial load created table with base columns
2. Second load added 3 new columns automatically
3. Old records have NULL for new columns
4. No manual ALTER TABLE statements needed!
""")


if __name__ == "__main__":
    run_demo()
