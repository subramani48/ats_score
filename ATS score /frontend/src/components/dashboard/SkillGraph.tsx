'use client';

import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface SkillGraphProps {
  domain: string;
  matchedKeywords: string[];
  missingKeywords: string[];
}

const COLORS = {
  domain:   { bg: '#6366f1', text: '#fff', border: '#4f46e5' },
  matched:  { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  missing:  { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
};

function buildGraph(domain: string, matched: string[], missing: string[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Center domain node
  nodes.push({
    id: 'domain',
    data: { label: domain },
    position: { x: 300, y: 250 },
    style: {
      background: COLORS.domain.bg,
      color: COLORS.domain.text,
      border: `2px solid ${COLORS.domain.border}`,
      borderRadius: 12,
      fontWeight: 700,
      fontSize: 13,
      padding: '10px 18px',
      minWidth: 120,
      textAlign: 'center',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  // Matched keywords — left side
  const matchedSlice = matched.slice(0, 12);
  matchedSlice.forEach((kw, i) => {
    const id = `matched-${i}`;
    const total = matchedSlice.length;
    const angle = (i / total) * Math.PI - Math.PI / 2;
    const r = 180;
    nodes.push({
      id,
      data: { label: kw },
      position: { x: 300 + Math.cos(angle - Math.PI) * r - 80, y: 250 + Math.sin(angle - Math.PI) * r - 15 },
      style: {
        background: COLORS.matched.bg,
        color: COLORS.matched.text,
        border: `1.5px solid ${COLORS.matched.border}`,
        borderRadius: 20,
        fontSize: 11,
        padding: '5px 12px',
        fontWeight: 500,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
    edges.push({
      id: `e-domain-${id}`,
      source: 'domain',
      target: id,
      animated: false,
      style: { stroke: COLORS.matched.border, strokeWidth: 1.5, opacity: 0.6 },
      type: 'smoothstep',
    });
  });

  // Missing keywords — right side
  const missingSlice = missing.slice(0, 10);
  missingSlice.forEach((kw, i) => {
    const id = `missing-${i}`;
    const total = missingSlice.length;
    const angle = (i / total) * Math.PI - Math.PI / 2;
    const r = 180;
    nodes.push({
      id,
      data: { label: kw },
      position: { x: 300 + Math.cos(angle) * r + 30, y: 250 + Math.sin(angle) * r - 15 },
      style: {
        background: COLORS.missing.bg,
        color: COLORS.missing.text,
        border: `1.5px solid ${COLORS.missing.border}`,
        borderRadius: 20,
        fontSize: 11,
        padding: '5px 12px',
        fontWeight: 500,
      },
      sourcePosition: Position.Left,
      targetPosition: Position.Right,
    });
    edges.push({
      id: `e-domain-${id}`,
      source: 'domain',
      target: id,
      animated: true,
      style: { stroke: COLORS.missing.border, strokeWidth: 1.5, opacity: 0.5, strokeDasharray: '4 3' },
      type: 'smoothstep',
    });
  });

  return { nodes, edges };
}

export default function SkillGraph({ domain, matchedKeywords, missingKeywords }: SkillGraphProps) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(domain, matchedKeywords, missingKeywords),
    [domain, matchedKeywords, missingKeywords],
  );

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView();
  }, []);

  return (
    <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit as Parameters<typeof ReactFlow>[0]['onInit']}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d1d5db" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) =>
            String(n.id) === 'domain' ? '#6366f1' :
            String(n.id).startsWith('matched') ? '#10b981' : '#ef4444'
          }
          maskColor="rgba(0,0,0,0.1)"
          style={{ borderRadius: 8 }}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-xs pointer-events-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-gray-600 dark:text-gray-400">Matched ({matchedKeywords.slice(0, 12).length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-gray-600 dark:text-gray-400">Missing ({missingKeywords.slice(0, 10).length})</span>
        </div>
      </div>
    </div>
  );
}
