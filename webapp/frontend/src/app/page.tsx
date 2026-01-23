'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, GitBranch, Layers, RefreshCw, RotateCcw } from 'lucide-react';
import { sourceApi, dagApi, diffApi } from '@/lib/api';
import SourceEditor from '@/components/source/SourceEditor';
import DagView from '@/components/dag/DagView';
import DataExplorer from '@/components/data/DataExplorer';
import ImpactPanel from '@/components/impact/ImpactPanel';

type Tab = 'source' | 'dag' | 'data';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('source');
  const [selectedTable, setSelectedTable] = useState<string>('trips');
  const [cachedState, setCachedState] = useState<{
    schema: Record<string, string>;
    row_count: number;
  } | null>(null);

  const { data: sourceTables, refetch: refetchSource } = useQuery({
    queryKey: ['source-tables'],
    queryFn: sourceApi.listTables,
  });

  const { refetch: refetchDag } = useQuery({
    queryKey: ['dag'],
    queryFn: dagApi.getDag,
    enabled: activeTab === 'dag',
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchSource(),
      refetchDag(),
    ]);
  };

  const handleReload = async () => {
    if (confirm('Reload source data from DuckDB? This will overwrite your edits.')) {
      await sourceApi.reloadFromDuckDb(selectedTable, 100);
      await refetchSource();
    }
  };

  const handleCacheState = async () => {
    const result = await sourceApi.getTable(selectedTable);
    const schema: Record<string, string> = {};
    result.schema.columns.forEach(col => {
      schema[col.name] = col.type;
    });
    setCachedState({
      schema,
      row_count: result.total_count,
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'source', label: 'Source Editor', icon: Database },
    { id: 'dag', label: 'DAG', icon: GitBranch },
    { id: 'data', label: 'Data Explorer', icon: Layers },
  ];

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">dbt Demo Platform</h1>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
            {sourceTables?.length || 0} source tables
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCacheState}
            className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            title="Cache current state for impact comparison"
          >
            Cache State
          </button>
          <button
            onClick={handleReload}
            className="flex items-center gap-2 rounded-md bg-orange-100 px-3 py-2 text-sm text-orange-700 hover:bg-orange-200"
          >
            <RotateCcw className="h-4 w-4" />
            Reload from DuckDB
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex border-b bg-white px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel - Main Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'source' && (
            <SourceEditor
              tableName={selectedTable}
              onTableChange={setSelectedTable}
            />
          )}
          {activeTab === 'dag' && <DagView />}
          {activeTab === 'data' && <DataExplorer />}
        </div>

        {/* Right Panel - Impact Analysis */}
        {activeTab === 'source' && (
          <div className="w-96 border-l bg-white">
            <ImpactPanel
              tableName={selectedTable}
              cachedState={cachedState}
            />
          </div>
        )}
      </main>
    </div>
  );
}
