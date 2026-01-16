'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, RefreshCw, TestTube, Loader2 } from 'lucide-react';
import { pipelineApi, dbtApi } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LogStream } from '@/components/monitoring/LogStream';

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  // Pipeline form state
  const [year, setYear] = useState(2023);
  const [month, setMonth] = useState(1);
  const [taxiType, setTaxiType] = useState<'yellow' | 'green' | 'fhv' | 'fhvhv'>('yellow');
  const [writeDisposition, setWriteDisposition] = useState<'replace' | 'merge' | 'append'>('replace');
  const [rowLimit, setRowLimit] = useState(10000);

  // dbt form state
  const [dbtCommand, setDbtCommand] = useState<'run' | 'test' | 'build'>('run');
  const [dbtSelect, setDbtSelect] = useState('');
  const [fullRefresh, setFullRefresh] = useState(false);

  // Mutations
  const runPipeline = useMutation({
    mutationFn: pipelineApi.run,
    onSuccess: (data) => {
      subscribe(data.job_id);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const runDbt = useMutation({
    mutationFn: dbtApi.run,
    onSuccess: (data) => {
      subscribe(data.job_id);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleRunPipeline = () => {
    runPipeline.mutate({
      year,
      month,
      taxi_type: taxiType,
      write_disposition: writeDisposition,
      row_limit: rowLimit,
    });
  };

  const handleRunDbt = () => {
    runDbt.mutate({
      command: dbtCommand,
      select: dbtSelect || undefined,
      full_refresh: fullRefresh,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pipeline Control</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* dlt Pipeline Card */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
            <Play className="mr-2 h-5 w-5 text-blue-600" />
            dlt Pipeline
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2009}
                  max={2024}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Month</label>
                <input
                  type="number"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  min={1}
                  max={12}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Taxi Type</label>
              <select
                value={taxiType}
                onChange={(e) => setTaxiType(e.target.value as typeof taxiType)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="yellow">Yellow Taxi</option>
                <option value="green">Green Taxi</option>
                <option value="fhv">For-Hire Vehicle</option>
                <option value="fhvhv">High-Volume FHV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Write Disposition
                <span className="ml-2 text-xs text-gray-500">
                  (How to handle existing data)
                </span>
              </label>
              <div className="mt-2 space-y-2">
                {[
                  { value: 'replace', label: 'Replace', desc: 'Drop and recreate table' },
                  { value: 'merge', label: 'Merge', desc: 'Upsert based on primary key' },
                  { value: 'append', label: 'Append', desc: 'Add without deduplication' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center rounded-lg border p-3 transition-colors ${
                      writeDisposition === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="writeDisposition"
                      value={option.value}
                      checked={writeDisposition === option.value}
                      onChange={(e) => setWriteDisposition(e.target.value as typeof writeDisposition)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Row Limit</label>
              <input
                type="number"
                value={rowLimit}
                onChange={(e) => setRowLimit(Number(e.target.value))}
                min={100}
                max={1000000}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleRunPipeline}
              disabled={runPipeline.isPending}
              className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
            >
              {runPipeline.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run dlt Pipeline
            </button>
          </div>
        </div>

        {/* dbt Card */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
            <RefreshCw className="mr-2 h-5 w-5 text-green-600" />
            dbt Transformations
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Command</label>
              <select
                value={dbtCommand}
                onChange={(e) => setDbtCommand(e.target.value as typeof dbtCommand)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="run">Run (build models)</option>
                <option value="test">Test (run tests)</option>
                <option value="build">Build (run + test)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Model Selection
                <span className="ml-2 text-xs text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={dbtSelect}
                onChange={(e) => setDbtSelect(e.target.value)}
                placeholder="e.g., staging.* or fct_daily_trips+"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={fullRefresh}
                onChange={(e) => setFullRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-600"
              />
              <span className="ml-2 text-sm text-gray-700">Full refresh (rebuild tables)</span>
            </label>

            <button
              onClick={handleRunDbt}
              disabled={runDbt.isPending}
              className="flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:bg-green-400"
            >
              {runDbt.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : dbtCommand === 'test' ? (
                <TestTube className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Run dbt {dbtCommand}
            </button>
          </div>
        </div>
      </div>

      {/* Log Stream */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Live Logs</h2>
        <LogStream />
      </div>
    </div>
  );
}
