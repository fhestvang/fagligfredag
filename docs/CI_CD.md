# CI/CD with GitHub Actions

This project uses GitHub Actions for continuous integration and deployment.

## Workflows Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `dbt-ci.yml` | Push/PR to dbt_project | Build, test, generate docs |
| `dlt-ci.yml` | Push/PR to dlt_pipeline | Validate, lint, test pipeline |
| `full-pipeline.yml` | Manual/Scheduled | End-to-end ETL run |
| `pr-checks.yml` | All PRs | Code quality, linting |

## Workflow Details

### dbt CI (`dbt-ci.yml`)

Runs on changes to `dbt_project/`:

```yaml
Steps:
1. Checkout code
2. Setup Python 3.11
3. Install dbt-duckdb
4. dbt deps (install packages)
5. dbt seed (load seed data)
6. dbt run (build models)
7. dbt test (run all tests)
8. Upload artifacts (manifest.json, run_results.json)
```

**Artifacts**: dbt docs generated on main branch pushes.

### dlt CI (`dlt-ci.yml`)

Runs on changes to `dlt_pipeline/`:

```yaml
Steps:
1. Checkout code
2. Setup Python 3.11
3. Install dlt[duckdb]
4. Lint with ruff
5. Validate pipeline syntax
6. Run pipeline with sample data
```

### Full Pipeline (`full-pipeline.yml`)

Manual or scheduled full ETL:

```yaml
Inputs:
- taxi_type: yellow/green
- year: 2023
- month: 1-12
- row_limit: number (0 for all)

Steps:
1. Run dlt ingestion
2. Run dbt build (seed + run + test)
3. Upload database artifact
```

**Schedule**: Monthly on the 5th at 6 AM UTC.

### PR Checks (`pr-checks.yml`)

Runs on all pull requests:

```yaml
Jobs:
1. lint - Python (ruff) and SQL (sqlfluff)
2. validate-yaml - YAML validation
3. changed-files - Report what changed
```

## Running Workflows Locally

### Using act (GitHub Actions local runner)

```bash
# Install act
brew install act  # macOS
choco install act-cli  # Windows

# Run dbt workflow
act -W .github/workflows/dbt-ci.yml

# Run with specific event
act pull_request -W .github/workflows/pr-checks.yml
```

### Manual Testing

```bash
# dbt CI equivalent
cd dbt_project
dbt deps
dbt seed
dbt run
dbt test

# dlt CI equivalent
cd dlt_pipeline
ruff check . --ignore E501
python nyc_taxi_pipeline.py
```

## Triggering Workflows

### Automatic Triggers

| Event | Workflows Triggered |
|-------|---------------------|
| Push to main (dbt changes) | dbt-ci |
| Push to main (dlt changes) | dlt-ci |
| PR to main | pr-checks, dbt-ci or dlt-ci |
| Monthly schedule | full-pipeline |

### Manual Triggers

```bash
# Trigger full pipeline via GitHub CLI
gh workflow run full-pipeline.yml \
  -f taxi_type=yellow \
  -f year=2023 \
  -f month=6 \
  -f row_limit=50000

# Check workflow status
gh run list --workflow=full-pipeline.yml
gh run view <run-id>
```

## Artifacts

Workflows produce downloadable artifacts:

| Artifact | Workflow | Contents |
|----------|----------|----------|
| dbt-artifacts | dbt-ci | manifest.json, run_results.json |
| dbt-docs | dbt-ci (main only) | Full dbt documentation site |
| nyc-taxi-database | full-pipeline | DuckDB database file |

Download via:
```bash
gh run download <run-id> -n dbt-artifacts
```

## Adding New Workflows

1. Create file in `.github/workflows/`
2. Define triggers (`on:`)
3. Define jobs and steps
4. Test locally with `act` or push to branch

Example minimal workflow:

```yaml
name: My Workflow

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run command
        run: echo "Hello World"
```

## Secrets and Variables

No secrets required for current workflows (public data, local DuckDB).

For future cloud deployments, add secrets via:
- GitHub UI: Settings > Secrets and variables > Actions
- GitHub CLI: `gh secret set SECRET_NAME`

Common secrets for data projects:
- `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`
- `BIGQUERY_CREDENTIALS` (JSON)
- `DBT_CLOUD_API_TOKEN`

## Monitoring

### GitHub UI
- Actions tab shows workflow runs
- Each run shows logs, artifacts, summary

### Notifications
Configure in Settings > Notifications:
- Email on failure
- Slack integration via webhook

### Status Badges

Add to README:
```markdown
![dbt CI](https://github.com/fhestvang/fagligfredag/actions/workflows/dbt-ci.yml/badge.svg)
![dlt CI](https://github.com/fhestvang/fagligfredag/actions/workflows/dlt-ci.yml/badge.svg)
```

## Troubleshooting

### Workflow Not Running
- Check `paths:` filter matches your changes
- Verify branch name matches trigger
- Check for YAML syntax errors

### dbt Fails
- Ensure `dbt deps` ran before `dbt run`
- Check for missing seed data
- Verify profiles.yml is correct

### dlt Fails
- Check Python version compatibility
- Verify source URL is accessible
- Check for rate limiting on NYC TLC API

### Artifact Upload Fails
- Check path exists
- Verify file size under 500MB limit
- Check retention-days is valid (1-90)
