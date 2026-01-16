'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Table, ChevronRight, RefreshCw, Edit2, Save, X, Trash2, Plus, PenSquare } from 'lucide-react';
import { dataApi } from '@/lib/api';

export default function EditorPage() {
  const queryClient = useQueryClient();
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, unknown>>({});
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

  // Filter to only show BASE TABLEs (editable tables)
  const editableTables = tables?.filter(t => t.table_type === 'BASE TABLE') || [];

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

  const updateMutation = useMutation({
    mutationFn: dataApi.updateRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
      setEditingRow(null);
      setEditedValues({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dataApi.deleteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
    },
  });

  const insertMutation = useMutation({
    mutationFn: dataApi.insertRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setIsAddingRow(false);
      setNewRowValues({});
    },
  });

  const totalPages = queryResult ? Math.ceil(queryResult.total_count / pageSize) : 0;

  // Find the primary key column (assume first column or 'unique_id' or 'id')
  const getPkColumn = () => {
    if (!queryResult) return 'id';
    const cols = queryResult.columns.map(c => c.name);
    if (cols.includes('unique_id')) return 'unique_id';
    if (cols.includes('id')) return 'id';
    return cols[0];
  };

  const startEditing = (rowIndex: number, row: Record<string, unknown>) => {
    setEditingRow(rowIndex);
    setEditedValues({ ...row });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditedValues({});
  };

  const saveEdit = (row: Record<string, unknown>) => {
    const pkColumn = getPkColumn();
    const pkValue = row[pkColumn];

    // Get only changed values
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editedValues)) {
      if (value !== row[key]) {
        changes[key] = value;
      }
    }

    if (Object.keys(changes).length === 0) {
      cancelEditing();
      return;
    }

    updateMutation.mutate({
      schema_name: selectedSchema!,
      table_name: selectedTable!,
      pk_column: pkColumn,
      pk_value: pkValue,
      updates: changes,
    });
  };

  const deleteRow = (row: Record<string, unknown>) => {
    if (!confirm('Are you sure you want to delete this row?')) return;

    const pkColumn = getPkColumn();
    deleteMutation.mutate({
      schema_name: selectedSchema!,
      table_name: selectedTable!,
      pk_column: pkColumn,
      pk_value: row[pkColumn],
    });
  };

  const startAddingRow = () => {
    setIsAddingRow(true);
    // Initialize with empty values for all columns
    const initial: Record<string, unknown> = {};
    queryResult?.columns.forEach(col => {
      initial[col.name] = '';
    });
    setNewRowValues(initial);
  };

  const cancelAddingRow = () => {
    setIsAddingRow(false);
    setNewRowValues({});
  };

  const saveNewRow = () => {
    // Filter out empty strings and convert to appropriate types
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(newRowValues)) {
      if (value !== '' && value !== null) {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      alert('Please fill in at least one field');
      return;
    }

    insertMutation.mutate({
      schema_name: selectedSchema!,
      table_name: selectedTable!,
      data: data,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Editor</h1>
          <p className="text-sm text-gray-500">Edit raw source tables to demonstrate schema evolution and incremental loads</p>
        </div>
        {selectedTable && (
          <div className="flex items-center gap-2">
            <button
              onClick={startAddingRow}
              disabled={isAddingRow}
              className="flex items-center rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Schema/Table Sidebar - Only BASE TABLEs */}
        <div className="w-64 flex-shrink-0">
          <div className="rounded-lg bg-white p-4 shadow">
            <h2 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
              <Database className="mr-2 h-4 w-4" />
              Editable Tables
            </h2>
            <p className="mb-3 text-xs text-gray-500">Only raw source tables are shown</p>

            {schemasLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-1">
                {schemas?.map((schema) => {
                  // Check if this schema has any editable tables
                  const hasEditableTables = selectedSchema === schema ? editableTables.length > 0 : true;

                  return (
                    <div key={schema}>
                      <button
                        onClick={() => {
                          setSelectedSchema(selectedSchema === schema ? null : schema);
                          setSelectedTable(null);
                          setPage(1);
                          setEditingRow(null);
                          setIsAddingRow(false);
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

                      {/* Tables under this schema - only BASE TABLEs */}
                      {selectedSchema === schema && (
                        <div className="ml-5 mt-1 space-y-1">
                          {tablesLoading ? (
                            <p className="text-xs text-gray-500">Loading tables...</p>
                          ) : editableTables.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No editable tables in this schema</p>
                          ) : (
                            editableTables.map((table) => (
                              <button
                                key={table.name}
                                onClick={() => {
                                  setSelectedTable(table.name);
                                  setPage(1);
                                  setEditingRow(null);
                                  setIsAddingRow(false);
                                }}
                                className={`flex w-full items-center rounded px-2 py-1 text-sm transition-colors ${
                                  selectedTable === table.name
                                    ? 'bg-green-100 text-green-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <Table className="mr-2 h-3 w-3" />
                                <span className="flex-1 truncate text-left">{table.name}</span>
                                <span className="ml-2 text-xs text-gray-400">
                                  {table.row_count?.toLocaleString()}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Data Table with Edit Capabilities */}
        <div className="flex-1 overflow-hidden rounded-lg bg-white shadow">
          {!selectedTable ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <PenSquare className="mb-2 h-8 w-8 text-gray-400" />
              <p>Select a table to edit data</p>
              <p className="mt-1 text-xs text-gray-400">Add, edit, or delete rows in raw source tables</p>
            </div>
          ) : dataLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Loading data...
            </div>
          ) : queryResult ? (
            <div className="flex h-full flex-col">
              {/* Table Header Info */}
              <div className="flex items-center justify-between border-b bg-green-50 px-4 py-3">
                <div>
                  <span className="font-medium text-gray-900">
                    {selectedSchema}.{selectedTable}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({queryResult.total_count.toLocaleString()} rows)
                  </span>
                  <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                    EDITABLE
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {queryResult.columns.length} columns
                  </span>
                  <span className="text-xs text-gray-400">
                    Click <Edit2 className="inline h-3 w-3" /> to edit a row
                  </span>
                </div>
              </div>

              {/* Scrollable Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="w-24 px-2 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Actions
                      </th>
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
                    {/* New Row Form */}
                    {isAddingRow && (
                      <tr className="bg-green-50">
                        <td className="whitespace-nowrap px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={saveNewRow}
                              disabled={insertMutation.isPending}
                              className="rounded p-1 text-green-600 hover:bg-green-100"
                              title="Save New Row"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelAddingRow}
                              className="rounded p-1 text-gray-600 hover:bg-gray-100"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        {queryResult.columns.map((col) => (
                          <td key={col.name} className="whitespace-nowrap px-4 py-2">
                            <input
                              type="text"
                              placeholder={col.name}
                              value={String(newRowValues[col.name] ?? '')}
                              onChange={(e) =>
                                setNewRowValues((prev) => ({
                                  ...prev,
                                  [col.name]: e.target.value,
                                }))
                              }
                              className="w-full min-w-[100px] rounded border border-green-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                        ))}
                      </tr>
                    )}
                    {queryResult.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-2 py-2">
                          {editingRow === rowIndex ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit(row)}
                                disabled={updateMutation.isPending}
                                className="rounded p-1 text-green-600 hover:bg-green-100"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="rounded p-1 text-gray-600 hover:bg-gray-100"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditing(rowIndex, row)}
                                className="rounded p-1 text-blue-600 hover:bg-blue-100"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteRow(row)}
                                disabled={deleteMutation.isPending}
                                className="rounded p-1 text-red-600 hover:bg-red-100"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        {queryResult.columns.map((col) => (
                          <td
                            key={col.name}
                            className="max-w-xs whitespace-nowrap px-4 py-2 text-sm text-gray-900"
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
                                className="w-full min-w-[100px] rounded border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : row[col.name] === null ? (
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
