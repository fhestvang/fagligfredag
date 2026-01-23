import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Project root (fagligfredag-agent1/)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.resolve()

# Data directory
DATA_DIR = PROJECT_ROOT / "data"

# Database path
DATABASE_PATH = DATA_DIR / "nyc_taxi.duckdb"
DUCKDB_PATH = os.getenv("DUCKDB_PATH", str(DATABASE_PATH))

# dlt pipeline path
DLT_PIPELINE_PATH = PROJECT_ROOT / "dlt_pipeline"
DLT_PIPELINE_SCRIPT = DLT_PIPELINE_PATH / "nyc_taxi_pipeline.py"

# dbt project path
DBT_PROJECT_PATH = PROJECT_ROOT / "dbt_project"

# Virtual environment python
VENV_PYTHON = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"

# CORS origins
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
