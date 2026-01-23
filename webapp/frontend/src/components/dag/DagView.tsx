'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { dagApi, type DagNode } from '@/lib/api';
import { Play, Eye, ChevronRight, ChevronLeft } from 'lucide-react';

const layerColors: Record<string, string> = {
  source: '#94a3b8',
  raw: '#f97316',
  staging: '#eab308',
  intermediate: '#22c55e',
  marts: '#3b82f6',
};

const layerOrder = ['source', 'raw', 'staging', 'intermediate', 'marts'];

export default function DagView() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectorInput, setSelectorInput] = useState('');
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

  const { data: dagData, isLoading } = useQuery({
    queryKey: ['dag'],
    queryFn: dagApi.getDag,
  });

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['model-preview', selectedNode],
    queryFn: () => (selectedNode ? dagApi.getModelPreview(selectedNode) : null),
    enabled: !!selectedNode && showPreview,
  });

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!dagData) return { nodes: [], edges: [] };

    // Group nodes by layer for positioning
    const nodesByLayer: Record<string, DagNode[]> = {};
    for (const node of dagData.nodes) {
      const layer = node.layer || 'unknown';
      if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
      nodesByLayer[layer].push(node);
    }

    // Create flow nodes with positions
    const nodes: Node[] = [];
    const xSpacing = 250;
    const ySpacing = 80;

    layerOrder.forEach((layer, layerIndex) => {
      const layerNodes = nodesByLayer[layer] || [];
      layerNodes.forEach((node, nodeIndex) => {
        const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(node.unique_id);
        const isSelected = selectedNode === node.unique_id;

        nodes.push({
          id: node.unique_id,
          position: { x: layerIndex * xSpacing, y: nodeIndex * ySpacing },
          data: {
            label: (
              <div
                className={`px-3 py-2 rounded-md border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 shadow-lg'
                    : isHighlighted
                      ? 'border-gray-300'
                      : 'border-gray-200 opacity-30'
                }`}
                style={{
                  backgroundColor: isHighlighted ? layerColors[layer] || '#64748b' : '#e5e7eb',
                }}
              >
                <div className="text-xs font-medium text-white truncate max-w-[150px]">
                  {node.name}
                </div>
                {node.materialization && (
                  <div className="text-[10px] text-white/70">{node.materialization}</div>
                )}
              </div>
            ),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      });
    });

    // Create edges
    const edges: Edge[] = dagData.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: highlightedNodes.size > 0 && highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target),
      style: {
        stroke:
          highlightedNodes.size === 0 ||
          (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target))
            ? '#64748b'
            : '#e5e7eb',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color:
          highlightedNodes.size === 0 ||
          (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target))
            ? '#64748b'
            : '#e5e7eb',
      },
    }));

    return { nodes, edges };
  }, [dagData, highlightedNodes, selectedNode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes/edges when data changes
  useMemo(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setShowPreview(true);
  }, []);

  const handleSelectorDemo = async (selector: string) => {
    try {
      const result = await dagApi.getSelector(selector);
      setHighlightedNodes(new Set(result.selected_nodes));
    } catch {
      setHighlightedNodes(new Set());
    }
  };

  const clearHighlight = () => {
    setHighlightedNodes(new Set());
    setSelectorInput('');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading DAG...
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main DAG View */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.3}
          maxZoom={2}
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs">
          <div className="font-medium mb-2">Layers</div>
          {layerOrder.map((layer) => (
            <div key={layer} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: layerColors[layer] }}
              />
              <span className="capitalize">{layer}</span>
            </div>
          ))}
        </div>

        {/* Selector Demo Panel */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-4 w-72">
          <h3 className="font-medium mb-3">dbt Selector Demo</h3>

          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={selectorInput}
                onChange={(e) => setSelectorInput(e.target.value)}
                placeholder="e.g., +fct_trips"
                className="flex-1 rounded border px-2 py-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSelectorDemo(selectorInput)}
              />
              <button
                onClick={() => handleSelectorDemo(selectorInput)}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                <Play className="h-4 w-4" />
              </button>
            </div>
            {highlightedNodes.size > 0 && (
              <button
                onClick={clearHighlight}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-medium text-gray-700">Quick Examples:</div>
            <button
              onClick={() => {
                setSelectorInput('fct_trips');
                handleSelectorDemo('fct_trips');
              }}
              className="block w-full text-left rounded bg-gray-100 px-2 py-1 hover:bg-gray-200"
            >
              <code>fct_trips</code>
              <span className="text-gray-500 ml-2">- just this model</span>
            </button>
            <button
              onClick={() => {
                setSelectorInput('+fct_trips');
                handleSelectorDemo('+fct_trips');
              }}
              className="block w-full text-left rounded bg-gray-100 px-2 py-1 hover:bg-gray-200"
            >
              <code>+fct_trips</code>
              <span className="text-gray-500 ml-2">- upstream deps</span>
            </button>
            <button
              onClick={() => {
                setSelectorInput('fct_trips+');
                handleSelectorDemo('fct_trips+');
              }}
              className="block w-full text-left rounded bg-gray-100 px-2 py-1 hover:bg-gray-200"
            >
              <code>fct_trips+</code>
              <span className="text-gray-500 ml-2">- downstream deps</span>
            </button>
            <button
              onClick={() => {
                setSelectorInput('+fct_trips+');
                handleSelectorDemo('+fct_trips+');
              }}
              className="block w-full text-left rounded bg-gray-100 px-2 py-1 hover:bg-gray-200"
            >
              <code>+fct_trips+</code>
              <span className="text-gray-500 ml-2">- both directions</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && selectedNode && (
        <div className="w-96 border-l bg-white overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-medium truncate">{selectedNode.split('.').pop()}</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : previewData ? (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* SQL */}
              <div>
                <h4 className="text-sm font-medium mb-2">SQL</h4>
                <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto max-h-40">
                  {previewData.sql || 'No SQL available'}
                </pre>
              </div>

              {/* Sample Data */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Sample Data ({previewData.row_count} rows total)
                </h4>
                {previewData.sample_data && previewData.sample_data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(previewData.sample_data[0]).map((col) => (
                            <th key={col} className="border px-2 py-1 text-left">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sample_data.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="border px-2 py-1">
                                {val === null ? (
                                  <span className="text-gray-400">NULL</span>
                                ) : (
                                  String(val).slice(0, 30)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No data available</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a model to see details
            </div>
          )}
        </div>
      )}
    </div>
  );
}
