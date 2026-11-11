import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Triangle, Circle as CircleIcon, Hexagon, Cone, RotateCcw, Maximize2, Hand } from 'lucide-react';
import { MODELS, DEFAULT_PARAMS, type AllParams, type ShapeId, type Dimension, type ShapeModel } from '../geometry3d/models';
import { buildScene, type SceneBuild } from '../geometry3d/scene';

type Unit = 'mm' | 'cm' | 'm' | 'in';
const UNITS: Unit[] = ['mm', 'cm', 'm', 'in'];

const SHAPES: { id: ShapeId; label: string; icon: React.ReactNode }[] = [
  { id: 'triangle', label: 'Triangle', icon: <Triangle className="w-3.5 h-3.5" /> },
  { id: 'circle', label: 'Circle', icon: <CircleIcon className="w-3.5 h-3.5" /> },
  { id: 'polygon', label: 'Polygon', icon: <Hexagon className="w-3.5 h-3.5" /> },
  { id: 'frustum', label: 'Cone', icon: <Cone className="w-3.5 h-3.5" /> },
];

/** Shows the value a dimension will be entered and displayed with. */
const formatValue = (d: Dimension) => (d.kind === 'angle' ? `${d.value.toFixed(1)}°` : d.value.toFixed(2));
const decimalsFor = (d: Dimension) => (d.kind === 'angle' ? 1 : 2);

/** Units follow lengths, areas and volumes; angles and counts are unitless. */
function suffixFor(label: string, unit: Unit) {
  if (/area/i.test(label)) return ` ${unit}²`;
  if (/volume/i.test(label)) return ` ${unit}³`;
  if (/angle|type|sides|sum/i.test(label)) return '';
  return ` ${unit}`;
}

interface EditorState {
  dimId: string;
  draft: string;
  error: string | null;
}

export const GeometryCalculator: React.FC = () => {
  const [shape, setShape] = useState<ShapeId>('triangle');
  const [params, setParams] = useState<AllParams>(DEFAULT_PARAMS);
  const [unit, setUnit] = useState<Unit>('cm');
  const [tab, setTab] = useState<'measure' | 'steps'>('measure');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowDrafts, setRowDrafts] = useState<Record<string, string>>({});

  const model = MODELS[shape] as ShapeModel<any>;
  const p = params[shape];
  const dims = useMemo(() => model.dimensions(p), [model, p]);
  const summary = useMemo(() => model.summary(p), [model, p]);
  const details = useMemo(() => model.details(p), [model, p]);
  const steps = useMemo(() => model.steps(p), [model, p]);

  /* ----- three.js refs ----- */
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildRef = useRef<SceneBuild | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const editorRef = useRef<EditorState | null>(null);
  editorRef.current = editor;
  const shapeRef = useRef<ShapeId>(shape);
  const fitRef = useRef<() => void>(() => undefined);
  // Taps are registered once; this ref always points at the latest editor opener.
  const openEditorRef = useRef<(dimId: string) => void>(() => undefined);

  /* ----- set up the renderer once ----- */
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(1, 2, 3);
    scene.add(light);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
    cameraRef.current = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;
    controlsRef.current = controls;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      buildRef.current?.lineMaterials.forEach((m) => m.resolution.set(w, h));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const fit = () => {
      const b = buildRef.current;
      if (!b) return;
      camera.position.copy(b.center).add(b.cameraPosition.clone().sub(b.center));
      controls.target.copy(b.center);
      camera.up.set(0, 1, 0);
      controls.update();
    };
    fitRef.current = fit;

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
      positionOverlays();
    };

    // Keep labels and the editor glued to their 3D points.
    const positionOverlays = () => {
      const b = buildRef.current;
      const w = host.clientWidth;
      const h = host.clientHeight;
      const project = (v: THREE.Vector3) => {
        const q = v.clone().project(camera);
        return { x: (q.x * 0.5 + 0.5) * w, y: (-q.y * 0.5 + 0.5) * h, visible: q.z < 1 };
      };
      if (b) {
        for (const [id, el] of Object.entries(labelRefs.current)) {
          const anchor = b.anchors[id];
          if (!el || !anchor) continue;
          const s = project(anchor);
          // Keep labels inside the viewport so none of them is cut off at the edge.
          const x = Math.min(Math.max(s.x, 64), w - 64);
          const y = Math.min(Math.max(s.y, 18), h - 18);
          el.style.display = s.visible ? '' : 'none';
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        }
        const ed = editorRef.current;
        if (popoverRef.current && ed && b.anchors[ed.dimId]) {
          const s = project(b.anchors[ed.dimId]);
          const el = popoverRef.current;
          const offsetX = Math.min(Math.max(s.x + 16, 8), w - el.offsetWidth - 8);
          const offsetY = Math.min(Math.max(s.y + 18, 8), h - el.offsetHeight - 8);
          el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
      }
    };

    // Start the render loop only after positionOverlays exists.
    tick();

    // Tap detection: a short press without movement counts as a tap.
    const onDown = (e: PointerEvent) => {
      tapStart.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const start = tapStart.current;
      tapStart.current = null;
      const b = buildRef.current;
      if (!start || !b) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const ray = raycasterRef.current;
      ray.setFromCamera(ndc, camera);
      ray.params.Line = { threshold: b.size * 0.025 };
      const targets = b.hits.map((h) => h.object);
      const hit = ray.intersectObjects(targets, false)[0];
      const dimId = hit?.object.userData.dimId as string | undefined;
      if (dimId) openEditorRef.current(dimId);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      buildRef.current?.dispose();
      buildRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
    };
    // The renderer is created once; openEditor is stable through its use of refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- rebuild the 3D shape whenever its numbers change ----- */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const previous = buildRef.current;
    if (previous) {
      scene.remove(previous.group);
      previous.dispose();
    }
    const built = buildScene(shape, p);
    buildRef.current = built;
    scene.add(built.group);
    scene.add(built.grid);
    built.lineMaterials.forEach((m) => {
      const host = canvasHostRef.current;
      if (host) m.resolution.set(host.clientWidth || 1, host.clientHeight || 1);
    });
    if (shapeRef.current !== shape) {
      shapeRef.current = shape;
      fitRef.current();
    }
  }, [shape, p]);

  // Reset the view when the shape changes
  useEffect(() => {
    setEditor(null);
    setNote(null);
    setRowErrors({});
    setRowDrafts({});
    shapeRef.current = shape;
    fitRef.current();
  }, [shape]);

  const openEditor = useCallback((dimId: string) => {
    const d = dims.find((x) => x.id === dimId);
    if (!d) return;
    setEditor({ dimId, draft: d.value.toFixed(decimalsFor(d)), error: null });
    setNote(null);
  }, [dims]);

  openEditorRef.current = openEditor;

  /* ----- apply an edit ----- */
  const applyEdit = (dimId: string, raw: string): { ok: true } | { ok: false; error: string } => {
    const value = Number(raw.replace(',', '.'));
    if (raw.trim() === '' || !Number.isFinite(value)) return { ok: false, error: 'Type a number.' };
    const res = model.apply(p, dimId, value);
    if (res.ok === false) return { ok: false, error: res.error };
    setParams((prev) => ({ ...prev, [shape]: res.params }));
    setNote(res.note ?? null);
    return { ok: true };
  };

  const submitPopover = () => {
    if (!editor) return;
    const res = applyEdit(editor.dimId, editor.draft);
    if (res.ok === true) setEditor(null);
    else setEditor({ ...editor, error: res.error });
  };

  const submitRow = (dimId: string) => {
    const raw = rowDrafts[dimId];
    if (raw === undefined) return;
    const res = applyEdit(dimId, raw);
    setRowErrors((prev) => {
      const next = { ...prev };
      if (res.ok === true) delete next[dimId];
      else next[dimId] = res.error;
      return next;
    });
    if (res.ok === true) {
      setRowDrafts((prev) => {
        const next = { ...prev };
        delete next[dimId];
        return next;
      });
    }
  };

  const resetShape = () => {
    setParams((prev) => ({ ...prev, [shape]: DEFAULT_PARAMS[shape] }));
    setEditor(null);
    setNote(null);
    setRowErrors({});
    setRowDrafts({});
  };

  const selectedDim = editor?.dimId ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* ----- Viewport ----- */}
      <section className="xl:col-span-7 flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => setShape(s.id)}
                aria-pressed={shape === s.id}
                className={`tab ${shape === s.id ? 'is-active' : ''}`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              Unit
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs outline-none focus:border-indigo-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => fitRef.current()}
              className="btn btn-ghost flex items-center gap-1.5 text-xs"
              title="Frame the whole shape"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Fit view
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="relative h-[480px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden"
        >
          <div ref={canvasHostRef} className="absolute inset-0" />

          {/* Dimension labels, positioned on top of the 3D view every frame */}
          <div className="absolute inset-0 pointer-events-none">
            {dims.map((d) => {
              const active = selectedDim === d.id;
              return (
                <button
                  key={d.id}
                  ref={(el) => {
                    labelRefs.current[d.id] = el;
                  }}
                  onClick={() => openEditor(d.id)}
                  aria-label={`${d.symbol} = ${d.kind === 'angle' ? `${d.value.toFixed(1)}°` : `${d.value.toFixed(2)} ${unit}`}, edit ${d.name}`}
                  className={`btn btn-secondary btn-sm absolute left-0 top-0 pointer-events-auto whitespace-nowrap font-sans tabular-nums text-xs ${ active ? '' : d.kind === 'angle' ? '' : 'none' }`}
                >
                  {d.symbol} = {d.kind === 'angle' ? formatValue(d) : `${d.value.toFixed(2)}${suffixFor('', unit)}`}
                </button>
              );
            })}
          </div>

          {editor && (
            <div
              ref={popoverRef}
              className="absolute left-0 top-0 z-10 w-56 p-3 rounded-xl border border-indigo-500/60 bg-slate-900/95 shadow-2xl backdrop-blur"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="text-xs text-slate-300 font-semibold mb-2">
                {dims.find((d) => d.id === editor.dimId)?.name}
              </div>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  step="any"
                  value={editor.draft}
                  onChange={(e) => setEditor({ ...editor, draft: e.target.value, error: null })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitPopover();
                    if (e.key === 'Escape') setEditor(null);
                  }}
                  aria-label="New value"
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-sans tabular-nums text-white outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400 font-sans tabular-nums">
                  {dims.find((d) => d.id === editor.dimId)?.kind === 'angle' ? '°' : unit}
                </span>
              </div>
              {editor.error && <p className="mt-2 text-[11px] text-rose-300 leading-snug">{editor.error}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setEditor(null)} className="btn btn-ghost btn-sm py-1 text-xs">
                  Cancel
                </button>
                <button onClick={submitPopover} className="btn btn-primary btn-sm py-1 text-xs">
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
          <Hand className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
          <span>
            Tap a side or an angle in the picture, or its label, to type a new value. Drag to rotate, scroll to zoom. {model.hint}
          </span>
        </p>
        {note && <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 rounded-lg px-3 py-2">{note}</p>}
      </section>

      {/* ----- Side panel ----- */}
      <section className="xl:col-span-5 flex flex-col gap-4 min-w-0">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{model.name} dimensions</h2>
            <button onClick={resetShape} className="btn btn-ghost flex items-center gap-1 text-xs">
              <RotateCcw className="w-3 h-3" /> Reset shape
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {dims.map((d) => {
              const draft = rowDrafts[d.id] ?? decimalsFormatted(d);
              const err = rowErrors[d.id];
              return (
                <div
                  key={d.id}
                  className={`flex flex-col gap-1 rounded-lg border p-2.5 transition-colors ${
                    selectedDim === d.id ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300">
                      <span className={`font-sans tabular-nums font-semibold ${d.kind === 'angle' ? 'text-slate-100' : 'text-cyan-200'}`}>{d.symbol}</span>
                      <span className="text-slate-500"> · {d.name}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={draft}
                        onChange={(e) => setRowDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRow(d.id);
                        }}
                        onBlur={() => rowDrafts[d.id] !== undefined && submitRow(d.id)}
                        aria-label={`${d.name} value`}
                        className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-md text-right text-xs font-sans tabular-nums text-white outline-none focus:border-indigo-500"
                      />
                      <span className="w-8 text-[11px] text-slate-500 font-sans tabular-nums">{d.kind === 'angle' ? '°' : unit}</span>
                    </div>
                  </div>
                  {err && <p className="text-[11px] text-rose-300 leading-snug">{err}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {summary.map((m) => (
              <div key={m.label} className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">{m.label}</span>
                <span className="text-2xl font-bold font-sans tabular-nums text-indigo-300 tabular-nums">
                  {m.value}
                  <span className="text-xs text-slate-500 ml-1">{suffixFor(m.label, unit).trim()}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {(['measure', 'steps'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                  tab === t ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'measure' ? 'Measurements' : 'Working'}
              </button>
            ))}
          </div>

          {tab === 'measure' ? (
            <dl className="grid grid-cols-1 gap-2 text-xs">
              {details.map((m) => (
                <div key={m.label} className="flex items-center justify-between border-b border-slate-800/70 pb-1.5">
                  <dt className="text-slate-400">{m.label}</dt>
                  <dd className="font-sans tabular-nums text-slate-200">
                    {m.value}
                    {suffixFor(m.label, unit)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="flex flex-col gap-2 text-xs">
              <p className="font-sans tabular-nums text-indigo-300">{steps.formula}</p>
              <ol className="flex flex-col gap-1.5 text-slate-300 leading-relaxed list-none">
                {steps.lines.map((line, i) => (
                  <li key={i} className="font-sans tabular-nums text-[11px]">{line}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

function decimalsFormatted(d: Dimension) {
  return d.value.toFixed(decimalsFor(d));
}
