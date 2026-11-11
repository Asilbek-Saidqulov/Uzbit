'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import ExpressionList, { type Row, type TableData, type CalculusChildren } from '@/components/ExpressionList';
import GraphCanvas, { type GraphItem } from '@/components/GraphCanvas';
import { labelOf, parseRelation, type Drawable, type ParseResult, type RowStatus } from '@/lib/relation';
import type { ExprEnv, UserFunc } from '@/lib/expr';
import { fitLinear, fitQuadratic, fitExponential, type Point2D, type RegressionResult } from '@/lib/regression';
import { differentiate } from '@/lib/analysis';
import QuadraticInspector from './QuadraticInspector';
import { PALETTE, type Theme } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/lib/useTheme';
import { Undo2, Redo2, Share2, Download } from 'lucide-react';

const DEBOUNCE_MS = 160;

interface GraphingLabProps {
  theme?: Theme;
  onToggleTheme?: () => void;
  initialExpression?: string;
  /** Reports the first expression's text so the page header can show it. One-way: never fed back into initialExpression. */
  onPrimaryExpressionChange?: (text: string) => void;
}

export default function GraphingLab({
  theme: propTheme,
  onToggleTheme: propToggleTheme,
  initialExpression,
  onPrimaryExpressionChange,
}: GraphingLabProps = {}) {
  const localThemeHook = useTheme();
  const theme = propTheme ?? localThemeHook.theme;
  const toggleTheme = propToggleTheme ?? localThemeHook.toggleTheme;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [showPOIs, setShowPOIs] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const nextId = useRef(2);
  const nextColor = useRef(1);
  const makeRow = (text = '', type: 'expression' | 'table' = 'expression'): Row => ({
    id: `r${nextId.current++}`,
    type,
    text,
    color: PALETTE[nextColor.current++ % PALETTE.length],
    visible: true,
    table:
      type === 'table'
        ? {
            rawRows: [
              { x: '', y: '' },
              { x: '', y: '' },
            ],
            points: [],
            model: 'linear',
          }
        : undefined,
  });

  const [rows, setRows] = useState<Row[]>([
    {
      id: 'r1',
      type: 'expression',
      text: '',
      color: PALETTE[0],
      visible: true,
      calculus: {
        derivative: { visible: true, color: '#D4FF3A' },
        integral: { visible: true, a: 0, b: 2, showShading: true, color: '#2DD4BF' },
      },
    },
  ]);

  // History Stack for Undo/Redo
  const [past, setPast] = useState<Row[][]>([]);
  const [future, setFuture] = useState<Row[][]>([]);
  const rowsRef = useRef<Row[]>(rows);
  const lastCommittedSnapshot = useRef<string>(JSON.stringify(rows));

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const commitToHistory = useCallback((newRows: Row[]) => {
    const currentStr = JSON.stringify(rowsRef.current);
    const newStr = JSON.stringify(newRows);
    if (currentStr === newStr) return;

    setPast((prev) => [...prev.slice(-30), rowsRef.current]);
    setFuture([]);
    lastCommittedSnapshot.current = newStr;
    rowsRef.current = newRows;
  }, []);

  useEffect(() => {
    if (initialExpression) {
      setRows((prev) => {
        const existing = prev.find((r) => r.text === initialExpression);
        if (existing) {
          setFocusId(existing.id);
          return prev;
        }
        const newRow = makeRow(initialExpression);
        const next = [newRow, ...prev];
        commitToHistory(next);
        setFocusId(newRow.id);
        return next;
      });
    }
  }, [initialExpression, commitToHistory]);

  const [focusId, setFocusId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(34);
  const dragRef = useRef<{ pointerId: number } | null>(null);

  const [good, setGood] = useState<Record<string, Drawable>>({});

  const debounced = useDebouncedValue(rows, DEBOUNCE_MS);

  useEffect(() => {
    const serialized = JSON.stringify(debounced);
    if (serialized !== lastCommittedSnapshot.current) {
      try {
        const prevSnapshot: Row[] = JSON.parse(lastCommittedSnapshot.current);
        setPast((prev) => [...prev.slice(-30), prevSnapshot]);
        setFuture([]);
        lastCommittedSnapshot.current = serialized;
      } catch {
        lastCommittedSnapshot.current = serialized;
      }
    }
  }, [debounced]);

  // Parse expressions & register user functions
  const parsed = useMemo(() => {
    const map = new Map<string, ParseResult>();
    const env: ExprEnv = { vars: {}, funcs: {} };

    for (const row of debounced) {
      if (row.type === 'table') continue;
      const r = parseRelation(row.text, env);
      map.set(row.id, r);

      if (r.status === 'ok') {
        if (r.value.kind === 'variable') {
          env.vars![r.value.name] = r.value.value;
        } else if (r.value.kind === 'functionDef') {
          env.funcs![r.value.name] = r.value.fn as UserFunc;
        }
      }
    }
    return map;
  }, [debounced]);

  useEffect(() => {
    setGood((prev) => {
      const next: Record<string, Drawable> = {};
      for (const row of debounced) {
        if (row.type === 'table') continue;
        const r = parsed.get(row.id);
        if (r?.status === 'ok' && r.value.kind !== 'variable') {
          next[row.id] = r.value as Drawable;
        } else if (r?.status === 'error' && prev[row.id]) {
          next[row.id] = prev[row.id];
        }
      }
      return next;
    });
  }, [debounced, parsed]);

  const statuses = useMemo(() => {
    const out: Record<string, RowStatus> = {};
    for (const row of debounced) {
      if (row.type === 'table') continue;
      const r = parsed.get(row.id);
      if (!r || r.status === 'empty') {
        out[row.id] = { kind: 'empty' };
      } else if (r.status === 'ok') {
        out[row.id] = {
          kind: 'ok',
          label: labelOf(r.value),
          relation: r.value,
          unboundVars: r.unboundVars,
        };
      } else {
        out[row.id] = { kind: 'error', message: r.message, stale: good[row.id] };
      }
    }
    return out;
  }, [debounced, parsed, good]);

  // Generate all items on the canvas (parent curves, regression lines, derivative, tangent, perpendicular, inverse)
  const items = useMemo<GraphItem[]>(() => {
    const out: GraphItem[] = [];

    for (const row of debounced) {
      if (!row.visible) continue;

      // 1. Table Regression Curve
      if (row.type === 'table' && row.table && row.table.model !== 'none') {
        let fit: RegressionResult | null = null;
        if (row.table.model === 'linear') fit = fitLinear(row.table.points);
        else if (row.table.model === 'quadratic') fit = fitQuadratic(row.table.points);
        else if (row.table.model === 'exponential') fit = fitExponential(row.table.points);

        if (fit) {
          out.push({
            id: `reg-${row.id}`,
            label: fit.equation,
            color: row.color,
            relation: { kind: 'explicit', fn: fit.fn },
            stale: false,
          });
        }
        continue;
      }

      // 2. Parent Equation (Explicit or FunctionDef)
      const s = statuses[row.id];
      if (!s) continue;
      if (s.kind === 'ok') {
        const rel = s.relation;
        if (rel.kind !== 'variable') {
          out.push({
            id: row.id,
            label: row.text.trim(),
            color: row.color,
            relation: rel as Drawable,
            stale: false,
            isParent: true,
          });
        }

        const isFunction = rel.kind === 'explicit' || rel.kind === 'functionDef';
        const funcRef = isFunction ? rel.fn : null;

        if (funcRef) {
          // 3. Child Derivative Curve
          if (row.calculus?.derivative?.visible) {
            out.push({
              id: `deriv-${row.id}`,
              label: `f′(x)`,
              color: row.calculus.derivative.color,
              relation: { kind: 'explicit', fn: (x) => differentiate(funcRef, x).value },
              stale: false,
            });
          }

          // 4. Child Tangent Line
          if (row.calculus?.tangent?.visible) {
            const tX = row.calculus.tangent.x;
            const tY = funcRef(tX);
            const tM = differentiate(funcRef, tX).value;
            if (Number.isFinite(tM) && Number.isFinite(tY)) {
              out.push({
                id: `tangent-${row.id}`,
                label: `Tangent at x=${tX}`,
                color: row.calculus.tangent.color,
                relation: { kind: 'explicit', fn: (x) => tY + tM * (x - tX) },
                stale: false,
              });
            }
          }

          // 5. Child Perpendicular (Normal) Line (meets tangent at 90°)
          if (row.calculus?.perpendicular?.visible) {
            const pX = row.calculus.perpendicular.x;
            const pY = funcRef(pX);
            const m = differentiate(funcRef, pX).value;
            if (Number.isFinite(m) && Number.isFinite(pY)) {
              if (Math.abs(m) < 1e-7) {
                // If tangent is horizontal, normal line is vertical: x = pX
                out.push({
                  id: `perp-${row.id}`,
                  label: `Normal at x=${pX}`,
                  color: row.calculus.perpendicular.color,
                  relation: { kind: 'vline', x: pX },
                  stale: false,
                });
              } else {
                const perpM = -1 / m;
                out.push({
                  id: `perp-${row.id}`,
                  label: `Normal at x=${pX}`,
                  color: row.calculus.perpendicular.color,
                  relation: { kind: 'explicit', fn: (x) => pY + perpM * (x - pX) },
                  stale: false,
                });
              }
            }
          }

          // 6. Child Inverse (Reverse Function: reflection across y = x)
          if (row.calculus?.inverse?.visible) {
            // Symmetry axis: y = x (dashed)
            out.push({
              id: `sym-axis-${row.id}`,
              label: 'Line of symmetry: y = x',
              color: '#94a3b8',
              relation: { kind: 'explicit', fn: (x) => x },
              stale: false,
            });

            // Reflected inverse curve: F(x, y) = x - f(y) = 0
            out.push({
              id: `inverse-${row.id}`,
              label: `f⁻¹(x) [Reverse]`,
              color: row.calculus.inverse.color,
              relation: { kind: 'implicit', F: (x, y) => x - funcRef(y) },
              stale: false,
            });
          }
        }
      }
    }

    return out;
  }, [debounced, statuses]);

  // Shaded area integrals
  const shadedIntegrals = useMemo(() => {
    return debounced.flatMap((row) => {
      if (!row.visible || row.type === 'table' || !row.calculus?.integral?.visible) return [];
      const s = statuses[row.id];
      if (!s || s.kind !== 'ok') return [];
      const rel = s.relation;
      if (rel.kind !== 'explicit' && rel.kind !== 'functionDef') return [];
      return [
        {
          fn: rel.fn,
          a: row.calculus.integral.a,
          b: row.calculus.integral.b,
          color: row.calculus.integral.color,
        },
      ];
    });
  }, [debounced, statuses]);

  // Table scatter points
  const allTableScatterPoints = useMemo<Point2D[]>(() => {
    return debounced.flatMap((row) => {
      if (row.type === 'table' && row.visible && row.table) {
        return row.table.points;
      }
      return [];
    });
  }, [debounced]);

  // Undo / Redo Actions
  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, -1);

      setFuture((prevFuture) => [rowsRef.current, ...prevFuture]);
      setRows(previous);
      rowsRef.current = previous;
      lastCommittedSnapshot.current = JSON.stringify(previous);
      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast((prevPast) => [...prevPast, rowsRef.current]);
      setRows(next);
      rowsRef.current = next;
      lastCommittedSnapshot.current = JSON.stringify(next);
      return newFuture;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'math-field') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleUpdateTable = (id: string, table: TableData) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, type: 'table' as const, table } : r));
      commitToHistory(next);
      return next;
    });
  };

  const handleUpdateCalculus = (id: string, calculus: CalculusChildren) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, calculus } : r));
      commitToHistory(next);
      return next;
    });
  };

  const toggleRow = (id: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r));
    commitToHistory(next);
    setRows(next);
  };

  const changeRowColor = (id: string, color: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, color } : r));
    commitToHistory(next);
    setRows(next);
  };

  const addRow = (text = '', type: 'expression' | 'table' = 'expression', afterId?: string) => {
    const row = makeRow(text, type);
    const index = afterId ? rows.findIndex((r) => r.id === afterId) : -1;
    const next =
      index === -1
        ? [...rows, row]
        : [...rows.slice(0, index + 1), row, ...rows.slice(index + 1)];
    commitToHistory(next);
    setRows(next);
    setFocusId(row.id);
  };

  const removeRow = (id: string) => {
    let next: Row[];
    if (rows.length === 1) {
      next = [{ ...rows[0], type: 'expression', text: '', table: undefined, calculus: undefined }];
    } else {
      const index = rows.findIndex((r) => r.id === id);
      const neighbor = rows[index - 1] ?? rows[index + 1];
      if (neighbor) setFocusId(neighbor.id);
      next = rows.filter((r) => r.id !== id);
    }
    commitToHistory(next);
    setRows(next);
  };

  const moveFocus = (id: string, delta: -1 | 1) => {
    const index = rows.findIndex((r) => r.id === id);
    const target = rows[index + delta];
    if (target) setFocusId(target.id);
  };

  const openSheet = () => {
    setFocusId(rows[rows.length - 1]?.id ?? null);
    setSheetOpen(true);
  };

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // HUD Actions from Canvas: Add Tangent or Perpendicular Normal Line
  const handleAddTangentFromHUD = (functionId: string, x: number) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id === functionId) {
          return {
            ...r,
            calculus: {
              ...r.calculus,
              tangent: { visible: true, x: Math.round(x * 100) / 100, color: '#E7EAF1' },
            },
          };
        }
        return r;
      });
      commitToHistory(next);
      return next;
    });
  };

  const handleAddPerpendicularFromHUD = (functionId: string, x: number) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id === functionId) {
          return {
            ...r,
            calculus: {
              ...r.calculus,
              perpendicular: { visible: true, x: Math.round(x * 100) / 100, color: '#B4BBCB' },
            },
          };
        }
        return r;
      });
      commitToHistory(next);
      return next;
    });
  };

  const handleShareWorkspace = useCallback(() => {
    try {
      const payload = { rows };
      const base64 = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${window.location.origin}${window.location.pathname}#state=${base64}`;
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [rows]);

  const handleExportSVG = useCallback(() => {
    const svgEl = document.querySelector('.jxgbox svg');
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tifspace-graph.svg';
    a.click();
  }, []);

  const handleExportPNG = useCallback(() => {
    const svgEl = document.querySelector('.jxgbox svg');
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgEl.clientWidth * 2 || 1600;
      canvas.height = svgEl.clientHeight * 2 || 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = theme === 'dark' ? '#0B0D12' : '#F2F4F8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'tifspace-graph.png';
      a.click();
    };
    img.src = url;
  }, [theme]);

  const renderExpressionList = (showKeypad: boolean) => (
    <ExpressionList
      rows={rows}
      statuses={statuses}
      focusId={focusId}
      onText={(id, text) => updateRow(id, { text })}
      onToggle={toggleRow}
      onColorChange={changeRowColor}
      onEnter={(id) => addRow('', 'expression', id)}
      onDelete={removeRow}
      onMove={moveFocus}
      onAdd={(customText, type) => addRow(customText || '', type || 'expression')}
      onUpdateTable={handleUpdateTable}
      onUpdateCalculus={handleUpdateCalculus}
      showKeypad={showKeypad}
    />
  );

  useEffect(() => {
    if (!onPrimaryExpressionChange) return;
    const first = rows.find((r) => r.type !== 'table' && r.text.trim() !== '');
    onPrimaryExpressionChange(first ? first.text.trim() : '');
  }, [rows, onPrimaryExpressionChange]);

  const analysis = (
    <QuadraticInspector
      rows={rows}
      statuses={statuses}
      focusId={focusId}
      onRewrite={(id, text) => updateRow(id, { text })}
    />
  );
  const workspace = (
    <>
      {renderExpressionList(false)}
      {analysis}
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Workspace Sub-Toolbar */}
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-panel/70 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Block Studio</span>
          <span className="hidden rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent sm:inline">Interactive Canvas</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
            className="btn btn-icon btn-sm grid h-7 w-7 place-items-center"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Y)"
            className="btn btn-icon btn-sm grid h-7 w-7 place-items-center"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-3.5 w-px bg-line" />

          <button
            type="button"
            onClick={handleShareWorkspace}
            className="btn btn-secondary btn-sm flex h-7 items-center gap-1.5 text-xs"
          >
            <Share2 className="h-3 w-3 text-accent" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="btn btn-secondary btn-sm flex h-7 items-center gap-1 text-xs"
            >
              <Download className="h-3 w-3 text-muted" />
              <span>Export ▾</span>
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 top-8 z-50 flex w-36 flex-col overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-2xl"
                onMouseLeave={() => setExportOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleExportPNG();
                    setExportOpen(false);
                  }}
                  className="btn btn-content btn-ghost text-left text-xs"
                >
                  PNG Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportSVG();
                    setExportOpen(false);
                  }}
                  className="btn btn-content btn-ghost text-left text-xs"
                >
                  Vector SVG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden min-h-0 shrink-0 flex-col border-r border-line bg-panel md:flex"
          style={{ width: `${sidebarWidth}%`, maxWidth: 520, minWidth: 340 }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{workspace}</div>
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
            <span>Points of Interest:</span>
            <button
              type="button"
              onClick={() => setShowPOIs(!showPOIs)}
              className={`btn btn-ghost btn-sm ${ showPOIs ? 'bg-accent/20 text-accent' : 'bg-field text-muted' }`}
            >
              {showPOIs ? 'Visible' : 'Hidden'}
            </button>
          </div>
        </aside>

        <div
          aria-hidden="true"
          className="hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-canvas transition-colors hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:flex"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { pointerId: e.pointerId };
          }}
          onPointerMove={(e) => {
            if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
            const next = (e.clientX / window.innerWidth) * 100;
            setSidebarWidth(Math.max(24, Math.min(48, next)));
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <span className="h-10 w-1 rounded-full bg-line" />
        </div>

        <section aria-label="Graph workspace" className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative h-full w-full">
            <GraphCanvas
              items={items}
              theme={theme}
              showPointsOfInterest={showPOIs}
              tablePoints={allTableScatterPoints}
              shadedIntegrals={shadedIntegrals}
              onAddTangentAt={handleAddTangentFromHUD}
              onAddPerpendicularAt={handleAddPerpendicularFromHUD}
              onInspectPoint={(x, y) => addRow(`${Math.round(x * 100) / 100}, ${Math.round(y * 100) / 100}`, 'table')}
            />
          </div>

          <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={openSheet}
              className="btn btn-secondary text-sm"
            >
              Block Studio
            </button>
          </div>
        </section>
      </div>

      {sheetOpen && (
        <BottomSheet title="Block Studio" onClose={closeSheet}>
          <div className="p-5">
            {renderExpressionList(true)}
            {analysis}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}