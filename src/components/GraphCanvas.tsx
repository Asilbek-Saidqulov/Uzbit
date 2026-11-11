'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_BBOX, GRAPH_COLORS, type Theme } from '@/lib/theme';
import { formatNumber } from '@/lib/format';
import type { Drawable } from '@/lib/relation';
import { identifyPointsOfInterest, sampleSegments, differentiate, type KeyPoint } from '@/lib/analysis';
import { traceZeroSet } from '@/lib/implicit';
import type { Point2D } from '@/lib/regression';

export type GraphItem = {
  id: string;
  label: string;
  color: string;
  relation: Drawable;
  stale: boolean;
  isParent?: boolean;
};

export type ActiveCard = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  tag: string;
  color: string;
  slope?: number;
  parentFunctionId?: string;
} | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const PICK_RADIUS_PX = 28;
const TAP_SLOP_PX = 8;
const SHADE_BLOCK_PX = 3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function userToScreen(x: number, y: number, board: Any): { left: number; top: number } {
  if (board.origin && board.origin.scrCoords) {
    return {
      left: board.origin.scrCoords[1] + x * board.unitX,
      top: board.origin.scrCoords[2] - y * board.unitY,
    };
  }
  const [xmin, ymax, xmax, ymin] = board.getBoundingBox();
  return {
    left: ((x - xmin) / (xmax - xmin)) * board.canvasWidth,
    top: ((ymax - y) / (ymax - ymin)) * board.canvasHeight,
  };
}

// Magnetic Snap: snaps to integers or key roots/vertices within 14px threshold
function snapToNearFeatures(val: number, pxPerUnit: number, keyXs: number[] = [], thresholdPx = 14): number {
  for (const kx of keyXs) {
    if (Math.abs(val - kx) * pxPerUnit <= thresholdPx) return kx;
  }
  const nearest = Math.round(val);
  if (Math.abs(val - nearest) * pxPerUnit <= thresholdPx) {
    return nearest;
  }
  return val;
}

const implicitTraceCache = new WeakMap<Function, Map<string, ReturnType<typeof traceZeroSet>>>();
function traceCached(
  fn: (x: number, y: number) => number,
  box: { xmin: number; xmax: number; ymin: number; ymax: number },
  nx: number,
  ny: number
) {
  let cache = implicitTraceCache.get(fn);
  if (!cache) {
    cache = new Map();
    implicitTraceCache.set(fn, cache);
  }
  const key = [box.xmin, box.xmax, box.ymin, box.ymax, nx, ny].join(',');
  const hit = cache.get(key);
  if (hit) return hit;
  const lines = traceZeroSet(fn, box, nx, ny);
  cache.set(key, lines);
  while (cache.size > 8) cache.delete(cache.keys().next().value!);
  return lines;
}

type Props = {
  items: GraphItem[];
  theme: Theme;
  showPointsOfInterest?: boolean;
  tablePoints?: Point2D[];
  shadedIntegrals?: { fn: (x: number) => number; a: number; b: number; color: string }[];
  onAddTangentAt?: (functionId: string, x: number) => void;
  onAddPerpendicularAt?: (functionId: string, x: number) => void;
  onInspectPoint?: (x: number, y: number) => void;
};

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawShading(
  canvas: HTMLCanvasElement,
  board: Any,
  width: number,
  height: number,
  items: GraphItem[],
  dark: boolean
) {
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.round(width * dpr);
  const ch = Math.round(height * dpr);
  if (canvas.width !== cw) canvas.width = cw;
  if (canvas.height !== ch) canvas.height = ch;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, cw, ch);

  const regions = items.filter((item) => item.relation.kind === 'region');
  if (regions.length === 0) return;

  const cols = Math.ceil(width / SHADE_BLOCK_PX);
  const rows = Math.ceil(height / SHADE_BLOCK_PX);
  const ox: number = board.origin.scrCoords[1];
  const oy: number = board.origin.scrCoords[2];
  const ux: number = board.unitX;
  const uy: number = board.unitY;

  const small = document.createElement('canvas');
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext('2d');
  if (!sctx) return;
  ctx.imageSmoothingEnabled = false;

  for (const item of regions) {
    if (item.relation.kind !== 'region') continue;
    const { F, op } = item.relation;
    const [r, g, b] = rgbOf(item.color);
    const alpha = item.stale ? 30 : dark ? 60 : 50;

    const img = sctx.createImageData(cols, rows);
    const data = img.data;

    for (let row = 0; row < rows; row++) {
      const y = (oy - (row + 0.5) * SHADE_BLOCK_PX) / uy;
      for (let col = 0; col < cols; col++) {
        const x = ((col + 0.5) * SHADE_BLOCK_PX - ox) / ux;
        const v = F(x, y);
        if (!Number.isFinite(v)) continue;

        const inside = op === '<' ? v < 0 : op === '<=' ? v <= 0 : op === '>' ? v > 0 : v >= 0;
        if (!inside) continue;

        const i = (row * cols + col) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = alpha;
      }
    }

    sctx.putImageData(img, 0, 0);
    ctx.drawImage(small, 0, 0, cw, ch);
  }
}

export default function GraphCanvas({
  items,
  theme,
  showPointsOfInterest = true,
  tablePoints = [],
  shadedIntegrals = [],
  onAddTangentAt,
  onAddPerpendicularAt,
  onInspectPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Any>(null);
  const itemsRef = useRef(items);
  const drawnRef = useRef<Any[]>([]);
  const bboxRef = useRef<number[]>([...DEFAULT_BBOX]);

  const [boardVersion, setBoardVersion] = useState(0);
  const [viewVersion, setViewVersion] = useState(0);
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);

  const detectedPOIsRef = useRef<KeyPoint[]>([]);
  const isDraggingGliderRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCard(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Board initialization & teardown
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const colors = GRAPH_COLORS[theme];
    let cancelled = false;
    let frame = 0;
    let board: Any = null;
    let jxg: Any = null;
    let resizeObserver: ResizeObserver | null = null;
    let down: { x: number; y: number } | null = null;

    const requestRedraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewVersion((v) => v + 1));
    };

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: PointerEvent) => {
      if (!down || !board) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;

      // If user was actively dragging the point glider, don't trigger click-dismissal
      if (isDraggingGliderRef.current) {
        isDraggingGliderRef.current = false;
        return;
      }
      if (moved > TAP_SLOP_PX) return;

      const [rawMx, my] = board.getUsrCoordsOfMouse(e);
      const [leftBound, top, rightBound, bottom] = board.getBoundingBox();
      const pxPerX = board.canvasWidth / (rightBound - leftBound);
      const pxPerY = board.canvasHeight / (top - bottom);

      const keyXs = detectedPOIsRef.current.map((p) => p.x);
      const mx = snapToNearFeatures(rawMx, pxPerX, keyXs, 14);

      const rect = el.getBoundingClientRect();
      const clickScrX = e.clientX - rect.left;
      const clickScrY = e.clientY - rect.top;

      // 1. Check if click landed on a Point of Interest (root, vertex, intercept, intersection)
      let nearestPOI: KeyPoint | null = null;
      let minPOIDist = PICK_RADIUS_PX;

      for (const poi of detectedPOIsRef.current) {
        const { left: px, top: py } = userToScreen(poi.x, poi.y, board);
        const dist = Math.hypot(clickScrX - px, clickScrY - py);
        if (dist <= minPOIDist) {
          minPOIDist = dist;
          nearestPOI = poi;
        }
      }

      if (nearestPOI) {
        let slope = 0;
        let parentId: string | undefined = undefined;

        for (const item of itemsRef.current) {
          const rel = item.relation;
          if (item.isParent && (rel.kind === 'explicit' || rel.kind === 'functionDef')) {
            parentId = item.id;
            const d = differentiate(rel.fn, nearestPOI.x);
            if (d.isDefined) slope = d.value;
            break;
          }
        }

        let cardColor = colors.ink;
        if (nearestPOI.kind === 'root') cardColor = '#2DD4BF';
        else if (nearestPOI.kind === 'minimum' || nearestPOI.kind === 'maximum') cardColor = '#D4FF3A';
        else if (nearestPOI.kind === 'intersection') cardColor = '#E7EAF1';

        setActiveCard({
          x: nearestPOI.x,
          y: nearestPOI.y,
          title: nearestPOI.label,
          subtitle: nearestPOI.description,
          tag: nearestPOI.approx ? 'Approximation' : 'Exact',
          color: cardColor,
          slope: Number.isFinite(slope) ? slope : 0,
          parentFunctionId: parentId,
        });
        return;
      }

      // 2. Check if click landed on a Curve (spawns draggable glider)
      let nearestCurveId: string | undefined = undefined;
      let nearestCurveLabel = 'y = f(x)';
      let nearestCurveColor = colors.ink;
      let nearestY = 0;
      let nearestSlope = 0;
      let minCurveDist = PICK_RADIUS_PX;

      for (const item of itemsRef.current) {
        const rel = item.relation;
        if ((rel.kind !== 'explicit' && rel.kind !== 'functionDef') || item.stale) continue;
        const cy = rel.fn(mx);
        if (!Number.isFinite(cy)) continue;
        const dist = Math.abs(cy - my) * pxPerY;
        if (dist <= minCurveDist) {
          minCurveDist = dist;
          nearestCurveId = item.id;
          nearestCurveLabel = item.label;
          nearestCurveColor = item.color;
          nearestY = cy;
          const d = differentiate(rel.fn, mx);
          nearestSlope = d.isDefined ? d.value : 0;
        }
      }

      if (nearestCurveId !== undefined) {
        const isSnapped = Math.abs(mx - Math.round(mx)) < 1e-4;
        setActiveCard({
          x: mx,
          y: nearestY,
          title: 'Curve Point',
          subtitle: nearestCurveLabel,
          tag: isSnapped ? 'Integer Snapped (Drag to scrub)' : 'Drag to scrub',
          color: nearestCurveColor,
          slope: Number.isFinite(nearestSlope) ? nearestSlope : 0,
          parentFunctionId: nearestCurveId,
        });
        return;
      }

      // 3. Clicked empty grid: dismiss card
      setActiveCard(null);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);

    (async () => {
      const mod: Any = await import('jsxgraph');
      if (cancelled) return;
      jxg = mod.default ?? mod;

      const axis = {
        strokeColor: colors.axis,
        strokeWidth: 1.5,
        highlight: false,
        withLabel: false,
        ticks: {
          strokeColor: colors.axis,
          drawLabels: true,
          label: { strokeColor: colors.label, fontSize: 12 },
        },
      };

      board = jxg.JSXGraph.initBoard(el, {
        boundingbox: bboxRef.current,
        keepaspectratio: true,
        axis: true,
        showCopyright: false,
        showNavigation: false,
        showInfobox: false,
        keyboard: { enabled: false },
        pan: { enabled: true, needTwoFingers: false, needShift: false },
        zoom: { wheel: true, pinch: true, needShift: false, factorX: 1.15, factorY: 1.15 },
        defaultAxes: { x: axis, y: axis },
      });

      board.create('grid', [], { strokeColor: colors.grid, strokeWidth: 1, highlight: false });

      board.on('boundingbox', () => {
        requestRedraw();
      });

      boardRef.current = board;

      resizeObserver = new ResizeObserver(() => {
        if (!el || !board) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w <= 0 || h <= 0) return;
        board.resizeContainer(w, h, false, false);
        board.setBoundingBox(board.getBoundingBox(), false);
        board.fullUpdate();
        requestRedraw();
      });
      resizeObserver.observe(el);

      setBoardVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      resizeObserver?.disconnect();
      if (board) {
        bboxRef.current = board.getBoundingBox();
        jxg.JSXGraph.freeBoard(board);
      }
      boardRef.current = null;
      drawnRef.current = [];
    };
  }, [theme]);

  // Shading behind board for inequality regions
  useEffect(() => {
    const board = boardRef.current;
    const canvas = shadeRef.current;
    const el = containerRef.current;
    if (!board || !canvas || !el) return;
    drawShading(canvas, board, el.clientWidth, el.clientHeight, items, theme === 'dark');
  }, [items, theme, boardVersion, viewVersion]);

  // Main board geometry drawing effect
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const colors = GRAPH_COLORS[theme];

    drawnRef.current.forEach((obj) => board.removeObject(obj));
    drawnRef.current = [];
    const keep = (obj: Any) => {
      drawnRef.current.push(obj);
      return obj;
    };

    const [xmin, ymax, xmax, ymin] = board.getBoundingBox();
    const span = ymax - ymin;
    const samples = clamp(Math.round(board.canvasWidth), 300, 1200);
    const gridX = clamp(Math.round(board.canvasWidth / 3), 100, 260);
    const gridY = clamp(Math.round(board.canvasHeight / 3), 100, 260);

    // Map of active JSXGraph curves for glider attachment
    const activeCurveObjects = new Map<string, Any>();

    // 1. Shaded Definite Integrals
    for (const intg of shadedIntegrals) {
      const startX = Math.min(intg.a, intg.b);
      const endX = Math.max(intg.a, intg.b);
      const steps = clamp(Math.round((endX - startX) * 40), 60, 400);
      const dx = (endX - startX) / steps;

      const xs: number[] = [startX];
      const ys: number[] = [0];

      for (let i = 0; i <= steps; i++) {
        const x = startX + i * dx;
        const y = intg.fn(x);
        xs.push(x);
        ys.push(Number.isFinite(y) ? y : 0);
      }
      xs.push(endX);
      ys.push(0);
      xs.push(startX);
      ys.push(0);

      keep(
        board.create('curve', [xs, ys], {
          strokeColor: intg.color,
          strokeWidth: 1.5,
          fillColor: intg.color,
          fillOpacity: 0.28,
          highlight: false,
          layer: 3,
        })
      );
    }

    // 2. Table Scatter Points
    for (const pt of tablePoints) {
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
      keep(
        board.create('point', [pt.x, pt.y], {
          size: 5,
          fillColor: '#2DD4BF',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          fixed: true,
          withLabel: true,
          label: {
            offset: [5, 10],
            fontSize: 10,
            strokeColor: colors.ink,
          },
          layer: 8,
        })
      );
    }

    // 3. Curves, Functions, Lines & Implicit Contours
    for (const item of items) {
      const rel = item.relation;
      const strict = rel.kind === 'region' && rel.op.length === 1;
      const style = {
        strokeColor: item.color,
        strokeWidth: 3,
        strokeOpacity: item.stale ? 0.4 : 1,
        dash: item.stale || strict ? 2 : 0,
        highlight: false,
        layer: 5,
      };

      if (rel.kind === 'vline') {
        keep(
          board.create(
            'line',
            [
              [rel.x, 0],
              [rel.x, 1],
            ],
            {
              ...style,
              straightFirst: true,
              straightLast: true,
              fixed: true,
              highlight: false,
              point1: { fixed: true, visible: false },
              point2: { fixed: true, visible: false },
            }
          )
        );
      } else if (rel.kind === 'explicit' || rel.kind === 'functionDef') {
        const segs = sampleSegments(rel.fn, xmin, xmax, span, samples);
        segs.forEach((seg, idx) => {
          const cObj = keep(board.create('curve', [seg.xs, seg.ys], style));
          if (idx === 0) activeCurveObjects.set(item.id, cObj);
        });
      } else {
        const box = { xmin, xmax, ymin, ymax };
        for (const line of traceCached(rel.F, box, gridX, gridY)) {
          if (line.xs.length === 1) {
            keep(
              board.create('point', [line.xs[0], line.ys[0]], {
                ...style,
                size: 4,
                face: 'o',
                fixed: true,
                withLabel: false,
                fillColor: item.color,
                strokeColor: item.color,
                layer: 6,
              })
            );
          } else {
            keep(board.create('curve', [line.xs, line.ys], style));
          }
        }
      }
    }

    // 4. Automatic Points of Interest (Functions + Inequality Boundaries + VLines)
    if (showPointsOfInterest) {
      const activeFunctions: { id: string; label: string; fn: (x: number) => number }[] = [];
      const activeVLines: { id: string; label: string; x: number }[] = [];

      for (const item of items) {
        if (item.stale) continue;
        const rel = item.relation;
        if (rel.kind === 'explicit' || rel.kind === 'functionDef') {
          activeFunctions.push({ id: item.id, label: item.label, fn: rel.fn });
        } else if (rel.kind === 'region') {
          const testY0 = rel.F(0, 0);
          const testY1 = rel.F(0, 1);
          if (Math.abs(testY1 - testY0 - 1) < 1e-4) {
            const boundaryFn = (x: number) => -rel.F(x, 0);
            activeFunctions.push({ id: item.id, label: item.label, fn: boundaryFn });
          }
        } else if (rel.kind === 'vline') {
          activeVLines.push({ id: item.id, label: item.label, x: rel.x });
        }
      }

      const detectedPOIs = identifyPointsOfInterest(activeFunctions, xmin, xmax, activeVLines);
      detectedPOIsRef.current = detectedPOIs;

      for (const poi of detectedPOIs) {
        let fillColor = colors.ink;
        let size = 4.5;

        if (poi.kind === 'root') fillColor = '#2DD4BF';
        else if (poi.kind === 'minimum' || poi.kind === 'maximum') fillColor = '#D4FF3A';
        else if (poi.kind === 'intersection') fillColor = '#E7EAF1';

        keep(
          board.create('point', [poi.x, poi.y], {
            size,
            fixed: true,
            withLabel: false,
            highlight: true,
            fillColor,
            strokeColor: colors.bg,
            strokeWidth: 1.5,
            layer: 7,
          })
        );
      }
    } else {
      detectedPOIsRef.current = [];
    }

    // 5. Interactive Draggable Glider on Active Inspected Point
    if (activeCard && Number.isFinite(activeCard.x)) {
      const curveItem = items.find((i) => i.id === activeCard.parentFunctionId);
      const isFunction = curveItem && (curveItem.relation.kind === 'explicit' || curveItem.relation.kind === 'functionDef');
      const jxgCurve = curveItem ? activeCurveObjects.get(curveItem.id) : null;

      if (isFunction && jxgCurve) {
        // Create an interactive JSXGraph glider locked to the curve
        const glider = board.create('glider', [activeCard.x, activeCard.y, jxgCurve], {
          size: 7,
          fixed: false,
          withLabel: false,
          fillColor: '#ffffff',
          strokeColor: activeCard.color || '#2DD4BF',
          strokeWidth: 3,
          layer: 9,
        });

        glider.on('drag', () => {
          isDraggingGliderRef.current = true;
          const [leftBound, , rightBound] = board.getBoundingBox();
          const pxPerX = board.canvasWidth / (rightBound - leftBound);
          const rawX = glider.X();

          // Snap to near integer or key feature points while dragging
          const keyXs = detectedPOIsRef.current.map((p) => p.x);
          const snappedX = snapToNearFeatures(rawX, pxPerX, keyXs, 12);
          const newY = (curveItem.relation as any).fn(snappedX);
          const slopeRes = differentiate((curveItem.relation as any).fn, snappedX);

          const isSnapped = Math.abs(snappedX - Math.round(snappedX)) < 1e-4;

          setActiveCard({
            x: snappedX,
            y: newY,
            title: 'Curve Point',
            subtitle: curveItem.label,
            tag: isSnapped ? 'Integer Snapped' : 'Draggable',
            color: activeCard.color,
            slope: slopeRes.isDefined ? slopeRes.value : 0,
            parentFunctionId: curveItem.id,
          });
        });

        keep(glider);
      } else {
        // Fallback for static intersection point / non-explicit curve
        keep(
          board.create('point', [activeCard.x, activeCard.y], {
            size: 7,
            fixed: true,
            withLabel: false,
            highlight: false,
            fillColor: '#ffffff',
            strokeColor: activeCard.color || '#2DD4BF',
            strokeWidth: 3,
            layer: 9,
          })
        );
      }
    }

    board.update();
  }, [
    items,
    theme,
    boardVersion,
    viewVersion,
    showPointsOfInterest,
    tablePoints,
    shadedIntegrals,
    activeCard?.parentFunctionId, // Only recreate board elements when switching curves, not on every scrub
  ]);

  const zoomIn = () => boardRef.current?.zoomIn();
  const zoomOut = () => boardRef.current?.zoomOut();
  const resetView = () => boardRef.current?.setBoundingBox([...DEFAULT_BBOX], false);

  const cardPos =
    activeCard && boardRef.current
      ? userToScreen(activeCard.x, activeCard.y, boardRef.current)
      : null;

  const isNearTop = cardPos ? cardPos.top < 90 : false;

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <canvas ref={shadeRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <div ref={containerRef} className="relative h-full w-full touch-none" />

      {/* Unified Point & Curve Inspector Card */}
      {activeCard && cardPos && (
        <div
          id="canvas-inspector-card"
          className="pointer-events-auto absolute z-30 flex flex-col gap-1.5 rounded-2xl border border-line bg-panel/95 p-3 text-xs shadow-2xl backdrop-blur transition-all"
          style={{
            left: cardPos.left,
            top: cardPos.top,
            transform: isNearTop ? 'translate(-50%, 15px)' : 'translate(-50%, -125%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold" style={{ color: activeCard.color }}>
              {activeCard.title}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted">{activeCard.tag}</span>
              <button
                type="button"
                onClick={() => setActiveCard(null)}
                aria-label="Close"
                className="btn btn-icon grid h-5 w-5 place-items-center"
              >
                ×
              </button>
            </div>
          </div>

          <p className="font-sans tabular-nums text-sm font-bold text-ink">
            ({formatNumber(activeCard.x)}, {formatNumber(activeCard.y)})
            {activeCard.slope !== undefined && (
              <span className="ml-2 font-normal text-muted">· Slope m = {formatNumber(activeCard.slope)}</span>
            )}
          </p>

          <p className="text-[11px] text-muted">{activeCard.subtitle}</p>

          <div className="mt-1 flex items-center gap-1.5 border-t border-line/60 pt-1.5">
            {activeCard.parentFunctionId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (activeCard.parentFunctionId) {
                      onAddTangentAt?.(activeCard.parentFunctionId, activeCard.x);
                    }
                  }}
                  className="btn btn-secondary btn-sm py-1"
                >
                  [+ Tangent Line]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeCard.parentFunctionId) {
                      onAddPerpendicularAt?.(activeCard.parentFunctionId, activeCard.x);
                    }
                  }}
                  className="btn btn-secondary btn-sm py-1"
                >
                  [+ Normal Line]
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onInspectPoint?.(activeCard.x, activeCard.y)}
              className="btn btn-secondary btn-sm py-1"
            >
              [+ Inspect]
            </button>
          </div>
        </div>
      )}

      {/* Viewport Zoom & Reset Controls */}
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border border-line bg-panel/95 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="btn btn-ghost grid h-9 w-9 place-items-center text-lg"
        >
          +
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="btn btn-secondary grid h-9 w-9 place-items-center text-lg"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset view"
          className="btn btn-secondary grid h-9 w-9 place-items-center text-sm"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}