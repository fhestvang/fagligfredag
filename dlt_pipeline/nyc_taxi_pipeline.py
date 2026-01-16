"""
NYC Taxi Data Pipeline using dlt
Ingests NYC TLC Trip Record Data into DuckDB

Supports:
- Full replace loads
- Incremental/merge loads
- Schema evolution (new columns handled automatically)
"""

import dlt
from pathlib import Path

# NYC TLC provides parquet files - we'll use a sample for demo
NYC_TAXI_BASE_URL = "https://d37ci6vzurychx.cloudfront.net/trip-data"

# Get absolute path to data directory
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DUCKDB_PATH = str(DATA_DIR / "nyc_taxi.duckdb")


@dlt.source(name="nyc_taxi")
def nyc_taxi_source(
    year: int = 2023,
    month: int = 1,
    taxi_type: str = "yellow",
    write_disposition: str = "replace"
):
    """
    Source for NYC Taxi data.

    Args:
        year: Year of data (2009-2024)
        month: Month of data (1-12)
        taxi_type: Type of taxi (yellow, green, fhv, fhvhv)
        write_disposition: How to handle existing data
            - "replace": Replace all data (default)
            - "merge": Upsert based on primary key
            - "append": Add new records without checking duplicates
    """

    @dlt.resource(
        name="trips",
        write_disposition=write_disposition,
        primary_key="unique_id"
    )
    def trips_resource():
        """Load taxi trip data."""
        import pandas as pd

        # Format month with leading zero
        month_str = str(month).zfill(2)

        # Construct URL for parquet file
        url = f"{NYC_TAXI_BASE_URL}/{taxi_type}_tripdata_{year}-{month_str}.parquet"

        print(f"Loading data from: {url}")

        try:
            # Read parquet file directly from URL
            df = pd.read_parquet(url)

            # Create unique ID combining year, month, taxi_type and row index
            # This ensures uniqueness across different loads
            df['unique_id'] = df.apply(
                lambda row: f"{taxi_type}_{year}_{month}_{row.name}",
                axis=1
            )

            # Add metadata columns
            df['_taxi_type'] = taxi_type
            df['_data_year'] = year
            df['_data_month'] = month

            # Limit to first 10000 rows for demo (remove for full load)
            df = df.head(10000)

            # Yield records
            for record in df.to_dict('records'):
                yield record

        except Exception as e:
            print(f"Error loading data: {e}")
            raise

    return trips_resource


def run_pipeline(
    year: int = 2023,
    month: int = 1,
    taxi_type: str = "yellow",
    dataset_name: str = "nyc_taxi_raw",
    write_disposition: str = "replace"
):
    """
    Run the NYC Taxi data pipeline.

    Args:
        year: Year of data
        month: Month of data
        taxi_type: Type of taxi
        dataset_name: Name of the destination dataset
        write_disposition: "replace", "merge", or "append"
    """
    # Ensure data directory exists
    DATA_DIR.mkdir(exist_ok=True)

    # Configure pipeline with absolute path
    pipeline = dlt.pipeline(
        pipeline_name="nyc_taxi_pipeline",
        destination=dlt.destinations.duckdb(DUCKDB_PATH),
        dataset_name=dataset_name,
        pipelines_dir=str(PROJECT_ROOT / ".dlt_pipelines"),
    )

    # Get source with specified write disposition
    source = nyc_taxi_source(
        year=year,
        month=month,
        taxi_type=taxi_type,
        write_disposition=write_disposition
    )

    # Run pipeline
    print(f"Starting pipeline for {taxi_type} taxi data: {year}-{month:02d}")
    print(f"Write disposition: {write_disposition}")
    load_info = pipeline.run(source)

    print(f"Pipeline completed!")
    print(load_info)

    return load_info


if __name__ == "__main__":
    # Run with default parameters (Yellow taxi, Jan 2023)
    run_pipeline(year=2023, month=1, taxi_type="yellow")
