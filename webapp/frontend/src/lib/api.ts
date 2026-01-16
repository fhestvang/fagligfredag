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

// Data endpoints
export const dataApi = {
  getSchemas: () => fetchApi<string[]>('/api/data/schemas'),

  getTables: (schema: string) =>
    fetchApi<{ name: string; schema_name: string; column_count: number; row_count?: number; table_type: string }[]>(
      `/api/data/tables/${schema}`
    ),

  getTableSchema: (schema: string, table: string) =>
    fetchApi<{ name: string; type: string; nullable: boolean }[]>(
      `/api/data/schema/${schema}/${table}`
    ),

  queryTable: (params: {
    schema: string;
    table: string;
    limit?: number;
    offset?: number;
    order_by?: string;
    order_dir?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams({
      schema: params.schema,
      table: params.table,
      limit: String(params.limit || 100),
      offset: String(params.offset || 0),
    });
    if (params.order_by) searchParams.set('order_by', params.order_by);
    if (params.order_dir) searchParams.set('order_dir', params.order_dir);

    return fetchApi<{
      data: Record<string, unknown>[];
      columns: { name: string; type: string }[];
      total_count: number;
      page: number;
      page_size: number;
    }>(`/api/data/query?${searchParams}`);
  },

  updateRecord: (data: {
    schema_name: string;
    table_name: string;
    pk_column: string;
    pk_value: unknown;
    updates: Record<string, unknown>;
  }) => fetchApi<{ success: boolean; message: string }>('/api/data/update', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  insertRecord: (data: {
    schema_name: string;
    table_name: string;
    data: Record<string, unknown>;
  }) => fetchApi<{ success: boolean; message: string }>('/api/data/insert', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteRecord: (data: {
    schema_name: string;
    table_name: string;
    pk_column: string;
    pk_value: unknown;
  }) => fetchApi<{ success: boolean; message: string }>('/api/data/delete', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Pipeline endpoints
export const pipelineApi = {
  run: (params: {
    year: number;
    month: number;
    taxi_type: string;
    write_disposition: string;
    row_limit?: number;
  }) => fetchApi<{
    job_id: string;
    job_type: string;
    status: string;
    message?: string;
  }>('/api/pipeline/run', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getStatus: (jobId: string) => fetchApi<{
    job_id: string;
    status: string;
    message?: string;
  }>(`/api/pipeline/status/${jobId}`),

  getJobs: () => fetchApi<{
    job_id: string;
    job_type: string;
    status: string;
    started_at?: string;
    ended_at?: string;
  }[]>('/api/pipeline/jobs'),

  cancel: (jobId: string) => fetchApi<{ success: boolean; message: string }>(
    `/api/pipeline/cancel/${jobId}`,
    { method: 'POST' }
  ),
};

// dbt endpoints
export const dbtApi = {
  run: (params: {
    command: string;
    select?: string;
    full_refresh?: boolean;
  }) => fetchApi<{
    job_id: string;
    job_type: string;
    status: string;
  }>('/api/dbt/run', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getStatus: (jobId: string) => fetchApi<{
    job_id: string;
    status: string;
    message?: string;
  }>(`/api/dbt/status/${jobId}`),

  getModels: () => fetchApi<{
    name: string;
    path: string;
    materialization: string;
  }[]>('/api/dbt/models'),
};
