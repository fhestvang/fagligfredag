const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Types
export interface SourceTableInfo {
  name: string;
  row_count: number;
  column_count: number;
  last_modified: string;
  primary_key: string;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SourceTableData {
  schema: {
    columns: ColumnSchema[];
    primary_key: string;
  };
  data: Record<string, unknown>[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface DagNode {
  id: string;
  unique_id: string;  // Same as id, for compatibility
  name: string;
  resource_type: string;
  package_name: string;
  schema_name?: string;
  depends_on: string[];
  dependents: string[];
  materialized?: string;
  materialization?: string;  // Alias for materialized
  layer: string;
  description?: string;
}

export interface DagEdge {
  source: string;
  target: string;
}

export interface Dag {
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface SelectorResult {
  selector: string;
  selected_nodes: string[];
  explanation: string;
}

export interface ModelPreview {
  node: DagNode;
  sample_data: Record<string, unknown>[];
  row_count: number;
  sql?: string;
}

export interface SnapshotInfo {
  id: string;
  timestamp: string;
  label: string;
  table_count: number;
}

export interface TableDiff {
  table_name: string;
  row_count_before: number;
  row_count_after: number;
  row_count_change: number;
  schema_changes: {
    name: string;
    change_type: string;
    old_type?: string;
    new_type?: string;
  }[];
  rows_added: number;
  rows_removed: number;
  rows_modified: number;
}

export interface DiffResult {
  snapshot_before: string;
  snapshot_after: string;
  table_diffs: TableDiff[];
  tables_added: string[];
  tables_removed: string[];
}

export interface AffectedModel {
  name: string;
  model_id: string;
  layer: string;
  severity: string;  // "high", "medium", "low"
  reason: string;
}

export interface SuggestedCommand {
  command: string;
  description: string;
  priority: number;
}

export interface ImpactAnalysis {
  source_table: string;
  has_changes: boolean;
  schema_changes: string[];
  row_count_change: number;
  affected_models: AffectedModel[];
  suggested_commands: SuggestedCommand[];
  summary: string;
}

// Source API
export const sourceApi = {
  listTables: () => fetchApi<SourceTableInfo[]>('/api/source/tables'),

  getTable: (tableName: string, limit = 100, offset = 0) =>
    fetchApi<SourceTableData>(`/api/source/tables/${tableName}?limit=${limit}&offset=${offset}`),

  saveTable: (tableName: string, tableData: unknown) =>
    fetchApi<{ success: boolean }>(`/api/source/tables/${tableName}`, {
      method: 'PUT',
      body: JSON.stringify(tableData),
    }),

  addRow: (tableName: string, data: Record<string, unknown>) =>
    fetchApi<{ success: boolean; row: Record<string, unknown> }>(
      `/api/source/tables/${tableName}/rows`,
      { method: 'POST', body: JSON.stringify({ data }) }
    ),

  updateRow: (tableName: string, pkValue: unknown, updates: Record<string, unknown>) =>
    fetchApi<{ success: boolean; row: Record<string, unknown> }>(
      `/api/source/tables/${tableName}/rows/${pkValue}`,
      { method: 'PUT', body: JSON.stringify({ updates }) }
    ),

  deleteRow: (tableName: string, pkValue: unknown) =>
    fetchApi<{ success: boolean }>(`/api/source/tables/${tableName}/rows/${pkValue}`, {
      method: 'DELETE',
    }),

  addColumn: (tableName: string, column: { name: string; type: string; nullable?: boolean; default_value?: unknown }) =>
    fetchApi<{ success: boolean }>(`/api/source/tables/${tableName}/columns`, {
      method: 'POST',
      body: JSON.stringify(column),
    }),

  removeColumn: (tableName: string, columnName: string) =>
    fetchApi<{ success: boolean }>(`/api/source/tables/${tableName}/columns/${columnName}`, {
      method: 'DELETE',
    }),

  syncToDuckDb: (tableName: string) =>
    fetchApi<{ success: boolean; rows_synced: number }>(`/api/source/tables/${tableName}/sync`, {
      method: 'POST',
    }),

  reloadFromDuckDb: (tableName: string, limit = 100) =>
    fetchApi<{ success: boolean; rows_loaded: number }>(
      `/api/source/reload?table_name=${tableName}&limit=${limit}`,
      { method: 'POST' }
    ),
};

// DAG API
export const dagApi = {
  getDag: () => fetchApi<Dag>('/api/dag/'),

  getSelector: (selector: string) =>
    fetchApi<SelectorResult>(`/api/dag/select?selector=${encodeURIComponent(selector)}`),

  getModelPreview: (modelName: string, limit = 10) =>
    fetchApi<ModelPreview>(`/api/dag/model/${modelName}?limit=${limit}`),
};

// Diff API
export const diffApi = {
  takeSnapshot: (label = '') =>
    fetchApi<{ id: string; timestamp: string; label: string }>(
      `/api/diff/snapshot?label=${encodeURIComponent(label)}`,
      { method: 'POST' }
    ),

  listSnapshots: () => fetchApi<SnapshotInfo[]>('/api/diff/snapshots'),

  deleteSnapshot: (snapshotId: string) =>
    fetchApi<{ success: boolean }>(`/api/diff/snapshots/${snapshotId}`, { method: 'DELETE' }),

  compare: (beforeId: string, afterId: string) =>
    fetchApi<DiffResult>(`/api/diff/compare?before_id=${beforeId}&after_id=${afterId}`, {
      method: 'POST',
    }),

  compareWithCurrent: (snapshotId: string) =>
    fetchApi<DiffResult>(`/api/diff/compare-current?snapshot_id=${snapshotId}`, { method: 'POST' }),
};

// Impact API
export const impactApi = {
  analyze: (params: { table_name: string; previous_schema?: Record<string, string> | null; previous_row_count?: number | null }) =>
    fetchApi<ImpactAnalysis>('/api/impact/analyze', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  cacheState: (tableName: string) =>
    fetchApi<{ success: boolean; cached_state: { schema: Record<string, string>; row_count: number; cached_at?: string } }>(
      `/api/impact/cache/${tableName}`,
      { method: 'POST' }
    ),

  getCachedState: (tableName: string) =>
    fetchApi<{ schema: Record<string, string>; row_count: number; cached_at?: string }>(`/api/impact/cache/${tableName}`),
};

// Data API (for reading transformed data from DuckDB)
export const dataApi = {
  getSchemas: () => fetchApi<string[]>('/api/data/schemas'),

  listTables: () =>
    fetchApi<{ name: string; schema: string; row_count: number }[]>('/api/data/tables'),

  getTables: (schema: string) =>
    fetchApi<{ name: string; schema_name: string; column_count: number; row_count?: number; table_type: string }[]>(
      `/api/data/tables/${schema}`
    ),

  queryTable: (tableName: string, limit = 100, offset = 0) => {
    const searchParams = new URLSearchParams({
      table: tableName,
      limit: String(limit),
      offset: String(offset),
    });

    return fetchApi<{
      data: Record<string, unknown>[];
      columns: { name: string; type: string }[];
      total_count: number;
    }>(`/api/data/query?${searchParams}`);
  },
};
