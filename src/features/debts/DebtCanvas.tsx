import '@xyflow/react/dist/style.css';
import './debts.css';

import {
  Background,
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  useInternalNode,
  useReactFlow,
  type XYPosition,
} from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import type { DirectDebt } from '@/utils/directDebts';

import { DebtDetails } from './DebtDetails';

type PersonNode = Node<{ label: string; me: boolean }, 'person'>;
type DebtEdge = Edge<
  {
    debt: DirectDebt;
    label: string;
    heading: string;
    color: string;
    mutual: boolean;
    open: (id: string) => void;
  },
  'debt'
>;

function Person({ data }: NodeProps<PersonNode>) {
  return (
    <div className="debt-person" aria-label={data.label}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className={'debt-avatar ' + (data.me ? 'debt-avatar-me' : '')}>
        {data.label.slice(0, 2).toLocaleUpperCase()}
      </div>
      <div
        className="mt-2 truncate text-center text-sm font-semibold"
        title={data.label}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

function Connection({
  id,
  source,
  target,
  data,
  markerEnd,
}: EdgeProps<DebtEdge>) {
  const from = useInternalNode(source);
  const to = useInternalNode(target);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!from || !to || !data) return null;
  const a = {
    x: from.internals.positionAbsolute.x + 60,
    y: from.internals.positionAbsolute.y + 40,
  };
  const b = {
    x: to.internals.positionAbsolute.x + 60,
    y: to.internals.positionAbsolute.y + 40,
  };
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const bend = data.mutual ? 75 : 24;
  const control = {
    x: (a.x + b.x) / 2 - (dy / distance) * bend,
    y: (a.y + b.y) / 2 + (dx / distance) * bend,
  };
  const clip = (point: XYPosition) => {
    const len = Math.max(
      1,
      Math.hypot(control.x - point.x, control.y - point.y)
    );
    return {
      x: point.x + ((control.x - point.x) / len) * 46,
      y: point.y + ((control.y - point.y) / len) * 46,
    };
  };
  const start = clip(a),
    end = clip(b);
  const path =
    'M ' +
    start.x +
    ' ' +
    start.y +
    ' Q ' +
    control.x +
    ' ' +
    control.y +
    ' ' +
    end.x +
    ' ' +
    end.y;
  const fraction = data.mutual ? 0.65 : 0.5;
  const inverse = 1 - fraction;
  const x =
    inverse * inverse * start.x +
    2 * inverse * fraction * control.x +
    fraction * fraction * end.x;
  const y =
    inverse * inverse * start.y +
    2 * inverse * fraction * control.y +
    fraction * fraction * end.y;
  const show = () => {
    clearTimeout(timer.current);
    setHover(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(false), 150);
  };
  return (
    <>
      <g onMouseEnter={show} onMouseLeave={hide} onClick={() => data.open(id)}>
        <BaseEdge
          id={id}
          path={path}
          markerEnd={markerEnd}
          interactionWidth={28}
          style={{ stroke: data.color, strokeWidth: hover ? 3.5 : 2.5 }}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          className="debt-edge-label nodrag nopan"
          style={{
            transform:
              'translate(-50%, -50%) translate(' + x + 'px,' + y + 'px)',
            zIndex: hover ? 20 : 1,
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <button
            type="button"
            className="debt-amount"
            style={{ color: data.color }}
            aria-label={data.heading + ': ' + data.label}
            aria-haspopup="dialog"
            onFocus={show}
            onBlur={hide}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setHover(false);
            }}
            onClick={() => {
              setHover(false);
              data.open(id);
            }}
          >
            {data.label}
          </button>
          {hover && (
            <div role="tooltip" className="debt-tooltip">
              <p className="mb-3 font-semibold">{data.heading}</p>
              <DebtDetails debt={data.debt} compact />
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
const nodeTypes = { person: Person };
const edgeTypes = { debt: Connection };

function GraphControls({ layoutKey }: { layoutKey: string }) {
  const { t } = useTranslation();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.15, maxZoom: 1.3 });
    });
    return () => cancelAnimationFrame(frame);
  }, [layoutKey, fitView]);
  return (
    <Panel
      position="top-right"
      className="flex gap-1 rounded-md border bg-card p-1"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('Zoom in')}
        onClick={() => void zoomIn()}
      >
        <Plus />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('Zoom out')}
        onClick={() => void zoomOut()}
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void fitView({ padding: 0.25 })}
      >
        <Maximize />
        {t('Show everyone')}
      </Button>
    </Panel>
  );
}

export default function DebtCanvas({
  debts,
  userId,
  name,
  label,
  open,
}: {
  debts: DirectDebt[];
  userId: string;
  name: (id: string) => string;
  label: (debt: DirectDebt) => string;
  open: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(300, Math.round(entry.contentRect.width)))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const theme = useUIStore((state) => state.themeMode);
  const [positions, setPositions] = useState<Record<string, XYPosition>>({});
  const ids = [
    ...new Set([userId, ...debts.flatMap((debt) => [debt.from, debt.to])]),
  ];
  const key = JSON.stringify(ids.filter((id) => id !== userId).sort());
  const initial = (() => {
    const friends = JSON.parse(key) as string[];
    const center = (width - 120) / 2;
    const result: Record<string, XYPosition> = {
      [userId]: { x: center, y: 40 },
    };
    friends.forEach((id, index) => {
      if (friends.length <= 2)
        result[id] = {
          x: friends.length === 1 ? center : 10 + index * (width - 140),
          y: 320,
        };
      else {
        const angle = (Math.PI * 2 * index) / friends.length - Math.PI / 2;
        const radius = Math.max(240, friends.length * 30);
        result[id] = {
          x: center + Math.cos(angle) * radius,
          y: 290 + Math.sin(angle) * radius,
        };
      }
    });
    if (friends.length > 2) result[userId] = { x: center, y: 290 };
    return result;
  })();
  const nodes: PersonNode[] = ids.map((id) => ({
    id,
    type: 'person',
    position: positions[id] ?? initial[id],
    data: { label: name(id), me: id === userId },
  }));
  const pairs = new Set(
    debts.map((debt) => JSON.stringify([debt.from, debt.to]))
  );
  const edges: DebtEdge[] = debts.map((debt) => {
    const color =
      debt.to === userId
        ? 'var(--positive)'
        : debt.from === userId
          ? 'var(--destructive)'
          : 'var(--info)';
    return {
      id: debt.id,
      source: debt.from,
      target: debt.to,
      type: 'debt',
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
      data: {
        debt,
        label: label(debt),
        heading: name(debt.from) + ' → ' + name(debt.to),
        color,
        mutual: pairs.has(JSON.stringify([debt.to, debt.from])),
        open,
      },
    };
  });
  return (
    <div ref={container} className="debt-canvas h-[480px] sm:h-[580px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={1.8}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        onNodesChange={(changes) => {
          const moves = changes.filter(
            (change) => change.type === 'position' && change.position
          );
          if (moves.length)
            setPositions((old) => {
              const next = { ...old };
              for (const move of moves)
                if (move.type === 'position' && move.position)
                  next[move.id] = move.position;
              return next;
            });
        }}
      >
        <Background gap={24} size={1} color="var(--border)" />
        <GraphControls layoutKey={key + width} />
      </ReactFlow>
    </div>
  );
}
