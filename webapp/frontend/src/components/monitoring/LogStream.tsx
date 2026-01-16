'use client';

import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

export function LogStream() {
  const { logs, clearLogs, connected } = useWebSocket();
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current && autoScrollRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If within 50px of bottom, enable auto-scroll
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-green-400';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'dlt':
        return 'text-blue-400';
      case 'dbt':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-500">
            {connected ? 'Connected' : 'Disconnected'} - {logs.length} logs
          </span>
        </div>
        <button
          onClick={clearLogs}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-80 overflow-auto rounded-lg bg-gray-900 p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs yet. Run a pipeline to see output here.</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex space-x-2">
              <span className="text-gray-600">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`w-12 ${getSourceColor(log.source)}`}>
                [{log.source}]
              </span>
              <span className={`w-16 ${getLevelColor(log.level)}`}>
                {log.level.toUpperCase()}
              </span>
              <span className="flex-1 text-gray-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
