import json
from typing import Optional
from datetime import datetime
from fastapi import WebSocket


class WebSocketManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.job_subscriptions: dict[str, set[str]] = {}  # job_id -> set of client_ids

    async def connect(self, client_id: str, websocket: WebSocket):
        """Accept and store a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        # Remove from all subscriptions
        for job_id in list(self.job_subscriptions.keys()):
            self.job_subscriptions[job_id].discard(client_id)
            if not self.job_subscriptions[job_id]:
                del self.job_subscriptions[job_id]

    def subscribe_to_job(self, client_id: str, job_id: str):
        """Subscribe a client to a specific job's updates."""
        if job_id not in self.job_subscriptions:
            self.job_subscriptions[job_id] = set()
        self.job_subscriptions[job_id].add(client_id)

    def unsubscribe_from_job(self, client_id: str, job_id: str):
        """Unsubscribe a client from a job's updates."""
        if job_id in self.job_subscriptions:
            self.job_subscriptions[job_id].discard(client_id)

    async def send_personal_message(self, message: dict, client_id: str):
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                pass

    async def broadcast_to_job(self, job_id: str, message: dict):
        """Broadcast a message to all clients subscribed to a job."""
        subscribers = self.job_subscriptions.get(job_id, set())
        for client_id in subscribers:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_json(message)
                except Exception:
                    pass

    async def send_log(
        self,
        message: str,
        level: str = "info",
        source: str = "system",
        job_id: Optional[str] = None
    ):
        """Send a log message to appropriate clients."""
        msg = {
            "type": "log",
            "timestamp": datetime.now().isoformat(),
            "payload": {
                "level": level,
                "source": source,
                "message": message,
                "job_id": job_id
            }
        }
        if job_id:
            await self.broadcast_to_job(job_id, msg)
        else:
            await self.broadcast(msg)

    async def send_progress(
        self,
        job_id: str,
        job_type: str,
        current_step: str,
        progress_percent: float,
        records_processed: Optional[int] = None
    ):
        """Send a progress update."""
        msg = {
            "type": "progress",
            "timestamp": datetime.now().isoformat(),
            "payload": {
                "job_id": job_id,
                "job_type": job_type,
                "current_step": current_step,
                "progress_percent": progress_percent,
                "records_processed": records_processed
            }
        }
        await self.broadcast_to_job(job_id, msg)

    async def send_status(
        self,
        job_id: str,
        status: str,
        started_at: Optional[str] = None,
        ended_at: Optional[str] = None
    ):
        """Send a status update."""
        msg = {
            "type": "status",
            "timestamp": datetime.now().isoformat(),
            "payload": {
                "job_id": job_id,
                "status": status,
                "started_at": started_at,
                "ended_at": ended_at
            }
        }
        await self.broadcast_to_job(job_id, msg)

    async def send_complete(
        self,
        job_id: str,
        job_type: str,
        success: bool,
        summary: dict
    ):
        """Send a completion message."""
        msg = {
            "type": "complete",
            "timestamp": datetime.now().isoformat(),
            "payload": {
                "job_id": job_id,
                "job_type": job_type,
                "success": success,
                "summary": summary
            }
        }
        await self.broadcast_to_job(job_id, msg)
        # Also broadcast to all since job is done
        await self.broadcast(msg)


# Singleton instance
ws_manager = WebSocketManager()
