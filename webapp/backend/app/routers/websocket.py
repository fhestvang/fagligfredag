import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates."""
    await ws_manager.connect(client_id, websocket)

    try:
        # Send initial connection confirmation
        await ws_manager.send_personal_message({
            "type": "status",
            "payload": {
                "status": "connected",
                "client_id": client_id,
                "message": "Connected to pipeline manager"
            }
        }, client_id)

        while True:
            # Wait for messages from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                action = message.get("action")

                if action == "subscribe":
                    job_id = message.get("job_id")
                    if job_id:
                        ws_manager.subscribe_to_job(client_id, job_id)
                        await ws_manager.send_personal_message({
                            "type": "status",
                            "payload": {
                                "status": "subscribed",
                                "job_id": job_id
                            }
                        }, client_id)

                elif action == "unsubscribe":
                    job_id = message.get("job_id")
                    if job_id:
                        ws_manager.unsubscribe_from_job(client_id, job_id)
                        await ws_manager.send_personal_message({
                            "type": "status",
                            "payload": {
                                "status": "unsubscribed",
                                "job_id": job_id
                            }
                        }, client_id)

                elif action == "ping":
                    await ws_manager.send_personal_message({
                        "type": "pong"
                    }, client_id)

            except json.JSONDecodeError:
                await ws_manager.send_personal_message({
                    "type": "error",
                    "payload": {"message": "Invalid JSON"}
                }, client_id)

    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
