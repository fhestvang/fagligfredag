'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Table, ChevronRight, RefreshCw, Eye } from 'lucide-react';
import { dataApi } from '@/lib/api';

export default function DataPage() {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: schemas, isLoading: schemasLoading } = useQuery({
    queryKey: ['schemas'],
    queryFn: dataApi.getSchemas,
  });

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['tables', selectedSchema],
    queryFn: () => dataApi.getTables(selectedSchema!),
    enabled: !!selectedSchema,
  });

  const { data: queryResult, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ['table-data', selectedSchema, selectedTable, page],
    queryFn: () =>
      dataApi.queryTable({
        schema: selectedSchema!,
        table: selectedTable!,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    enabled: !!selectedSchema && !!selectedTable,
  });

  const totalPages = queryResult ? Math.ceil(queryResult.total_count / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Explorer</h1>
          <p className="text-sm text-gray-500">Browse all data layers (raw, staging, marts) - read-only view</p>
        </div>
        {selectedTable && (
          <button
            onClick={() => refetch()}
            className="flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Schema/Table Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
              <Database className="mr-2 h-4 w-4" />
              Schemas
            </h2>

            {schemasLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-1">
                {schemas?.map((schema) => (
                  <div key={schema}>
                    <button
                      onClick={() => {
                        setSelectedSchema(selectedSchema === schema ? null : schema);
                        setSelectedTable(null);
                        setPage(1);
                      }}
                      className={`flex w-full items-center rounded px-2 py-1.5 text-sm transition-colors ${
                        selectedSchema === schema
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronRight
                        className={`mr-1 h-4 w-4 transition-transform ${
                          selectedSchema === schema ? 'rotate-90' : ''
                        }`}
                      />
                      {schema}
                    </button>

                    {/* Tables under this schema */}
                    {selectedSchema === schema && (
                      <div className="ml-5 mt-1 space-y-1">
                        {tablesLoading ? (
                          <p className="text-xs text-gray-500">Loading tables...</p>
                        ) : (
                          tables?.map((table) => (
                            <button
                              key={table.name}
                              onClick={() => {
                                setSelectedTable(table.name);
                                setPage(1);
                              }}
                              className={`flex w-full items-center rounded px-2 py-1 text-sm transition-colors ${
                                selectedTable === table.name
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <Table className="mr-2 h-3 w-3" />
                              <span className="flex-1 truncate text-left">{table.name}</span>
                              {table.table_type === 'VIEW' && (
                                <span className="ml-1 text-xs text-yellow-600">(view)</span>
                              )}
                              <span className="ml-2 text-xs text-gray-400">
                                {table.row_count?.toLocaleString()}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-hidden rounded-lg bg-white shadow">
          {!selectedTable ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <Eye className="mb-2 h-8 w-8 text-gray-400" />
              <p>Select a table to view data</p>
              <p className="mt-1 text-xs text-gray-400">This is a read-only view. Use the Editor to modify data.</p>
            </div>
          ) : dataLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Loading data...
            </div>
          ) : queryResult ? (
            <div className="flex h-full flex-col">
              {/* Table Header Info */}
              <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                <div>
                  <span className="font-medium text-gray-900">
                    {selectedSchema}.{selectedTable}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({queryResult.total_count.toLocaleString()} rows)
                  </span>
                  {tables?.find(t => t.name === selectedTable)?.table_type === 'VIEW' && (
                    <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      VIEW
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {queryResult.columns.length} columns
                </span>
              </div>

              {/* Scrollable Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      {queryResult.columns.map((col) => (
                        <th
                          key={col.name}
                          className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium uppercase text-gray-500"
                        >
                          <div>{col.name}</div>
                          <div className="font-normal normal-case text-gray-400">
                            {col.type}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {queryResult.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {queryResult.columns.map((col) => (
                          <td
                            key={col.name}
                            className="max-w-xs whitespace-nowrap px-4 py-2 text-sm text-gray-900"
                          >
                            {row[col.name] === null ? (
                              <span className="text-gray-400">NULL</span>
                            ) : (
                              <span className="truncate" title={String(row[col.name] ?? '')}>
                                {String(row[col.name])}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
                <div className="text-sm text-gray-500">
                  Showing {(page - 1) * pageSize + 1} to{' '}
                  {Math.min(page * pageSize, queryResult.total_count)} of{' '}
                  {queryResult.total_count.toLocaleString()}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
