# Run Webapp

Start the dbt demo webapp (FastAPI backend + Next.js frontend).

---

allowed_tools: Bash(*), Read
argument_description: [start|stop|status|restart] (default: start)

---

## Architecture

```
webapp/
├── backend/          # FastAPI + uvicorn (port 8000)
│   └── app/
│       ├── main.py   # Entry point
│       └── routers/  # API endpoints
└── frontend/         # Next.js (port 3000)
    └── src/
        └── app/      # React components
```

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| OpenAPI JSON | http://localhost:8000/openapi.json |

## Commands

### `/run-webapp` or `/run-webapp start`

1. Check if ports 3000 and 8000 are already in use
2. If not running, start the servers:

**Backend:**
```bash
cd webapp/backend && ../../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd webapp/frontend && npm run dev
```

3. Verify both servers are responding
4. Report the URLs to the user

### `/run-webapp status`

Check if servers are running:
```bash
netstat -ano | findstr ":3000 :8000"
```

### `/run-webapp stop`

Kill processes on ports 3000 and 8000:
```bash
# Find and kill backend (port 8000)
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %a

# Find and kill frontend (port 3000)
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %a
```

### `/run-webapp restart`

1. Stop both servers
2. Wait 2 seconds
3. Start both servers

## Prerequisites

- Python venv at `.venv/` with FastAPI, uvicorn installed
- Node.js with npm
- Frontend dependencies installed (`cd webapp/frontend && npm install`)

## Troubleshooting

### Port already in use
Use `/run-webapp status` to check what's running, then `/run-webapp stop` to free ports.

### Backend won't start
1. Check that `.venv` exists and has uvicorn: `.venv/Scripts/pip.exe show uvicorn`
2. Check for Python syntax errors in `webapp/backend/app/`
3. Verify DuckDB database exists at `data/nyc_taxi.duckdb`

### Frontend won't start
1. Ensure dependencies are installed: `cd webapp/frontend && npm install`
2. Check for TypeScript errors: `cd webapp/frontend && npm run build`

### API returns 500 errors
1. Check backend logs in the terminal
2. Common issues: missing dbt manifest.json, database connection errors

## Dependencies

Backend Python packages (in .venv):
- fastapi
- uvicorn
- duckdb
- pydantic

Frontend npm packages:
- next
- react
- @tanstack/react-query
- @xyflow/react
- tailwindcss
