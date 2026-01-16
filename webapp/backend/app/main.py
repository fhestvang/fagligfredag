from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routers import data, pipeline, dbt, websocket

app = FastAPI(
    title="NYC Taxi Pipeline Manager",
    description="API for managing dlt/dbt pipelines with real-time updates",
    version="1.0.0"
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
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(dbt.router, prefix="/api/dbt", tags=["dbt"])
app.include_router(websocket.router, tags=["WebSocket"])


@app.get("/")
async def root():
    return {"message": "NYC Taxi Pipeline Manager API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
