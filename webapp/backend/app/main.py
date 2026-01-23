from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routers import source, data, dag, diff, impact, pipeline, dbt, websocket

app = FastAPI(
    title="dbt Demo Platform",
    description="Interactive platform for demonstrating dbt concepts - source editing, DAG visualization, and impact analysis",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(source.router, prefix="/api/source", tags=["Source"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(dag.router, prefix="/api/dag", tags=["DAG"])
app.include_router(diff.router, prefix="/api/diff", tags=["Diff"])
app.include_router(impact.router, prefix="/api/impact", tags=["Impact"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(dbt.router, prefix="/api/dbt", tags=["dbt"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/")
async def root():
    return {"message": "NYC Taxi Pipeline Manager API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
