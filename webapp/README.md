# NYC Taxi Pipeline Manager

A web application for managing and demonstrating dlt/dbt pipeline features including schema evolution, incremental loading, and data exploration.

## Features

- **Pipeline Control**: Run dlt pipelines with configurable parameters (year, month, taxi type, write disposition)
- **dbt Transformations**: Execute dbt run, test, and build commands
- **Data Explorer**: Browse data across raw, staging, and marts layers
- **Live Monitoring**: Real-time log streaming via WebSocket
- **Write Dispositions**: Demonstrate Replace, Merge, and Append modes

## Prerequisites

- Python 3.9+ with the project's virtual environment activated
- Node.js 18+ and npm
- The main project's virtual environment with dlt and dbt installed

## Quick Start

### 1. Start the Backend

```powershell
# From the project root, activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
cd webapp\backend
pip install -r requirements.txt

# Run the FastAPI server
python run.py
```

The API will be available at http://localhost:8000

API Documentation: http://localhost:8000/docs

### 2. Start the Frontend

```powershell
# In a new terminal
cd webapp\frontend

# Install dependencies (first time only)
npm install

# Run the development server
npm run dev
```

The web app will be available at http://localhost:3000

## Architecture

```
webapp/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── config.py       # Configuration
│   │   ├── routers/        # API endpoints
│   │   │   ├── data.py     # Data querying endpoints
│   │   │   ├── pipeline.py # dlt pipeline endpoints
│   │   │   ├── dbt.py      # dbt command endpoints
│   │   │   └── websocket.py# WebSocket for live logs
│   │   └── services/       # Business logic
│   │       ├── duckdb_service.py
│   │       ├── dlt_service.py
│   │       └── dbt_service.py
│   └── requirements.txt
│
└── frontend/               # Next.js Frontend
    ├── src/
    │   ├── app/            # Pages
    │   │   ├── page.tsx    # Dashboard
    │   │   ├── pipeline/   # Pipeline controls
    │   │   ├── data/       # Data explorer
    │   │   └── monitoring/ # Live logs
    │   ├── components/     # Reusable components
    │   ├── hooks/          # React hooks (WebSocket)
    │   └── lib/            # API client, types
    └── package.json
```

## API Endpoints

### Data Endpoints
- `GET /api/data/schemas` - List database schemas
- `GET /api/data/tables/{schema}` - List tables in a schema
- `GET /api/data/query` - Query table data with pagination
- `POST /api/data/update` - Update a record
- `POST /api/data/insert` - Insert a record
- `POST /api/data/delete` - Delete a record

### Pipeline Endpoints
- `POST /api/pipeline/run` - Start a dlt pipeline run
- `GET /api/pipeline/status/{job_id}` - Get job status
- `GET /api/pipeline/jobs` - List all jobs

### dbt Endpoints
- `POST /api/dbt/run` - Run dbt command (run/test/build)
- `GET /api/dbt/models` - List dbt models

### WebSocket
- `ws://localhost:8000/ws/{client_id}` - Real-time log streaming

## Demonstrating Features

### Schema Evolution
1. Go to **Pipeline** page
2. Run a dlt pipeline with default settings
3. Go to **Data Explorer** and view the `nyc_taxi_raw.trips` table
4. Modify the pipeline to add new columns (advanced)
5. Run again and observe the schema automatically evolving

### Incremental Loading
1. On the **Pipeline** page, select different write dispositions:
   - **Replace**: Drops existing data and loads fresh
   - **Merge**: Upserts based on primary key (unique_id)
   - **Append**: Adds data without checking for duplicates
2. Load data with different dispositions and observe the behavior

### Data Flow
1. Run dlt pipeline to load raw data
2. Run dbt to transform data through staging to marts
3. Use Data Explorer to view data at each layer:
   - `nyc_taxi_raw.trips` (raw dlt data)
   - `staging.stg_trips` (cleaned/transformed)
   - `marts.fct_daily_trips` (aggregated)
   - `marts.fct_location_stats` (aggregated)

## Development

### Backend
```powershell
cd webapp\backend
python run.py  # Runs with auto-reload
```

### Frontend
```powershell
cd webapp\frontend
npm run dev    # Runs with hot reload
```

## Troubleshooting

### "dlt not found" or "dbt not found"
Make sure you've activated the project's virtual environment before starting the backend:
```powershell
.\.venv\Scripts\Activate.ps1
```

### WebSocket not connecting
1. Ensure the backend is running on port 8000
2. Check browser console for connection errors
3. The frontend expects the backend at `localhost:8000`

### Database connection errors
The backend expects the DuckDB database at `data/nyc_taxi.duckdb`. Run the dlt pipeline first if the database doesn't exist.
