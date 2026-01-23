'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Table, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { dataApi } from '@/lib/api';

interface TableInfo {
  name: string;
  schema: string;
  row_count: number;
}

const layerConfig: Record<string, { color: string; order: number }> = {
  source: { color: 'bg-slate-500', order: 0 },
  nyc_taxi_raw: { color: 'bg-orange-500', order: 1 },
  main_raw: { color: 'bg-orange-500', order: 1 },
  main_staging: { color: 'bg-yellow-500', order: 2 },
  main_intermediate: { color: 'bg-green-500', order: 3 },
  main_marts: { color: 'bg-blue-500', order: 4 },
  main: { color: 'bg-gray-500', order: 5 },
};

export default function DataExplorer() {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['main_marts']));
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['data-tables'],
    queryFn: dataApi.listTables,
  });

  const { data: tableData, isLoading: dataLoading } = useQuery({
    queryKey: ['table-data', selectedTable, page],
    queryFn: () =>
      selectedTable ? dataApi.queryTable(selectedTable, pageSize, page * pageSize) : null,
    enabled: !!selectedTable,
  });

  // Group tables by schema
  const tablesBySchema = (tables || []).reduce(
    (acc, table) => {
      const schema = table.schema || 'default';
      if (!acc[schema]) acc[schema] = [];
      acc[schema].push(table);
      return acc;
    },
    {} as Record<string, TableInfo[]>
  );

  // Sort schemas by layer order
  const sortedSchemas = Object.keys(tablesBySchema).sort((a, b) => {
    const orderA = layerConfig[a]?.order ?? 99;
    const orderB = layerConfig[b]?.order ?? 99;
    return orderA - orderB;
  });

  const toggleSchema = (schema: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schema)) {
      newExpanded.delete(schema);
    } else {
      newExpanded.add(schema);
    }
    setExpandedSchemas(newExpanded);
  };

  const selectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(0);
  };

  const getSchemaDisplayName = (schema: string): string => {
    const parts = schema.split('_');
    if (parts.length > 1 && parts[0] === 'main') {
      return parts.slice(1).join('_');
    }
    return schema;
  };

  const totalPages = tableData ? Math.ceil(tableData.total_count / pageSize) : 0;

  return (
    <div className="flex h-full">
      {/* Sidebar - Schema/Table Tree */}
      <div className="w-64 border-r bg-gray-50 overflow-y-auto">
        <div className="p-3 border-b bg-white">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Database className="h-4 w-4" />
            DuckDB Explorer
          </div>
        </div>

        {tablesLoading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="p-2">
            {sortedSchemas.map((schema) => (
              <div key={schema} className="mb-1">
                <button
                  onClick={() => toggleSchema(schema)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-200 text-sm"
                >
                  {expandedSchemas.has(schema) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div
                    className={`w-2 h-2 rounded-full ${layerConfig[schema]?.color || 'bg-gray-400'}`}
                  />
                  <span className="font-medium">{getSchemaDisplayName(schema)}</span>
                  <span className="text-gray-400 text-xs ml-auto">
                    {tablesBySchema[schema].length}
                  </span>
                </button>

                {expandedSchemas.has(schema) && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {tablesBySchema[schema].map((table) => (
                      <button
                        key={table.name}
                        onClick={() => selectTable(table.name)}
                        className={`flex items-center gap-2 w-full px-2 py-1 rounded text-sm ${
                          selectedTable === table.name
                            ? 'bg-blue-100 text-blue-700'
                            : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <Table className="h-3 w-3" />
                        <span className="truncate">{table.name.split('.').pop()}</span>
                        <span className="text-gray-400 text-xs ml-auto">
                          {table.row_count?.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content - Table Data */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTable ? (
          <>
            {/* Header */}
            <div className="border-b bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">{selectedTable}</h2>
                  {tableData && (
                    <p className="text-sm text-gray-500">
                      {tableData.total_count.toLocaleString()} rows |{' '}
                      {tableData.columns?.length || 0} columns
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto">
              {dataLoading ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Loading data...
                </div>
              ) : tableData && tableData.data.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {tableData.columns?.map((col) => (
                        <th
                          key={col.name}
                          className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500"
                        >
                          <div>{col.name}</div>
                          <div className="font-normal normal-case text-gray-400">{col.type}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {tableData.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {tableData.columns?.map((col) => (
                          <td
                            key={col.name}
                            className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate"
                          >
                            {row[col.name] === null ? (
                              <span className="text-gray-400">NULL</span>
                            ) : (
                              String(row[col.name]).slice(0, 100)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No data found
                </div>
              )}
            </div>

            {/* Pagination */}
            {tableData && tableData.total_count > pageSize && (
              <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
                <div className="text-sm text-gray-500">
                  Showing {page * pageSize + 1} to{' '}
                  {Math.min((page + 1) * pageSize, tableData.total_count)} of{' '}
                  {tableData.total_count.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-500">
            <Layers className="h-12 w-12 mb-4 text-gray-300" />
            <p>Select a table to view data</p>
            <p className="text-sm mt-2">
              Browse through the data layers from source to marts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
