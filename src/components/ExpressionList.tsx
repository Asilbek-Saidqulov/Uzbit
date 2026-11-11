'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MathField, type MathFieldHandle } from '@/components/MathField';
import type { RowStatus } from '@/lib/relation';
import { PALETTE } from '@/lib/theme';
import { fitLinear, fitQuadratic, fitExponential, type Point2D, type RegressionResult } from '@/lib/regression';
import { differentiate, integrateAdaptive } from '@/lib/analysis';
import { formatNumber, toExactFraction } from '@/lib/format';

/** Turns a parser message into a sentence a learner can act on. The detail is still shown. */
function friendlyExpressionError(message: string): string {
  if (/unknown|not defined|undefined (function|name|variable)/i.test(message)) {
    return "We don't recognise a name in this expression. Check the spelling of functions such as sin, cos, or sqrt.";
  }
  if (/unexpected|expected|end of input|token|parenthes|bracket/i.test(message)) {
    return "We couldn't read this expression. Check that every bracket is closed and each operator has a value on both sides.";
  }
  return "We couldn't read this expression. Check the spelling and the brackets.";
}

export type TableCell = { x: string; y: string };

export type TableData = {
  rawRows?: TableCell[];
  points: Point2D[];
  model: 'none' | 'linear' | 'quadratic' | 'exponential';
};

export type CalculusChildren = {
  derivative?: { visible: boolean; color: string };
  tangent?: { visible: boolean; x: number; color: string };
  perpendicular?: { visible: boolean; x: number; color: string };
  inverse?: { visible: boolean; color: string };
  integral?: { visible: boolean; a: number; b: number; showShading: boolean; color: string };
};

export type Row = {
  id: string;
  type?: 'expression' | 'table';
  text: string;
  color: string;
  visible: boolean;
  table?: TableData;
  calculus?: CalculusChildren;
};

type ListProps = {
  rows: Row[];
  statuses: Record<string, RowStatus | undefined>;
  focusId: string | null;
  onText: (id: string, text: string) => void;
  onToggle: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onEnter: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onAdd: (text?: string, type?: 'expression' | 'table') => void;
  onUpdateTable?: (id: string, table: TableData) => void;
  onUpdateCalculus?: (id: string, calculus: CalculusChildren) => void;
  showKeypad?: boolean;
};

type Key = {
  label: string;
  insert?: string;
  caret?: number;
  backspace?: boolean;
};

const KEYS: Key[] = [
  { label: 'x', insert: 'x' },
  { label: 'y', insert: 'y' },
  { label: 'x²', insert: '^2' },
  { label: 'xⁿ', insert: '^' },
  { label: '√', insert: 'sqrt()', caret: 5 },
  { label: '|x|', insert: '||', caret: 1 },
  { label: 'π', insert: 'pi' },
  { label: '(', insert: '()', caret: 1 },
  { label: ')', insert: ')' },
  { label: 'sin', insert: 'sin()', caret: 4 },
  { label: 'cos', insert: 'cos()', caret: 4 },
  { label: 'tan', insert: 'tan()', caret: 4 },
  { label: '×', insert: '*' },
  { label: '÷', insert: '/' },
  { label: '+', insert: '+' },
  { label: '−', insert: '-' },
  { label: '=', insert: '=' },
  { label: '<', insert: '<' },
  { label: '>', insert: '>' },
  { label: '≤', insert: '≤' },
  { label: '≥', insert: '≥' },
  { label: '⌫', backspace: true },
];

export default function ExpressionList({
  rows,
  statuses,
  focusId,
  onText,
  onToggle,
  onColorChange,
  onEnter,
  onDelete,
  onMove,
  onAdd,
  onUpdateTable,
  onUpdateCalculus,
  showKeypad = true,
}: ListProps) {
  const fields = useRef(new Map<string, MathFieldHandle>());
  const activeId = useRef<string | null>(null);

  const activeField = (): MathFieldHandle | null => {
    const id =
      activeId.current && fields.current.has(activeId.current)
        ? activeId.current
        : rows[rows.length - 1]?.id;
    return (id && fields.current.get(id)) || null;
  };

  const pressKey = (key: Key) => {
    const field = activeField();
    if (!field) return;
    field.focus();
    if (key.backspace) field.backspace();
    else field.insert(key.insert ?? '', key.caret);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted font-sans">Block Studio</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdd('', 'table')}
            className="btn btn-secondary btn-sm py-1 text-xs"
          >
            + Table
          </button>
          <button
            type="button"
            onClick={() => onAdd('', 'expression')}
            className="btn btn-primary btn-sm py-1 text-xs"
          >
            + Expression
          </button>
        </div>
      </div>

      {rows.map((row) =>
        row.type === 'table' ? (
          <TableBlockItem
            key={row.id}
            row={row}
            onToggle={() => onToggle(row.id)}
            onColorChange={(color) => onColorChange(row.id, color)}
            onDelete={() => onDelete(row.id)}
            onUpdate={(table) => onUpdateTable?.(row.id, table)}
          />
        ) : (
          <EquationBlockItem
            key={row.id}
            row={row}
            status={statuses[row.id]}
            canDelete={rows.length > 1}
            autoFocus={row.id === focusId}
            fieldRef={(handle) => {
              if (handle) fields.current.set(row.id, handle);
              else fields.current.delete(row.id);
            }}
            onFocus={() => {
              activeId.current = row.id;
            }}
            onText={(text) => {
              if (text.trim().toLowerCase() === 'table') {
                onUpdateTable?.(row.id, {
                  rawRows: [
                    { x: '', y: '' },
                    { x: '', y: '' },
                  ],
                  points: [],
                  model: 'linear',
                });
                return;
              }
              onText(row.id, text);
            }}
            onToggle={() => onToggle(row.id)}
            onColorChange={(color) => onColorChange(row.id, color)}
            onEnter={() => onEnter(row.id)}
            onDelete={() => onDelete(row.id)}
            onMove={(delta) => onMove(row.id, delta)}
            onUpdateCalculus={(c) => onUpdateCalculus?.(row.id, c)}
            onCreateSlider={(varName) => onAdd(`${varName} = 1`)}
          />
        )
      )}

      {showKeypad && (
        <div className="mt-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Keypad</p>
          <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-line bg-panel p-2 shadow-sm">
            {KEYS.map((key) => (
              <button
                key={key.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pressKey(key)}
                aria-label={key.backspace ? 'Backspace' : `Insert ${key.insert}`}
                className="btn btn-secondary grid h-9 place-items-center font-sans text-[14px]"
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Block Component
// ---------------------------------------------------------------------------
function TableBlockItem({
  row,
  onToggle,
  onColorChange,
  onDelete,
  onUpdate,
}: {
  row: Row;
  onToggle: () => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onUpdate: (table: TableData) => void;
}) {
  const table = row.table || {
    rawRows: [
      { x: '', y: '' },
      { x: '', y: '' },
    ],
    points: [],
    model: 'linear',
  };

  const rawRows: TableCell[] = useMemo(() => {
    if (table.rawRows && table.rawRows.length > 0) return table.rawRows;
    if (table.points && table.points.length > 0) {
      return table.points.map((p) => ({
        x: Number.isFinite(p.x) ? `${p.x}` : '',
        y: Number.isFinite(p.y) ? `${p.y}` : '',
      }));
    }
    return [
      { x: '', y: '' },
      { x: '', y: '' },
    ];
  }, [table.rawRows, table.points]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => {
      const firstEl = cellRefs.current.get('0:x');
      firstEl?.focus();
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    if (paletteOpen) window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, [paletteOpen]);

  const validPoints = useMemo<Point2D[]>(() => {
    return rawRows
      .filter(
        (r) =>
          r.x.trim() !== '' &&
          r.y.trim() !== '' &&
          Number.isFinite(Number(r.x)) &&
          Number.isFinite(Number(r.y))
      )
      .map((r) => ({ x: Number(r.x), y: Number(r.y) }));
  }, [rawRows]);

  const regressionResult = useMemo<RegressionResult | null>(() => {
    if (validPoints.length < 2 || table.model === 'none') return null;
    if (table.model === 'linear') return fitLinear(validPoints);
    if (table.model === 'quadratic') return fitQuadratic(validPoints);
    if (table.model === 'exponential') return fitExponential(validPoints);
    return null;
  }, [validPoints, table.model]);

  const updateRows = (nextRaw: TableCell[]) => {
    const nextPoints = nextRaw
      .filter(
        (r) =>
          r.x.trim() !== '' &&
          r.y.trim() !== '' &&
          Number.isFinite(Number(r.x)) &&
          Number.isFinite(Number(r.y))
      )
      .map((r) => ({ x: Number(r.x), y: Number(r.y) }));

    onUpdate({
      ...table,
      rawRows: nextRaw,
      points: nextPoints,
    });
  };

  const focusCell = (rowIndex: number, col: 'x' | 'y', cursorPosition?: 'start' | 'end') => {
    const key = `${rowIndex}:${col}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      if (cursorPosition === 'start') {
        el.setSelectionRange(0, 0);
      } else if (cursorPosition === 'end') {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  };

  const addRowAndFocus = (targetCol: 'x' | 'y') => {
    const newIdx = rawRows.length;
    const next = [...rawRows, { x: '', y: '' }];
    updateRows(next);
    setTimeout(() => focusCell(newIdx, targetCol, 'start'), 0);
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    col: 'x' | 'y'
  ) => {
    const input = e.currentTarget;
    const isStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const isEnd =
      input.selectionStart === input.value.length && input.selectionEnd === input.value.length;

    if (e.key === 'ArrowRight') {
      if (isEnd) {
        e.preventDefault();
        if (col === 'x') {
          focusCell(rowIndex, 'y', 'start');
        } else if (col === 'y') {
          if (rowIndex < rawRows.length - 1) {
            focusCell(rowIndex + 1, 'x', 'start');
          } else {
            addRowAndFocus('x');
          }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      if (isStart) {
        e.preventDefault();
        if (col === 'y') {
          focusCell(rowIndex, 'x', 'end');
        } else if (col === 'x' && rowIndex > 0) {
          focusCell(rowIndex - 1, 'y', 'end');
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < rawRows.length - 1) {
        focusCell(rowIndex + 1, col);
      } else {
        addRowAndFocus(col);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, col);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (col === 'x') {
        focusCell(rowIndex, 'y');
      } else {
        if (rowIndex < rawRows.length - 1) {
          focusCell(rowIndex + 1, 'x');
        } else {
          addRowAndFocus('x');
        }
      }
    } else if (e.key === 'Backspace') {
      if (input.value === '' && rawRows.length > 1) {
        const otherCol = col === 'x' ? 'y' : 'x';
        if (rawRows[rowIndex][otherCol] === '') {
          e.preventDefault();
          const next = rawRows.filter((_, i) => i !== rowIndex);
          updateRows(next);
          const targetRow = Math.max(0, rowIndex - 1);
          setTimeout(() => focusCell(targetRow, col, 'end'), 0);
        }
      }
    }
  };

  const handleCellChange = (rowIndex: number, col: 'x' | 'y', val: string) => {
    const next = rawRows.map((r, i) => (i === rowIndex ? { ...r, [col]: val } : r));
    updateRows(next);
  };

  const removeRowAt = (idx: number) => {
    if (rawRows.length <= 1) {
      updateRows([{ x: '', y: '' }]);
      return;
    }
    updateRows(rawRows.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="btn btn-icon flex h-5 w-5 items-center justify-center"
          >
            <span
              className="h-3.5 w-3.5 rounded-full border-2 transition-all shadow-sm"
              style={{
                borderColor: row.color,
                backgroundColor: row.visible ? row.color : 'transparent',
              }}
            />
          </button>
          <span className="font-sans tabular-nums text-xs font-bold text-accent">⊞ Inline table</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div ref={paletteRef} className="relative">
            <button
              type="button"
              onClick={() => setPaletteOpen(!paletteOpen)}
              aria-label="Change curve colour"
              className="btn btn-secondary btn-sm grid h-6 w-6 place-items-center text-xs"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            </button>
            {paletteOpen && (
              <div className="absolute right-0 top-8 z-30 flex gap-1.5 rounded-xl border border-line bg-panel p-2 shadow-xl">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onColorChange(c);
                      setPaletteOpen(false);
                    }}
                    className={`btn btn-icon h-5 w-5 ${ row.color === c ? 'ring-2 ring-accent' : 'border-transparent' }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-icon btn-sm grid h-6 w-6 place-items-center"
           aria-label="Delete curve">
            ×
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-line bg-field/30">
        <table className="w-full text-left font-sans tabular-nums text-xs">
          <thead className="sticky top-0 border-b border-line bg-field text-muted">
            <tr>
              <th className="px-3 py-1.5 text-center font-bold">x1</th>
              <th className="px-3 py-1.5 text-center font-bold">y1</th>
              <th className="w-6 px-1"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rawRows.map((r, idx) => (
              <tr key={idx} className="hover:bg-field/50">
                <td className="px-2 py-1">
                  <input
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${idx}:x`, el);
                      else cellRefs.current.delete(`${idx}:x`);
                    }}
                    type="text"
                    inputMode="decimal"
                    value={r.x}
                    placeholder="0"
                    onChange={(e) => handleCellChange(idx, 'x', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx, 'x')}
                    className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-center text-ink focus:border-accent focus:bg-field focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${idx}:y`, el);
                      else cellRefs.current.delete(`${idx}:y`);
                    }}
                    type="text"
                    inputMode="decimal"
                    value={r.y}
                    placeholder="0"
                    onChange={(e) => handleCellChange(idx, 'y', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx, 'y')}
                    className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-center text-ink focus:border-accent focus:bg-field focus:outline-none"
                  />
                </td>
                <td className="px-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRowAt(idx)}
                    disabled={rawRows.length <= 1}
                    className="btn btn-ghost"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => addRowAndFocus('x')}
        className="btn btn-ghost mt-1.5 text-xs"
      >
        + Add point
      </button>

      <div className="mt-3 rounded-xl border border-line bg-field/50 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted">Model:</span>
          <select
            value={table.model}
            onChange={(e) =>
              onUpdate({
                ...table,
                model: e.target.value as any,
              })
            }
            className="rounded-lg border border-line bg-field px-2 py-0.5 font-sans text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <option value="none">None (Points only)</option>
            <option value="linear">Linear (y = mx + b)</option>
            <option value="quadratic">Quadratic (y = ax² + bx + c)</option>
            <option value="exponential">Exponential (y = a · e^bx)</option>
          </select>
        </div>

        {regressionResult ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-line/60 pt-2 font-sans tabular-nums text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent">{regressionResult.equation}</span>
              
            </div>
            <span className="text-[11px] text-muted">R² = {regressionResult.r2}</span>
          </div>
        ) : table.model !== 'none' ? (
          <p className="mt-2 border-t border-line/60 pt-2 text-[11px] text-muted">
            Enter at least {table.model === 'quadratic' ? 3 : 2} points to compute {table.model} regression.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Equation Block with All Action Chips
// ---------------------------------------------------------------------------
function EquationBlockItem({
  row,
  status,
  canDelete,
  autoFocus,
  fieldRef,
  onFocus,
  onText,
  onToggle,
  onColorChange,
  onEnter,
  onDelete,
  onMove,
  onUpdateCalculus,
  onCreateSlider,
}: {
  row: Row;
  status?: RowStatus;
  canDelete: boolean;
  autoFocus: boolean;
  fieldRef: (handle: MathFieldHandle | null) => void;
  onFocus: () => void;
  onText: (text: string) => void;
  onToggle: () => void;
  onColorChange: (color: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  onMove: (delta: -1 | 1) => void;
  onUpdateCalculus: (calculus: CalculusChildren) => void;
  onCreateSlider: (varName: string) => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  const explicitFn =
    status?.kind === 'ok' &&
    (status.relation.kind === 'explicit' || status.relation.kind === 'functionDef')
      ? status.relation.fn
      : null;
  const isValidExplicit = explicitFn !== null;
  const variable =
    status?.kind === 'ok' && status.relation.kind === 'variable' ? status.relation : null;

  const calculus = row.calculus || {};

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    if (paletteOpen) window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, [paletteOpen]);

  const toggleDerivative = () => {
    onUpdateCalculus({
      ...calculus,
      derivative: calculus.derivative ? undefined : { visible: true, color: '#5EEAD4' },
    });
  };

  const toggleTangent = () => {
    onUpdateCalculus({
      ...calculus,
      tangent: calculus.tangent ? undefined : { visible: true, x: 1, color: '#E7EAF1' },
    });
  };

  const togglePerpendicular = () => {
    onUpdateCalculus({
      ...calculus,
      perpendicular: calculus.perpendicular ? undefined : { visible: true, x: 1, color: '#B4BBCB' },
    });
  };

  const toggleInverse = () => {
    onUpdateCalculus({
      ...calculus,
      inverse: calculus.inverse ? undefined : { visible: true, color: '#8B93A7' },
    });
  };

  const toggleIntegral = () => {
    onUpdateCalculus({
      ...calculus,
      integral: calculus.integral
        ? undefined
        : { visible: true, a: 0, b: 2, showShading: true, color: '#2DD4BF' },
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-2xl border border-line bg-panel p-3 shadow-sm transition-all focus-within:border-accent">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="btn btn-icon flex h-5 w-5 items-center justify-center"
              title={row.visible ? 'Hide curve' : 'Show curve'}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border-2 transition-all shadow-sm"
                style={{
                  borderColor: row.color,
                  backgroundColor: row.visible ? row.color : 'transparent',
                }}
              />
            </button>
            <span className="font-sans tabular-nums text-xs font-bold text-accent">~ Equation</span>
          </div>

          <div className="flex items-center gap-1">
            <div ref={paletteRef} className="relative">
              <button
                type="button"
                onClick={() => setPaletteOpen(!paletteOpen)}
                aria-label="Change curve colour"
                className="btn btn-secondary btn-sm grid h-6 w-6 place-items-center text-xs"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              </button>
              {paletteOpen && (
                <div className="absolute right-0 top-8 z-30 flex gap-1.5 rounded-xl border border-line bg-panel p-2 shadow-xl">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onColorChange(c);
                        setPaletteOpen(false);
                      }}
                      className={`btn btn-icon h-5 w-5 ${ row.color === c ? 'ring-2 ring-accent' : 'border-transparent' }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="btn btn-icon btn-sm grid h-6 w-6 place-items-center"
               aria-label="Delete curve">
                ×
              </button>
            )}
          </div>
        </div>

        <MathField
          ref={fieldRef}
          value={row.text}
          onChange={onText}
          onFocus={onFocus}
          onEnter={onEnter}
          onMove={onMove}
          onDeleteEmpty={canDelete ? onDelete : undefined}
          placeholder="Type an equation"
          invalid={status?.kind === 'error'}
          autoFocus={autoFocus}
          ariaLabel="Equation"
        />

        {variable && (
          <AnimatedNumberSlider name={variable.name} value={variable.value} onChange={onText} />
        )}

        <StatusLine status={status} visible={row.visible} onCreateSlider={onCreateSlider} />

        {/* Action Chips */}
        {isValidExplicit && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2 text-[11px]">
            <button
              type="button"
              onClick={toggleDerivative}
              className={`btn btn-secondary btn-sm ${ calculus.derivative ? 'border border-indigo-500/40 bg-indigo-500/20 text-indigo-500' : 'bg-field text-muted hover:bg-line hover:text-ink' }`}
            >
              f′(Derivative)
            </button>
            <button
              type="button"
              onClick={toggleTangent}
              className={`btn btn-secondary btn-sm ${ calculus.tangent ? 'border border-amber-500/40 bg-amber-500/20 text-amber-500' : 'bg-field text-muted hover:bg-line hover:text-ink' }`}
            >
              f(x) Tangent
            </button>
            <button
              type="button"
              onClick={togglePerpendicular}
              className={`btn btn-secondary btn-sm ${ calculus.perpendicular ? 'border border-pink-500/40 bg-pink-500/20 text-pink-500' : 'bg-field text-muted hover:bg-line hover:text-ink' }`}
            >
              ⟂ Perpendicular
            </button>
            <button
              type="button"
              onClick={toggleInverse}
              className={`btn btn-secondary btn-sm ${ calculus.inverse ? 'border border-purple-500/40 bg-purple-500/20 text-purple-500' : 'bg-field text-muted hover:bg-line hover:text-ink' }`}
            >
              f⁻¹(Reverse)
            </button>
            <button
              type="button"
              onClick={toggleIntegral}
              className={`btn btn-secondary btn-sm ${ calculus.integral ? 'text-blue-300' : '' }`}
            >
              Area ∫
            </button>
            
          </div>
        )}
      </div>

      {/* Indented Child Cards */}
      {isValidExplicit && explicitFn && (
        <div className="ml-5 flex flex-col gap-2 border-l-2 border-accent/30 pl-3">
          {calculus.derivative && (
            <DerivativeChildCard
              fn={explicitFn}
              color={calculus.derivative.color}
              onClose={toggleDerivative}
            />
          )}

          {calculus.tangent && (
            <TangentChildCard
              fn={explicitFn}
              x={calculus.tangent.x}
              color={calculus.tangent.color}
              onChangeX={(x) =>
                onUpdateCalculus({
                  ...calculus,
                  tangent: { ...calculus.tangent!, x },
                })
              }
              onClose={toggleTangent}
            />
          )}

          {/* Perpendicular / Normal Line Child Card */}
          {calculus.perpendicular && (
            <PerpendicularChildCard
              fn={explicitFn}
              x={calculus.perpendicular.x}
              color={calculus.perpendicular.color}
              onChangeX={(x) =>
                onUpdateCalculus({
                  ...calculus,
                  perpendicular: { ...calculus.perpendicular!, x },
                })
              }
              onClose={togglePerpendicular}
            />
          )}

          {/* Inverse / Reverse Function Child Card */}
          {calculus.inverse && (
            <InverseChildCard
              color={calculus.inverse.color}
              onClose={toggleInverse}
            />
          )}

          {calculus.integral && (
            <IntegralChildCard
              fn={explicitFn}
              a={calculus.integral.a}
              b={calculus.integral.b}
              color={calculus.integral.color}
              onChangeBounds={(a, b) =>
                onUpdateCalculus({
                  ...calculus,
                  integral: { ...calculus.integral!, a, b },
                })
              }
              onClose={toggleIntegral}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DerivativeChildCard({
  fn,
  color,
  onClose,
}: {
  fn: (x: number) => number;
  color: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-2.5 text-xs text-ink shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-sans tabular-nums font-bold text-indigo-500">~ Derivative</span>
        <button type="button" onClick={onClose} className="btn btn-ghost">
          ×
        </button>
      </div>
      <p className="font-sans tabular-nums text-sm font-semibold">f′(x) = slope function</p>
      <span className="text-[10px] text-muted">Plotted as dynamic curve on graph</span>
    </div>
  );
}

function TangentChildCard({
  fn,
  x,
  color,
  onChangeX,
  onClose,
}: {
  fn: (x: number) => number;
  x: number;
  color: string;
  onChangeX: (x: number) => void;
  onClose: () => void;
}) {
  const dRes = differentiate(fn, x);
  const y = fn(x);
  const slope = dRes.isDefined ? dRes.value : NaN;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-ink shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-sans tabular-nums font-bold text-amber-500">f(x) Tangent</span>
        <button type="button" onClick={onClose} className="btn btn-ghost">
          ×
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted">at x =</span>
        <input
          type="number"
          value={x}
          onChange={(e) => onChangeX(Number(e.target.value))}
          className="w-16 rounded border border-line bg-field px-1.5 py-0.5 font-sans tabular-nums text-center text-xs"
        />
        <span className="font-sans tabular-nums font-bold">m = {Number.isFinite(slope) ? formatNumber(slope) : 'undef'}</span>
      </div>

      <p className="font-sans tabular-nums text-[11px] text-muted">
        y = {formatNumber(slope)}x + {formatNumber(y - slope * x)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perpendicular / Normal Line Child Card
// ---------------------------------------------------------------------------
function PerpendicularChildCard({
  fn,
  x,
  color,
  onChangeX,
  onClose,
}: {
  fn: (x: number) => number;
  x: number;
  color: string;
  onChangeX: (x: number) => void;
  onClose: () => void;
}) {
  const dRes = differentiate(fn, x);
  const y = fn(x);
  const m = dRes.isDefined ? dRes.value : NaN;
  const perpSlope = Number.isFinite(m) && Math.abs(m) > 1e-7 ? -1 / m : m === 0 ? Infinity : NaN;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-pink-500/40 bg-pink-500/10 p-2.5 text-xs text-ink shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-sans tabular-nums font-bold text-pink-500">⟂ Perpendicular (Normal)</span>
        <button type="button" onClick={onClose} className="btn btn-ghost">
          ×
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted">at x =</span>
        <input
          type="number"
          value={x}
          onChange={(e) => onChangeX(Number(e.target.value))}
          className="w-16 rounded border border-line bg-field px-1.5 py-0.5 font-sans tabular-nums text-center text-xs"
        />
        <span className="font-sans tabular-nums font-bold">
          m⟂ = {Number.isFinite(perpSlope) ? formatNumber(perpSlope) : perpSlope === Infinity ? '∞' : 'undef'}
        </span>
      </div>

      <p className="font-sans tabular-nums text-[11px] text-muted">
        {perpSlope === Infinity
          ? `x = ${formatNumber(x)} (Vertical Normal)`
          : `y = ${formatNumber(perpSlope)}x + ${formatNumber(y - perpSlope * x)}`}
      </p>
      <span className="text-[10px] text-muted">Meets tangent at exactly 90°</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inverse / Reverse Function Child Card
// ---------------------------------------------------------------------------
function InverseChildCard({
  color,
  onClose,
}: {
  color: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 p-2.5 text-xs text-ink shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-sans tabular-nums font-bold text-purple-500">f⁻¹(x) Reverse / Inverse</span>
        <button type="button" onClick={onClose} className="btn btn-ghost">
          ×
        </button>
      </div>
      <p className="font-sans tabular-nums text-xs font-semibold">Reflected across the line y = x</p>
      <span className="text-[10px] text-muted">Reverses inputs and outputs: (x, y) ↔ (y, x)</span>
    </div>
  );
}

function IntegralChildCard({
  fn,
  a,
  b,
  color,
  onChangeBounds,
  onClose,
}: {
  fn: (x: number) => number;
  a: number;
  b: number;
  color: string;
  onChangeBounds: (a: number, b: number) => void;
  onClose: () => void;
}) {
  const intRes = integrateAdaptive(fn, a, b);
  const exact = intRes.status === 'ok' ? toExactFraction(intRes.value) : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 p-2.5 text-xs text-ink shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-sans tabular-nums font-bold text-blue-300">∫ Definite Area</span>
        <button type="button" onClick={onClose} className="btn btn-ghost">
          ×
        </button>
      </div>

      <div className="flex items-center gap-2 font-sans tabular-nums text-xs">
        <span className="text-muted">Bounds: [</span>
        <input
          type="number"
          aria-label="Lower bound"
          value={a}
          onChange={(e) => onChangeBounds(Number(e.target.value), b)}
          className="w-12 rounded border border-line bg-field px-1 py-0.5 text-center"
        />
        <span className="text-muted">→</span>
        <input
          type="number"
          aria-label="Upper bound"
          value={b}
          onChange={(e) => onChangeBounds(a, Number(e.target.value))}
          className="w-12 rounded border border-line bg-field px-1 py-0.5 text-center"
        />
        <span className="text-muted">]</span>
      </div>

      {intRes.status === 'ok' ? (
        <div className="flex items-baseline gap-2 font-sans tabular-nums">
          {exact && exact.str !== `${intRes.value}` && (
            <span className="text-base font-bold text-blue-300">{exact.str}</span>
          )}
          <span className="text-sm font-semibold">≈ {formatNumber(intRes.value)}</span>
          <span className="text-[10px] text-muted">shaded</span>
        </div>
      ) : (
        <p className="text-danger">{intRes.message}</p>
      )}
    </div>
  );
}

function AnimatedNumberSlider({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (text: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [min, setMin] = useState(-10);
  const [max, setMax] = useState(10);
  const [step] = useState(0.05);
  const [playing, setPlaying] = useState(false);

  const localRef = useRef(value);
  const animRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    localRef.current = value;
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const speed = Math.max(1, (max - min) / 4);
      localRef.current += speed * dt;

      if (localRef.current >= max) {
        localRef.current = min;
      }

      const rounded = Math.round(localRef.current * 100) / 100;
      setLocal(rounded);
      onChangeRef.current(`${name} = ${rounded}`);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing, min, max, name]);

  return (
    <div className="mt-2.5 flex flex-col gap-1.5 rounded-xl border border-line bg-field/60 p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            className="btn btn-primary btn-sm grid h-6 w-6 place-items-center text-[11px]"
            title={playing ? 'Pause' : 'Play animation'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <span className="font-sans tabular-nums text-sm font-semibold text-ink">{name}</span>
        </div>
        <div className="flex items-center gap-1 font-sans tabular-nums text-xs text-muted">
          <input
            type="number"
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="w-12 rounded border border-line bg-field px-1 py-0.5 text-center font-sans tabular-nums text-xs text-ink"
          />
          <span>to</span>
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="w-12 rounded border border-line bg-field px-1 py-0.5 text-center font-sans tabular-nums text-xs text-ink"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={local}
          onChange={(e) => {
            const v = Math.round(Number(e.target.value) * 100) / 100;
            localRef.current = v;
            setLocal(v);
            onChange(`${name} = ${v}`);
          }}
          aria-label={`Value of ${name}`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <span className="w-12 text-right font-sans tabular-nums text-xs font-semibold text-ink">
          {Math.round(local * 100) / 100}
        </span>
      </div>
    </div>
  );
}

function StatusLine({
  status,
  visible,
  onCreateSlider,
}: {
  status?: RowStatus;
  visible: boolean;
  onCreateSlider: (varName: string) => void;
}) {
  if (!status || status.kind === 'empty') return null;

  const unboundVars = status.kind === 'ok' ? status.unboundVars : undefined;

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1">
      {status.kind === 'error' ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs leading-relaxed text-danger">
            {friendlyExpressionError(status.message)}
            {status.stale && <span className="text-muted"> Showing last valid curve.</span>}
          </p>
          <p className="text-[11px] text-muted">Detail: {status.message}</p>
        </div>
      ) : (
        <p className="text-xs text-muted">{visible ? status.label : 'Hidden'}</p>
      )}

      {unboundVars && unboundVars.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-accent">
          <span>Create slider:</span>
          {unboundVars.map((v: string) => (
            <button
              key={v}
              type="button"
              onClick={() => onCreateSlider(v)}
              className="btn btn-secondary btn-sm py-0.5 font-sans tabular-nums"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}