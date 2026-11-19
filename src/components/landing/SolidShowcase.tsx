import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ShapeId } from '../../geometry3d/models';
import { PAGE_PATHS } from '../../lib/routes';
import {
  cuboidPoly,
  dodecahedronPoly,
  icosahedronPoly,
  octahedronPoly,
  polyEdges,
  tetrahedronPoly,
  type Poly,
} from '../../geometry3d/solidGeometry';

type ShowId = Extract<ShapeId, 'tetrahedron' | 'cube' | 'octahedron' | 'dodecahedron' | 'icosahedron'>;

const SOLIDS: { id: ShowId; label: string; poly: (a: number) => Poly }[] = [
  { id: 'tetrahedron', label: 'Tetrahedron', poly: (a) => tetrahedronPoly(a) },
  { id: 'cube', label: 'Cube', poly: (a) => cuboidPoly(a, a, a) },
  { id: 'octahedron', label: 'Octahedron', poly: (a) => octahedronPoly(a) },
  { id: 'dodecahedron', label: 'Dodecahedron', poly: (a) => dodecahedronPoly(a) },
  { id: 'icosahedron', label: 'Icosahedron', poly: (a) => icosahedronPoly(a) },
];

function toGeometry(poly: Poly) {
  const positions: number[] = [];
  for (const f of poly.faces) for (let k = 1; k < f.length - 1; k++) for (const i of [f[0], f[k], f[k + 1]]) positions.push(...poly.verts[i]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function outline(poly: Poly) {
  const pts: number[] = [];
  for (const [a, b] of polyEdges(poly)) pts.push(...poly.verts[a], ...poly.verts[b]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/** One solid, shaded and see-through, that turns on its own and can be dragged round. */
const SolidCanvas: React.FC<{ solid: ShowId }> = ({ solid }) => {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL: the facts beside the picture still say everything
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.6, 7.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5eead4, 0.6);
    rim.position.set(-4, -2, -3);
    scene.add(rim);

    const def = SOLIDS.find((s) => s.id === solid)!;
    const poly = def.poly(2.4);
    const group = new THREE.Group();
    const bodyGeo = toGeometry(poly);
    const edgeGeo = outline(poly);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.55, roughness: 0.4, metalness: 0.15, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xd4ff3a });
    group.add(new THREE.Mesh(bodyGeo, bodyMat), new THREE.LineSegments(edgeGeo, edgeMat));
    group.rotation.set(0.5, 0.6, 0);
    scene.add(group);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - lastX) * 0.01;
      group.rotation.x += (e.clientY - lastY) * 0.01;
      lastX = e.clientX;
      lastY = e.clientY;
      if (still) renderer.render(scene, camera);
    };
    const up = () => (dragging = false);
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', up);

    let frame = 0;
    const tick = () => {
      if (!dragging) group.rotation.y += 0.006;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    if (still) renderer.render(scene, camera);
    else tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      bodyGeo.dispose();
      edgeGeo.dispose();
      bodyMat.dispose();
      edgeMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [solid]);

  return <div ref={host} className="aspect-square w-full cursor-grab touch-pan-y active:cursor-grabbing" role="img" aria-label="A 3D solid that you can drag to turn" />;
};

/** A turning 3D solid with the facts that belong to it. Loaded on its own so the page opens fast. */
const SolidShowcase: React.FC = () => {
  const [solid, setSolid] = useState<ShowId>('icosahedron');
  const facts = useMemo(() => {
    const def = SOLIDS.find((s) => s.id === solid)!;
    const poly = def.poly(1);
    const v = poly.verts.length;
    const e = polyEdges(poly).length;
    const f = poly.faces.length;
    return { v, e, f, label: def.label };
  }, [solid]);

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
        <SolidCanvas solid={solid} />
      </div>
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Choose a solid" className="flex flex-wrap gap-1.5">
          {SOLIDS.map((s) => (
            <button key={s.id} role="tab" aria-selected={solid === s.id} onClick={() => setSolid(s.id)} className={`tab ${solid === s.id ? 'is-active' : ''}`}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="font-mono text-sm text-slate-200" aria-live="polite">
          V {'\u2212'} E + F = {facts.v} {'\u2212'} {facts.e} + {facts.f} = {facts.v - facts.e + facts.f}
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          A {facts.label.toLowerCase()} has {facts.f} faces, {facts.e} edges and {facts.v} corners. Count them on the solid, then change its edge length in the geometry lab and watch the volume and surface area follow.
        </p>
        <Link to={PAGE_PATHS.geometry} className="btn btn-secondary btn-sm self-start">
          Open the geometry lab
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default SolidShowcase;
