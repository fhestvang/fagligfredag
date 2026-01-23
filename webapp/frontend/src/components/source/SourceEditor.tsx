'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, X, Edit2, Columns, Upload } from 'lucide-react';
import { sourceApi, type SourceTableData } from '@/lib/api';

interface SourceEditorProps {
  tableName: string;
  onTableChange: (name: string) => void;
}

export default function SourceEditor({ tableName, onTableChange }: SourceEditorProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, unknown>>({});
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', type: 'VARCHAR' });
  const pageSize = 50;

  const { data: tables } = useQuery({
    queryKey: ['source-tables'],
    queryFn: sourceApi.listTables,
  });

  const { data: tableData, isLoading, refetch } = useQuery({
    queryKey: ['source-table', tableName, page],
    queryFn: () => sourceApi.getTable(tableName, pageSize, page * pageSize),
    enabled: !!tableName,
  });

  const updateMutation = useMutation({
    mutationFn: ({ pk, updates }: { pk: unknown; updates: Record<string, unknown> }) =>
      sourceApi.updateRow(tableName, pk, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-table'] });
      setEditingRow(null);
      setEditedValues({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pk: unknown) => sourceApi.deleteRow(tableName, pk),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-table'] });
    },
  });

  const addRowMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => sourceApi.addRow(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-table'] });
      setIsAddingRow(false);
      setNewRowValues({});
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: (column: { name: string; type: string }) =>
      sourceApi.addColumn(tableName, column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-table'] });
      setIsAddingColumn(false);
      setNewColumn({ name: '', type: 'VARCHAR' });
    },
  });

  const removeColumnMutation = useMutation({
    mutationFn: (columnName: string) => sourceApi.removeColumn(tableName, columnName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-table'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => sourceApi.syncToDuckDb(tableName),
    onSuccess: (result) => {
      alert(`Synced ${result.rows_synced} rows to DuckDB`);
    },
  });

  const pk = tableData?.schema.primary_key || 'id';
  const columns = tableData?.schema.columns || [];
  const totalPages = tableData ? Math.ceil(tableData.total_count / pageSize) : 0;

  const startEditing = (rowIndex: number, row: Record<string, unknown>) => {
    setEditingRow(rowIndex);
    setEditedValues({ ...row });
  };

  const saveEdit = (row: Record<string, unknown>) => {
    const pkValue = row[pk];
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editedValues)) {
      if (value !== row[key]) {
        changes[key] = value;
      }
    }
    if (Object.keys(changes).length > 0) {
      updateMutation.mutate({ pk: pkValue, updates: changes });
    } else {
      setEditingRow(null);
    }
  };

  const handleAddRow = () => {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(newRowValues)) {
      if (value !== '' && value !== null) {
        data[key] = value;
      }
    }
    addRowMutation.mutate(data);
  };

  // Generate mock data based on first row and column types
  const generateMockData = (): Record<string, unknown> => {
    const mockData: Record<string, unknown> = {};
    const firstRow = tableData?.data[0];

    for (const col of columns) {
      // Skip primary key - let backend generate it
      if (col.name === pk) {
        continue;
      }

      // Try to use first row value as template, otherwise generate based on type
      if (firstRow && firstRow[col.name] !== null && firstRow[col.name] !== undefined) {
        const val = firstRow[col.name];
        // Slightly modify numeric values to make them unique
        if (typeof val === 'number') {
          mockData[col.name] = val + Math.floor(Math.random() * 10);
        } else if (typeof val === 'string' && val.includes('T') && val.includes(':')) {
          // Looks like a timestamp - use current time
          mockData[col.name] = new Date().toISOString();
        } else {
          mockData[col.name] = val;
        }
      } else {
        // Generate based on column type
        const colType = col.type.toLowerCase();
        if (colType.includes('int') || colType.includes('bigint')) {
          mockData[col.name] = Math.floor(Math.random() * 100);
        } else if (colType.includes('double') || colType.includes('float') || colType.includes('decimal')) {
          mockData[col.name] = Math.round(Math.random() * 100 * 100) / 100;
        } else if (colType.includes('bool')) {
          mockData[col.name] = true;
        } else if (colType.includes('timestamp') || colType.includes('date')) {
          mockData[col.name] = new Date().toISOString();
        } else {
          mockData[col.name] = `sample_${col.name}`;
        }
      }
    }

    return mockData;
  };

  const startAddingRow = () => {
    const mockData = generateMockData();
    setNewRowValues(mockData);
    setIsAddingRow(true);
  };

  const handleDeleteColumn = (columnName: string) => {
    if (confirm(`Remove column "${columnName}"? This cannot be undone.`)) {
      removeColumnMutation.mutate(columnName);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Selector & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={tableName}
            onChange={(e) => onTableChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {tables?.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.row_count} rows)
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {columns.length} columns | PK: {pk}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex items-center gap-1 rounded-md bg-purple-100 px-3 py-2 text-sm text-purple-700 hover:bg-purple-200"
          >
            <Columns className="h-4 w-4" />
            Add Column
          </button>
          <button
            onClick={startAddingRow}
            className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-2 text-sm text-green-700 hover:bg-green-200"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Sync to DuckDB
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {isAddingColumn && (
        <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
          <h3 className="mb-3 font-medium text-purple-900">Add New Column</h3>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Column name"
              value={newColumn.name}
              onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={newColumn.type}
              onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="VARCHAR">VARCHAR</option>
              <option value="BIGINT">BIGINT</option>
              <option value="DOUBLE">DOUBLE</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="TIMESTAMP">TIMESTAMP</option>
            </select>
            <button
              onClick={() => addColumnMutation.mutate(newColumn)}
              disabled={!newColumn.name || addColumnMutation.isPending}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingColumn(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : tableData ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-24 px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.name}
                        className="group px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <div>{col.name}</div>
                            <div className="font-normal normal-case text-gray-400">
                              {col.type}
                            </div>
                          </div>
                          {col.name !== pk && (
                            <button
                              onClick={() => handleDeleteColumn(col.name)}
                              className="hidden rounded p-1 text-red-500 hover:bg-red-100 group-hover:block"
                              title="Remove column"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {/* Add Row Form */}
                  {isAddingRow && (
                    <tr className="bg-green-50">
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={handleAddRow}
                            disabled={addRowMutation.isPending}
                            className="rounded p-1 text-green-600 hover:bg-green-100"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingRow(false);
                              setNewRowValues({});
                            }}
                            className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      {columns.map((col) => (
                        <td key={col.name} className="px-4 py-2">
                          <input
                            type="text"
                            placeholder={col.name}
                            value={String(newRowValues[col.name] ?? '')}
                            onChange={(e) =>
                              setNewRowValues((prev) => ({
                                ...prev,
                                [col.name]: e.target.value || null,
                              }))
                            }
                            className="w-full min-w-[80px] rounded border border-green-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                      ))}
                    </tr>
                  )}
                  {/* Data Rows */}
                  {tableData.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {editingRow === rowIndex ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(row)}
                              disabled={updateMutation.isPending}
                              className="rounded p-1 text-green-600 hover:bg-green-100"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRow(null);
                                setEditedValues({});
                              }}
                              className="rounded p-1 text-gray-600 hover:bg-gray-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditing(rowIndex, row)}
                              className="rounded p-1 text-blue-600 hover:bg-blue-100"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this row?')) {
                                  deleteMutation.mutate(row[pk]);
                                }
                              }}
                              className="rounded p-1 text-red-600 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.name}
                          className="max-w-xs px-4 py-2 text-sm text-gray-900"
                        >
                          {editingRow === rowIndex ? (
                            <input
                              type="text"
                              value={String(editedValues[col.name] ?? '')}
                              onChange={(e) =>
                                setEditedValues((prev) => ({
                                  ...prev,
                                  [col.name]: e.target.value || null,
                                }))
                              }
                              className="w-full min-w-[80px] rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : row[col.name] === null ? (
                            <span className="text-gray-400">NULL</span>
                          ) : (
                            <span className="truncate" title={String(row[col.name])}>
                              {String(row[col.name]).slice(0, 50)}
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
                Showing {page * pageSize + 1} to{' '}
                {Math.min((page + 1) * pageSize, tableData.total_count)} of{' '}
                {tableData.total_count}
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
                  Page {page + 1} of {totalPages || 1}
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
          </>
        ) : (
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data found
          </div>
        )}
      </div>
    </div>
  );
}
