import { useEffect, useRef } from 'react';

/**
 * A quiet, animated backdrop drawn on a canvas in the palette's teal and lime.
 * - field:  drifting nodes joined by fine lines
 * - waves:  slow layered curves, like plotted functions
 * - orbit:  a point sphere turning slowly
 *
 * Performance: capped at 30 fps, paused while the tab is hidden, and redrawn only
 * when resized. Users who ask for reduced motion get one still frame.
 */
export type LiveMode = 'field' | 'waves' | 'orbit';

const TEAL = '45, 212, 191';
const LIME = '212, 255, 58';
const FRAME_MS = 1000 / 30;

interface Props {
  mode: LiveMode;
}

export function LiveBackground({ mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Field: nodes in normalised coordinates, slowly drifting and wrapping at the edges.
    const NODES = 64;
    const nodes = Array.from({ length: NODES }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00005,
      vy: (Math.random() - 0.5) * 0.00005,
      lime: i % 21 === 0,
    }));

    // Orbit: points on a sphere (Fibonacci lattice), projected each frame.
    const POINTS = 240;
    const sphere = Array.from({ length: POINTS }, (_, i) => {
      const y = 1 - (i / (POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653;
      return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r, lime: i % 40 === 0 };
    });

    const drawField = () => {
      for (const n of nodes) {
        n.x = (n.x + n.vx + 1) % 1;
        n.y = (n.y + n.vy + 1) % 1;
      }
      for (let i = 0; i < NODES; i++) {
        for (let j = i + 1; j < NODES; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const d = Math.hypot(dx, dy);
          if (d < 150) {
            ctx.strokeStyle = `rgba(${TEAL}, ${0.32 * (1 - d / 150)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.lime ? `rgba(${LIME}, 0.95)` : `rgba(${TEAL}, 0.85)`;
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, n.lime ? 2 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawWaves = (t: number) => {
      for (let k = 0; k < 6; k++) {
        const base = h * (0.42 + k * 0.08);
        const amp = h * (0.035 + k * 0.006);
        const freq = 0.0042 + k * 0.0006;
        const speed = 0.35 + k * 0.08;
        ctx.strokeStyle = `rgba(${TEAL}, ${0.22 + k * 0.035})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = base + Math.sin(x * freq + t * speed + k) * amp + Math.sin(x * freq * 2.3 - t * 0.2) * amp * 0.25;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // One lime curve, the single highlight of this mode.
      ctx.strokeStyle = `rgba(${LIME}, 0.5)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = h * 0.6 + Math.sin(x * 0.0035 - t * 0.5) * h * 0.05;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const drawOrbit = (t: number) => {
      const scale = Math.min(w, h) * 0.34;
      const cx = w / 2;
      const cy = h / 2;
      const spin = t * 0.12;
      const tilt = 0.35;
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      for (const p of sphere) {
        const x1 = p.x * cs + p.z * sn;
        const z1 = -p.x * sn + p.z * cs;
        const y2 = p.y * ct - z1 * st;
        const z2 = p.y * st + z1 * ct;
        const f = 3 / (3 + z2);
        const alpha = 0.25 + 0.7 * ((z2 + 1) / 2);
        ctx.fillStyle = p.lime ? `rgba(${LIME}, ${alpha})` : `rgba(${TEAL}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx + x1 * scale * f, cy + y2 * scale * f, 1.6 * f, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      if (mode === 'field') drawField();
      else if (mode === 'waves') drawWaves(t);
      else drawOrbit(t);
    };

    if (reduced) {
      render(0);
      return () => observer.disconnect();
    }

    let raf = 0;
    const start = performance.now();
    let pausedTotal = 0;
    let hiddenAt = 0;
    let lastFrame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      render((now - start - pausedTotal) / 1000);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.hidden) {
        hiddenAt = performance.now();
      } else {
        pausedTotal += performance.now() - hiddenAt;
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, [mode]);

  return <canvas ref={canvasRef} aria-hidden="true" data-live-background className="fixed inset-0 z-0 h-full w-full pointer-events-none" />;
}
