"""
Incremental Load Demo for dlt

Demonstrates how dlt handles incremental data loads:
1. Initial load with replace disposition
2. Add new records with merge disposition
3. Update existing records with merge disposition
4. Shows how dbt transforms reflect the changes

Run: python demos/incremental_load_demo.py
"""

import dlt
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DUCKDB_PATH = str(DATA_DIR / "nyc_taxi.duckdb")


def create_initial_data():
    """Create initial batch of taxi trip data."""
    return pd.DataFrame({
        "unique_id": ["inc_001", "inc_002", "inc_003"],
        "vendor_id": [1, 2, 1],
        "tpep_pickup_datetime": pd.to_datetime([
            "2023-06-01 08:00", "2023-06-01 09:00", "2023-06-01 10:00"
        ]),
        "tpep_dropoff_datetime": pd.to_datetime([
            "2023-06-01 08:30", "2023-06-01 09:45", "2023-06-01 10:20"
        ]),
        "passenger_count": [1, 2, 3],
        "trip_distance": [2.5, 5.0, 3.2],
        "pu_location_id": [100, 150, 200],
        "do_location_id": [120, 180, 220],
        "payment_type": [1, 2, 1],
        "fare_amount": [10.0, 20.0, 15.0],
        "extra": [0.5, 1.0, 0.5],
        "mta_tax": [0.5, 0.5, 0.5],
        "tip_amount": [2.0, 0.0, 3.0],
        "tolls_amount": [0.0, 5.0, 0.0],
        "improvement_surcharge": [0.3, 0.3, 0.3],
        "total_amount": [13.3, 26.8, 19.3],
        "congestion_surcharge": [0.0, 0.0, 0.0],
        "airport_fee": [0.0, 0.0, 0.0],
        "_taxi_type": ["yellow", "yellow", "yellow"],
        "_data_year": [2023, 2023, 2023],
        "_data_month": [6, 6, 6],
    })


def create_new_records():
    """Create new records to add incrementally."""
    return pd.DataFrame({
        "unique_id": ["inc_004", "inc_005"],
        "vendor_id": [2, 1],
        "tpep_pickup_datetime": pd.to_datetime([
            "2023-06-02 11:00", "2023-06-02 14:00"
        ]),
        "tpep_dropoff_datetime": pd.to_datetime([
            "2023-06-02 11:45", "2023-06-02 14:30"
        ]),
        "passenger_count": [4, 1],
        "trip_distance": [8.0, 2.0],
        "pu_location_id": [132, 237],
        "do_location_id": [138, 162],
        "payment_type": [1, 2],
        "fare_amount": [25.0, 8.0],
        "extra": [1.0, 0.5],
        "mta_tax": [0.5, 0.5],
        "tip_amount": [5.0, 0.0],
        "tolls_amount": [0.0, 0.0],
        "improvement_surcharge": [0.3, 0.3],
        "total_amount": [31.8, 9.3],
        "congestion_surcharge": [2.5, 0.0],
        "airport_fee": [0.0, 0.0],
        "_taxi_type": ["yellow", "yellow"],
        "_data_year": [2023, 2023],
        "_data_month": [6, 6],
    })


def create_updated_records():
    """Create updates to existing records (same unique_id, different values)."""
    return pd.DataFrame({
        "unique_id": ["inc_001", "inc_002"],  # Same IDs as initial
        "vendor_id": [1, 2],
        "tpep_pickup_datetime": pd.to_datetime([
            "2023-06-01 08:00", "2023-06-01 09:00"
        ]),
        "tpep_dropoff_datetime": pd.to_datetime([
            "2023-06-01 08:30", "2023-06-01 09:45"
        ]),
        "passenger_count": [1, 2],
        "trip_distance": [2.5, 5.0],
        "pu_location_id": [100, 150],
        "do_location_id": [120, 180],
        "payment_type": [1, 2],
        "fare_amount": [10.0, 20.0],
        "extra": [0.5, 1.0],
        "mta_tax": [0.5, 0.5],
        "tip_amount": [3.5, 4.0],  # UPDATED: tip amounts changed
        "tolls_amount": [0.0, 5.0],
        "improvement_surcharge": [0.3, 0.3],
        "total_amount": [14.8, 30.8],  # UPDATED: totals changed
        "congestion_surcharge": [0.0, 0.0],
        "airport_fee": [0.0, 0.0],
        "_taxi_type": ["yellow", "yellow"],
        "_data_year": [2023, 2023],
        "_data_month": [6, 6],
    })


@dlt.source(name="incremental_demo")
def incremental_demo_source(data_func, write_disposition: str = "replace"):
    """Source with configurable write disposition."""

    @dlt.resource(
        name="trips_incremental",
        write_disposition=write_disposition,
        primary_key="unique_id"
    )
    def trips_resource():
        df = data_func()
        print(f"  Records to load: {len(df)}")
        print(f"  Record IDs: {list(df['unique_id'])}")

        for record in df.to_dict('records'):
            yield record

    return trips_resource


def query_current_state(conn, step_name: str):
    """Query and display current state of the data."""
    print(f"\n  Current state after {step_name}:")
    df = conn.execute("""
        SELECT unique_id, tip_amount, total_amount
        FROM incremental_demo.trips_incremental
        ORDER BY unique_id
    """).fetchdf()
    print(df.to_string(index=False))
    print(f"  Total records: {len(df)}")


def run_demo():
    """Run the incremental load demonstration."""

    DATA_DIR.mkdir(exist_ok=True)

    pipeline = dlt.pipeline(
        pipeline_name="incremental_demo_pipeline",
        destination=dlt.destinations.duckdb(DUCKDB_PATH),
        dataset_name="incremental_demo",
        pipelines_dir=str(PROJECT_ROOT / ".dlt_pipelines"),
    )

    import duckdb
    conn = duckdb.connect(DUCKDB_PATH)

    print("=" * 60)
    print("INCREMENTAL LOAD DEMO")
    print("=" * 60)

    # Step 1: Initial load with REPLACE
    print("\n--- STEP 1: Initial Load (REPLACE) ---")
    print("Loading 3 initial records...")
    source1 = incremental_demo_source(create_initial_data, "replace")
    load_info1 = pipeline.run(source1)
    query_current_state(conn, "initial load")

    # Step 2: Add new records with MERGE
    print("\n--- STEP 2: Add New Records (MERGE) ---")
    print("Adding 2 new records (inc_004, inc_005)...")
    source2 = incremental_demo_source(create_new_records, "merge")
    load_info2 = pipeline.run(source2)
    query_current_state(conn, "adding new records")

    # Step 3: Update existing records with MERGE
    print("\n--- STEP 3: Update Existing Records (MERGE) ---")
    print("Updating inc_001 and inc_002 with new tip amounts...")
    print("  inc_001: tip $2.00 -> $3.50, total $13.30 -> $14.80")
    print("  inc_002: tip $0.00 -> $4.00, total $26.80 -> $30.80")
    source3 = incremental_demo_source(create_updated_records, "merge")
    load_info3 = pipeline.run(source3)
    query_current_state(conn, "updating records")

    conn.close()

    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("""
Key observations:
1. REPLACE: Drops and recreates the table
2. MERGE: Upserts based on primary_key (unique_id)
   - New records are inserted
   - Existing records are updated
3. This enables incremental data pipelines!

To see how dbt handles these changes, run:
  cd dbt_project
  dbt run
  dbt test
""")


if __name__ == "__main__":
    run_demo()
