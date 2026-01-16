export interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
}

export interface TableInfo {
  name: string;
  schema_name: string;
  column_count: number;
  row_count?: number;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface JobStatus {
  job_id: string;
  job_type: 'dlt_load' | 'dbt_run' | 'dbt_test' | 'dbt_build';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  ended_at?: string;
  message?: string;
  result?: Record<string, unknown>;
}

export interface PipelineRunRequest {
  year: number;
  month: number;
  taxi_type: 'yellow' | 'green' | 'fhv' | 'fhvhv';
  write_disposition: 'replace' | 'merge' | 'append';
  row_limit?: number;
}

export interface DbtRunRequest {
  command: 'run' | 'test' | 'compile' | 'build';
  select?: string;
  full_refresh?: boolean;
}

export interface WebSocketMessage {
  type: 'log' | 'progress' | 'status' | 'complete' | 'error' | 'pong';
  timestamp?: string;
  payload: Record<string, unknown>;
}

export interface LogMessage {
  level: 'debug' | 'info' | 'warning' | 'error';
  source: 'dlt' | 'dbt' | 'system';
  message: string;
  job_id?: string;
  timestamp: string;
}

export interface DbtModel {
  name: string;
  path: string;
  materialization: string;
}
