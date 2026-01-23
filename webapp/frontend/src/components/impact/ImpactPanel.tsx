'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Table,
  Columns,
  Rows,
  Terminal,
} from 'lucide-react';
import { impactApi, diffApi, type ImpactAnalysis } from '@/lib/api';

interface ImpactPanelProps {
  tableName: string;
}

export default function ImpactPanel({ tableName }: ImpactPanelProps) {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['changes', 'affected', 'commands'])
  );

  const { data: cachedState } = useQuery({
    queryKey: ['cached-state', tableName],
    queryFn: () => impactApi.getCachedState(tableName).catch(() => null),
    enabled: !!tableName,
  });

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['impact-analysis', tableName],
    queryFn: () =>
      impactApi.analyze({
        table_name: tableName,
        previous_schema: cachedState?.schema || null,
        previous_row_count: cachedState?.row_count || null,
      }),
    enabled: !!tableName && !!cachedState,
  });

  const cacheMutation = useMutation({
    mutationFn: () => impactApi.cacheState(tableName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cached-state', tableName] });
      queryClient.invalidateQueries({ queryKey: ['impact-analysis', tableName] });
    },
  });

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!tableName) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Select a source table to see impact analysis
      </div>
    );
  }

  if (!cachedState) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-600">
          <AlertTriangle className="inline h-4 w-4 mr-1 text-yellow-500" />
          No cached state for <strong>{tableName}</strong>
        </div>
        <p className="text-xs text-gray-500">
          Cache the current state to track changes and see impact analysis.
        </p>
        <button
          onClick={() => cacheMutation.mutate()}
          disabled={cacheMutation.isPending}
          className="flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${cacheMutation.isPending ? 'animate-spin' : ''}`} />
          Cache Current State
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 sticky top-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Impact Analysis</h3>
          <button
            onClick={() => refetch()}
            className="text-gray-500 hover:text-gray-700"
            title="Refresh analysis"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Comparing against cached state from{' '}
          {cachedState.cached_at
            ? new Date(cachedState.cached_at).toLocaleString()
            : 'unknown'}
        </p>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-gray-500">Analyzing changes...</div>
      ) : analysis ? (
        <div className="divide-y">
          {/* Changes Detected */}
          <div className="p-4">
            <button
              onClick={() => toggleSection('changes')}
              className="flex items-center gap-2 w-full text-left font-medium mb-3"
            >
              {expandedSections.has('changes') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Changes Detected
              {analysis.has_changes ? (
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                  Modified
                </span>
              ) : (
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                  No Changes
                </span>
              )}
            </button>

            {expandedSections.has('changes') && analysis.has_changes && (
              <div className="space-y-3 text-sm">
                {/* Schema Changes */}
                {analysis.schema_changes && analysis.schema_changes.length > 0 && (
                  <div className="bg-purple-50 rounded-md p-3">
                    <div className="flex items-center gap-2 font-medium text-purple-700 mb-2">
                      <Columns className="h-4 w-4" />
                      Schema Changes
                    </div>
                    <ul className="space-y-1 text-purple-600">
                      {analysis.schema_changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-purple-400">-</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Row Changes */}
                {analysis.row_count_change !== 0 && (
                  <div className="bg-blue-50 rounded-md p-3">
                    <div className="flex items-center gap-2 font-medium text-blue-700 mb-2">
                      <Rows className="h-4 w-4" />
                      Row Count Change
                    </div>
                    <p className="text-blue-600">
                      {analysis.row_count_change > 0 ? '+' : ''}
                      {analysis.row_count_change} rows (
                      {cachedState.row_count} → {cachedState.row_count + analysis.row_count_change})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Affected Models */}
          <div className="p-4">
            <button
              onClick={() => toggleSection('affected')}
              className="flex items-center gap-2 w-full text-left font-medium mb-3"
            >
              {expandedSections.has('affected') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Affected Models
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {analysis.affected_models?.length || 0}
              </span>
            </button>

            {expandedSections.has('affected') && analysis.affected_models && (
              <div className="space-y-2">
                {analysis.affected_models.length === 0 ? (
                  <p className="text-sm text-gray-500">No downstream models affected</p>
                ) : (
                  analysis.affected_models.map((model) => (
                    <div
                      key={model.name}
                      className={`rounded-md p-2 text-sm ${getSeverityColor(model.severity)}`}
                    >
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        <span className="font-medium">{model.name}</span>
                        <span className="ml-auto text-xs capitalize">{model.severity}</span>
                      </div>
                      {model.reason && (
                        <p className="text-xs mt-1 opacity-80">{model.reason}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Suggested Commands */}
          <div className="p-4">
            <button
              onClick={() => toggleSection('commands')}
              className="flex items-center gap-2 w-full text-left font-medium mb-3"
            >
              {expandedSections.has('commands') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Terminal className="h-4 w-4" />
              Suggested Commands
            </button>

            {expandedSections.has('commands') && analysis.suggested_commands && (
              <div className="space-y-2">
                {analysis.suggested_commands.length === 0 ? (
                  <p className="text-sm text-gray-500">No commands suggested</p>
                ) : (
                  analysis.suggested_commands.map((cmd, i) => (
                    <div
                      key={i}
                      className="group flex items-center gap-2 bg-gray-900 rounded-md p-2"
                    >
                      <code className="flex-1 text-xs text-green-400 font-mono">
                        {cmd.command}
                      </code>
                      <button
                        onClick={() => copyCommand(cmd.command)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                        title="Copy command"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Run these commands in your VS Code terminal to apply changes
                </p>
              </div>
            )}
          </div>

          {/* Update Cache Button */}
          <div className="p-4">
            <button
              onClick={() => cacheMutation.mutate()}
              disabled={cacheMutation.isPending}
              className="flex items-center justify-center gap-2 w-full rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${cacheMutation.isPending ? 'animate-spin' : ''}`} />
              Update Cached State
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-500">
          Unable to analyze changes. Try refreshing.
        </div>
      )}
    </div>
  );
}
