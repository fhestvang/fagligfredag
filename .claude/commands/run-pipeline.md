Execute the complete data pipeline from ingestion to transformation.

Execute the following steps:
1. Run `python main.py` to execute dlt data ingestion
2. Change to the dbt_project directory
3. Run `dbt seed` to load reference data
4. Run `dbt run` to build all models
5. Run `dbt test` to validate data quality
6. Report a summary of the full pipeline execution
