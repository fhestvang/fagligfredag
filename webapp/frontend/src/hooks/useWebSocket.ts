'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { create } from 'zustand';
import type { LogMessage, WebSocketMessage } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface WebSocketState {
  connected: boolean;
  logs: LogMessage[];
  setConnected: (connected: boolean) => void;
  addLog: (log: LogMessage) => void;
  clearLogs: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  connected: false,
  logs: [],
  setConnected: (connected) => set({ connected }),
  addLog: (log) => set((state) => ({
    logs: [...state.logs.slice(-500), log], // Keep last 500 logs
  })),
  clearLogs: () => set({ logs: [] }),
}));

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const clientId = useRef<string>(`client-${Math.random().toString(36).slice(2, 9)}`);
  const { setConnected, addLog } = useWebSocketStore();
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(`${WS_URL}/ws/${clientId.current}`);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          if (message.type === 'log') {
            const payload = message.payload as {
              level: 'debug' | 'info' | 'warning' | 'error';
              source: 'dlt' | 'dbt' | 'system';
              message: string;
              job_id?: string;
            };
            addLog({
              level: payload.level,
              source: payload.source,
              message: payload.message,
              job_id: payload.job_id,
              timestamp: message.timestamp || new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, [setConnected, addLog]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const subscribe = useCallback((jobId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'subscribe', job_id: jobId }));
    }
  }, []);

  const unsubscribe = useCallback((jobId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'unsubscribe', job_id: jobId }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected: useWebSocketStore((s) => s.connected),
    logs: useWebSocketStore((s) => s.logs),
    lastMessage,
    subscribe,
    unsubscribe,
    clearLogs: useWebSocketStore((s) => s.clearLogs),
  };
}
