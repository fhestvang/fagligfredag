Run a full dbt build with seeds, models, and tests.

Execute the following steps:
1. Change to the dbt_project directory
2. Run `dbt seed` to load reference data
3. Run `dbt run` to build all models
4. Run `dbt test` to validate data quality
5. Report a summary of results including pass/fail counts

If any step fails, parse the error message and suggest fixes.
