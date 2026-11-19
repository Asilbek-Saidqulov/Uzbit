/**
 * Builds the three.js scene for each shape from the exact model values,
 * so the drawing is to scale. Every side, radius, and angle gets a visible
 * highlight and an invisible "hit" line used for tapping.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {
  triangleVertices,
  triangleAngles,
  frustumRimAngle,
  type ConeParams,
  type CircleParams,
  type CubeParams,
  type CuboidParams,
  type CylinderParams,
  type FrustumParams,
  type PolygonParams,
  type PrismParams,
  type PyramidParams,
  type RegularParams,
  type ShapeId,
  type SphereParams,
  type TriangleParams,
} from './models';
import {
  cuboidPoly,
  dodecahedronPoly,
  icosahedronPoly,
  octahedronPoly,
  prismPoly,
  pyramidPoly,
  tetrahedronPoly,
  type Poly,
  type V3,
} from './solidGeometry';

export const COLORS = {
  face: 0x2dd4bf,
  outline: 0xccfbf1,
  side: 0x2dd4bf, // cyan: lengths
  radius: 0xd4ff3a, // amber: radii and heights
  angle: 0xe7eaf1, // neutral: angles, so lime stays rare
  grid: 0x2a3040,
};

export interface SceneBuild {
  group: THREE.Group;
  /** Invisible lines and spheres used for raycasting taps. */
  hits: { object: THREE.Object3D; dimId: string }[];
  /** Where each dimension's label sits, in world coordinates. */
  anchors: Record<string, THREE.Vector3>;
  center: THREE.Vector3;
  /** Largest extent of the shape, used for framing and grid spacing. */
  size: number;
  /** Suggested camera position for a clear first view. */
  cameraPosition: THREE.Vector3;
  grid: THREE.GridHelper;
  lineMaterials: LineMaterial[];
  dispose(): void;
}

/* ---------- helpers ---------- */

const v3 = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

function makeLineMaterial(color: number, width: number) {
  return new LineMaterial({
    color,
    linewidth: width,
    worldUnits: false,
    transparent: true,
    depthTest: false,
  });
}

/** Thick, always-visible highlight line (pixel width), so sides read clearly. */
function highlight(points: THREE.Vector3[], color: number, width: number, mats: LineMaterial[]) {
  const geo = new LineGeometry();
  geo.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const mat = makeLineMaterial(color, width);
  mats.push(mat);
  const line = new Line2(geo, mat);
  line.computeLineDistances();
  line.renderOrder = 10;
  return line;
}

/** Invisible raycast target. Lines use a world-space threshold set by the viewer. */
function hitLine(a: THREE.Vector3, b: THREE.Vector3, dimId: string) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthTest: false });
  const line = new THREE.Line(geo, mat);
  line.userData.dimId = dimId;
  return line;
}

function hitSphere(center: THREE.Vector3, radius: number, dimId: string) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), mat);
  mesh.position.copy(center);
  mesh.userData.dimId = dimId;
  return mesh;
}

/** Points on an arc in the XY plane from direction d1 to d2 (shortest way round). */
function arcPoints(center: THREE.Vector3, d1: THREE.Vector2, d2: THREE.Vector2, radius: number, z = 0) {
  const a1 = Math.atan2(d1.y, d1.x);
  let delta = Math.atan2(d2.y, d2.x) - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = a1 + (delta * i) / 28;
    pts.push(v3(center.x + radius * Math.cos(t), center.y + radius * Math.sin(t), z));
  }
  return pts;
}

function dispose(group: THREE.Group, extra: { dispose(): void }[]) {
  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose?.();
  });
  extra.forEach((x) => x.dispose());
}

function finish(
  group: THREE.Group,
  hits: SceneBuild['hits'],
  anchors: Record<string, THREE.Vector3>,
  center: THREE.Vector3,
  size: number,
  cameraPosition: THREE.Vector3,
  lineMaterials: LineMaterial[],
  gridAt: 'xy' | 'xz',
  gridY: number
): SceneBuild {
  const step = niceStep(size / 8);
  const divisions = Math.max(4, Math.round((size * 2.2) / step));
  const grid = new THREE.GridHelper(divisions * step, divisions, COLORS.grid, COLORS.grid);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  if (gridAt === 'xy') {
    grid.rotation.x = Math.PI / 2;
    grid.position.set(center.x, center.y, gridY);
  } else {
    grid.position.set(center.x, gridY, center.z);
  }
  grid.userData.step = step;
  group.add(grid);
  const extra = [{ dispose: () => undefined }];
  return {
    group,
    hits,
    anchors,
    center,
    size,
    cameraPosition,
    grid,
    lineMaterials,
    dispose: () => dispose(group, extra),
  };
}

/* ---------- triangle ---------- */

export function buildTriangleScene(p: TriangleParams): SceneBuild {
  const raw = triangleVertices(p);
  const cx = (raw.A.x + raw.B.x + raw.C.x) / 3;
  const cy = (raw.A.y + raw.B.y + raw.C.y) / 3;
  const A = v3(raw.A.x - cx, raw.A.y - cy);
  const B = v3(raw.B.x - cx, raw.B.y - cy);
  const C = v3(raw.C.x - cx, raw.C.y - cy);
  const size = Math.max(p.a, p.b, p.c);
  const ang = triangleAngles(p);

  const group = new THREE.Group();
  const mats: LineMaterial[] = [];
  const hits: SceneBuild['hits'] = [];
  const anchors: Record<string, THREE.Vector3> = {};

  // Filled face (to scale, no fake thickness).
  const shape = new THREE.Shape([new THREE.Vector2(A.x, A.y), new THREE.Vector2(B.x, B.y), new THREE.Vector2(C.x, C.y)]);
  const face = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color: COLORS.face, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  group.add(face);

  // Sides
  const sides: [string, THREE.Vector3, THREE.Vector3, number][] = [
    ['side-a', B, C, p.a],
    ['side-b', C, A, p.b],
    ['side-c', A, B, p.c],
  ];
  for (const [id, p1, p2] of sides) {
    group.add(highlight([p1, p2], COLORS.side, 4, mats));
    hits.push({ object: hitLine(p1, p2, id), dimId: id });
    group.add(hits[hits.length - 1].object);
    const mid = v3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    const outward = new THREE.Vector2(mid.x, mid.y).normalize().multiplyScalar(size * 0.09);
    anchors[id] = v3(mid.x + outward.x, mid.y + outward.y);
  }
  // Outline of the face
  group.add(highlight([A, B, C, A], COLORS.outline, 1.5, mats));

  // Angles: arc at each vertex, between the two sides meeting there.
  const arcR = size * 0.11;
  const vertexAngles: [string, THREE.Vector3, THREE.Vector3, THREE.Vector3, number][] = [
    ['angle-A', A, B, C, ang.A],
    ['angle-B', B, C, A, ang.B],
    ['angle-C', C, A, B, ang.C],
  ];
  for (const [id, vtx, o1, o2] of vertexAngles) {
    const d1 = new THREE.Vector2(o1.x - vtx.x, o1.y - vtx.y).normalize();
    const d2 = new THREE.Vector2(o2.x - vtx.x, o2.y - vtx.y).normalize();
    const arc = arcPoints(vtx, d1, d2, arcR);
    group.add(highlight(arc, COLORS.angle, 3, mats));
    const mid = arc[Math.floor(arc.length / 2)];
    const inward = new THREE.Vector2(mid.x - vtx.x, mid.y - vtx.y).normalize();
    const hit = hitSphere(mid, size * 0.035, id);
    group.add(hit);
    hits.push({ object: hit, dimId: id });
    anchors[id] = v3(vtx.x - inward.x * arcR * 2.2, vtx.y - inward.y * arcR * 2.2);
  }

  // Flat shapes open straight-on, so lengths and angles read true; drag to tilt into 3D.
  const cameraPosition = v3(0, 0, size * 2.0);
  return finish(group, hits, anchors, v3(0, 0), Math.max(size, 1), cameraPosition, mats, 'xy', -size * 0.02);
}

/* ---------- circle ---------- */

export function buildCircleScene(p: CircleParams): SceneBuild {
  const r = p.r;
  const group = new THREE.Group();
  const mats: LineMaterial[] = [];
  const hits: SceneBuild['hits'] = [];
  const anchors: Record<string, THREE.Vector3> = {};

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(r, 160),
    new THREE.MeshBasicMaterial({ color: COLORS.face, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  group.add(disc);

  const ring: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    ring.push(v3(r * Math.cos(t), r * Math.sin(t)));
  }
  group.add(highlight(ring, COLORS.outline, 2, mats));

  // Radius at 35 degrees
  const t = (35 * Math.PI) / 180;
  const rEnd = v3(r * Math.cos(t), r * Math.sin(t));
  const origin = v3(0, 0);
  group.add(highlight([origin, rEnd], COLORS.radius, 4, mats));
  const rHit = hitLine(origin, rEnd, 'radius');
  group.add(rHit);
  hits.push({ object: rHit, dimId: 'radius' });
  anchors.radius = v3(rEnd.x * 0.5 - Math.sin(t) * r * 0.14, rEnd.y * 0.5 + Math.cos(t) * r * 0.14);

  // Diameter along the x-axis
  const dA = v3(-r, 0);
  const dB = v3(r, 0);
  group.add(highlight([dA, dB], COLORS.side, 4, mats));
  const dHit = hitLine(dA, dB, 'diameter');
  group.add(dHit);
  hits.push({ object: dHit, dimId: 'diameter' });
  anchors.diameter = v3(0, -r - r * 0.12);

  const cameraPosition = v3(0, 0, Math.max(2 * r, 1) * 2.0);
  return finish(group, hits, anchors, v3(0, 0), Math.max(2 * r, 1), cameraPosition, mats, 'xy', -r * 0.02);
}

/* ---------- regular polygon ---------- */

export function buildPolygonScene(p: PolygonParams): SceneBuild {
  const n = p.n;
  const R = p.s / (2 * Math.sin(Math.PI / n));
  const verts: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const t = -Math.PI / 2 + ((2 * k + 1) * Math.PI) / n;
    verts.push(v3(R * Math.cos(t), R * Math.sin(t)));
  }

  const group = new THREE.Group();
  const mats: LineMaterial[] = [];
  const hits: SceneBuild['hits'] = [];
  const anchors: Record<string, THREE.Vector3> = {};

  const shape = new THREE.Shape(verts.map((v) => new THREE.Vector2(v.x, v.y)));
  group.add(
    new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: COLORS.face, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    )
  );
  group.add(highlight([...verts, verts[0]], COLORS.outline, 2, mats));

  // Every side is the same length; the bottom side is drawn for the label.
  const sideHits: THREE.Object3D[] = [];
  for (let k = 0; k < n; k++) {
    const a = verts[k];
    const b = verts[(k + 1) % n];
    const h = hitLine(a, b, 'side');
    group.add(h);
    sideHits.push(h);
  }
  const bottomA = verts[n - 1];
  const bottomB = verts[0];
  group.add(highlight([bottomA, bottomB], COLORS.side, 5, mats));
  // All sides are tappable and all change together.
  sideHits.forEach((h) => hits.push({ object: h, dimId: 'side' }));
  anchors.side = v3(0, -R * Math.cos(Math.PI / n) - p.s * 0.22);

  // Circumradius from the centre to vertex 0
  const v0 = verts[0];
  group.add(highlight([v3(0, 0), v0], COLORS.radius, 4, mats));
  const rHit = hitLine(v3(0, 0), v0, 'radius');
  group.add(rHit);
  hits.push({ object: rHit, dimId: 'radius' });
  // Offset the radius label to one side of its line, so the line stays readable.
  const rLen = Math.hypot(v0.x, v0.y);
  const perp = new THREE.Vector2(-v0.y / rLen, v0.x / rLen).multiplyScalar(-p.s * 0.28);
  anchors.radius = v3(v0.x * 0.5 + perp.x, v0.y * 0.5 + perp.y);

  // Interior angle at vertex 0, between the bottom side and the next side.
  const vtx = verts[0];
  const d1 = new THREE.Vector2(verts[n - 1].x - vtx.x, verts[n - 1].y - vtx.y).normalize();
  const d2 = new THREE.Vector2(verts[1].x - vtx.x, verts[1].y - vtx.y).normalize();
  const arcR = p.s * 0.45;
  const arc = arcPoints(vtx, d1, d2, arcR);
  group.add(highlight(arc, COLORS.angle, 3, mats));
  const mid = arc[Math.floor(arc.length / 2)];
  const hit = hitSphere(mid, p.s * 0.09, 'interior');
  group.add(hit);
  hits.push({ object: hit, dimId: 'interior' });
  const inward = new THREE.Vector2(mid.x - vtx.x, mid.y - vtx.y).normalize();
  anchors.interior = v3(vtx.x - inward.x * arcR * 2.2, vtx.y - inward.y * arcR * 2.2);

  const cameraPosition = v3(0, 0, Math.max(2 * R, 1) * 2.0);
  return finish(group, hits, anchors, v3(0, 0), Math.max(2 * R, 1), cameraPosition, mats, 'xy', -R * 0.02);
}

/* ---------- frustum ---------- */

export function buildFrustumScene(p: FrustumParams): SceneBuild {
  const { r1, r2, h } = p;
  const group = new THREE.Group();
  const mats: LineMaterial[] = [];
  const hits: SceneBuild['hits'] = [];
  const anchors: Record<string, THREE.Vector3> = {};
  const size = Math.max(2 * r1, h);

  const geo = new THREE.CylinderGeometry(r2, r1, h, 96, 1, false);
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: COLORS.face, transparent: true, opacity: 0.28, roughness: 0.6, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide })
  );
  group.add(body);
  const edges = new THREE.EdgesGeometry(geo, 25);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLORS.outline, transparent: true, opacity: 0.8 }));
  group.add(edgeLines);

  const top = h / 2;
  const bottom = -h / 2;

  // Bottom radius: centre of the base to the rim.
  const bc = v3(0, bottom);
  const br = v3(r1, bottom);
  group.add(highlight([bc, br], COLORS.radius, 4, mats));
  const brHit = hitLine(bc, br, 'radius-bottom');
  group.add(brHit);
  hits.push({ object: brHit, dimId: 'radius-bottom' });
  anchors['radius-bottom'] = v3(r1 * 0.5, bottom - size * 0.07);

  // Top radius: centre of the top to its rim.
  const tc = v3(0, top);
  const tr = v3(r2, top);
  group.add(highlight([tc, tr], COLORS.radius, 4, mats));
  const trHit = hitLine(tc, tr, 'radius-top');
  group.add(trHit);
  hits.push({ object: trHit, dimId: 'radius-top' });
  anchors['radius-top'] = v3(r2 * 0.5, top + size * 0.07);

  // Slanted side on the front (z = 0), from the bottom rim to the top rim.
  const sA = v3(r1, bottom);
  const sB = v3(r2, top);
  group.add(highlight([sA, sB], COLORS.side, 4, mats));
  const sHit = hitLine(sA, sB, 'slant');
  group.add(sHit);
  hits.push({ object: sHit, dimId: 'slant' });
  const sMid = v3((sA.x + sB.x) / 2, (sA.y + sB.y) / 2);
  const sDir = new THREE.Vector2(sB.x - sA.x, sB.y - sA.y).normalize();
  const sOut = new THREE.Vector2(-sDir.y, sDir.x); // left normal, away from the axis
  const outward = sOut.x < 0 ? sOut.clone().negate() : sOut.clone();
  anchors.slant = v3(sMid.x + outward.x * size * 0.16, sMid.y + outward.y * size * 0.16);

  // Height: a dimension line to the right of the shape with ticks at both ends.
  const hx = Math.max(r1, r2) + size * 0.2;
  const hA = v3(hx, bottom);
  const hB = v3(hx, top);
  group.add(highlight([hA, hB], COLORS.radius, 3, mats));
  group.add(highlight([v3(r1, bottom), v3(hx + size * 0.03, bottom)], COLORS.radius, 1.5, mats));
  group.add(highlight([v3(r2, top), v3(hx + size * 0.03, top)], COLORS.radius, 1.5, mats));
  const hHit = hitLine(hA, hB, 'height');
  group.add(hHit);
  hits.push({ object: hHit, dimId: 'height' });
  anchors.height = v3(hx + size * 0.12, 0);

  // Rim angle at the bottom right: between the base (towards the axis) and the slanted side.
  const rimR = Math.min(h, r1) * 0.3 + size * 0.04;
  const baseDir = new THREE.Vector2(-1, 0);
  const slantDir = new THREE.Vector2(r2 - r1, h).normalize();
  const arc = arcPoints(sA, baseDir, slantDir, rimR);
  group.add(highlight(arc, COLORS.angle, 3, mats));
  const amid = arc[Math.floor(arc.length / 2)];
  const aHit = hitSphere(amid, size * 0.035, 'rim-angle');
  group.add(aHit);
  hits.push({ object: aHit, dimId: 'rim-angle' });
  const inward = new THREE.Vector2(amid.x - sA.x, amid.y - sA.y).normalize();
  anchors['rim-angle'] = v3(sA.x - inward.x * rimR * 2.4, sA.y - inward.y * rimR * 2.4);

  const cameraPosition = v3(size * 0.7, size * 0.35, size * 2.1);
  const build = finish(group, hits, anchors, v3(0, 0), Math.max(size, 1), cameraPosition, mats, 'xz', bottom - size * 0.12);
  // Front-facing shape: ensure the frustum's own material is disposed too.
  void frustumRimAngle;
  return build;
}


/* ---------- 3D solids ---------- */

/** A measurable length drawn on a solid: a highlighted segment, a tap target and a label spot. */
interface Seg {
  id: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
  color: number;
  /** Fixed direction to push the label away from the segment. Defaults to away from the centre. */
  out?: THREE.Vector3;
}

const fromTuple = (t: V3) => new THREE.Vector3(t[0], t[1], t[2]);

/**
 * Shared builder for every solid: shaded translucent body, bold edges, vertex dots,
 * then one highlight + tap target + label anchor per measurable length.
 */
function buildSolid(opts: {
  geometry: THREE.BufferGeometry;
  /** Hard edges to draw, as line segments. Pass null to skip (smooth shapes draw their own wire). */
  edges?: THREE.BufferGeometry | null;
  wire?: THREE.Object3D[];
  vertices?: THREE.Vector3[];
  segs: Seg[];
  flat: boolean;
  size: number;
  minY: number;
  cameraPosition: THREE.Vector3;
}): SceneBuild {
  const { geometry, segs, size } = opts;
  const group = new THREE.Group();
  const mats: LineMaterial[] = [];
  const hits: SceneBuild['hits'] = [];
  const anchors: Record<string, THREE.Vector3> = {};

  // Shaded body: lit from several sides so every face reads, and see-through so the back edges show.
  group.add(
    new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: COLORS.face,
        transparent: true,
        opacity: 0.5,
        roughness: 0.45,
        metalness: 0.1,
        flatShading: opts.flat,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );
  const edgeGeo = opts.edges === undefined ? new THREE.EdgesGeometry(geometry, 20) : opts.edges;
  if (edgeGeo) {
    group.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: COLORS.outline, transparent: true, opacity: 0.95 })));
  }
  opts.wire?.forEach((w) => group.add(w));

  const dot = new THREE.SphereGeometry(size * 0.014, 10, 10);
  const dotMat = new THREE.MeshBasicMaterial({ color: COLORS.outline });
  opts.vertices?.forEach((v) => {
    const m = new THREE.Mesh(dot, dotMat);
    m.position.copy(v);
    group.add(m);
  });

  for (const seg of segs) {
    group.add(highlight([seg.a, seg.b], seg.color, 4, mats));
    const hit = hitLine(seg.a, seg.b, seg.id);
    group.add(hit);
    hits.push({ object: hit, dimId: seg.id });
    const mid = seg.a.clone().add(seg.b).multiplyScalar(0.5);
    let out = seg.out ? seg.out.clone() : mid.clone();
    if (out.lengthSq() < 1e-9) out = new THREE.Vector3(0, 1, 0);
    anchors[seg.id] = mid.add(out.normalize().multiplyScalar(size * 0.1));
  }

  const center = new THREE.Vector3(0, 0, 0);
  return finish(group, hits, anchors, center, Math.max(size, 1), opts.cameraPosition, mats, 'xz', opts.minY - size * 0.04);
}

/** Build the body, edges and vertex dots of a convex polyhedron from its pure geometry. */
function polyGeometry(poly: Poly) {
  const positions: number[] = [];
  for (const f of poly.faces) {
    for (let k = 1; k < f.length - 1; k++) {
      for (const i of [f[0], f[k], f[k + 1]]) positions.push(...poly.verts[i]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals(); // non-indexed, so every face keeps a crisp flat normal
  return geo;
}

/** Polygon outlines drawn per face, so the edges of pentagons and quads show without diagonals. */
function polyOutline(poly: Poly) {
  const pts: number[] = [];
  for (const f of poly.faces) {
    for (let k = 0; k < f.length; k++) pts.push(...poly.verts[f[k]], ...poly.verts[f[(k + 1) % f.length]]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

function buildPolyScene(poly: Poly, segs: Seg[], size: number): SceneBuild {
  const verts = poly.verts.map(fromTuple);
  const minY = Math.min(...verts.map((v) => v.y));
  return buildSolid({
    geometry: polyGeometry(poly),
    edges: polyOutline(poly),
    vertices: verts,
    segs,
    flat: true,
    size,
    minY,
    cameraPosition: new THREE.Vector3(size * 1.25, size * 0.95, size * 1.9),
  });
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildCubeScene(p: CubeParams): SceneBuild {
  const poly = cuboidPoly(p.a, p.a, p.a);
  const v = poly.verts.map(fromTuple);
  return buildPolyScene(
    poly,
    [
      { id: 'edge', a: v[4], b: v[5], color: COLORS.side },
      { id: 'diag-face', a: v[4], b: v[7], color: COLORS.radius, out: V(0, 0.3, 1) },
      { id: 'diag-space', a: v[0], b: v[7], color: COLORS.angle, out: V(0.6, 0.8, 0) },
    ],
    p.a * Math.sqrt(3)
  );
}

export function buildCuboidScene(p: CuboidParams): SceneBuild {
  const poly = cuboidPoly(p.l, p.w, p.h);
  const v = poly.verts.map(fromTuple);
  return buildPolyScene(
    poly,
    [
      { id: 'length', a: v[4], b: v[5], color: COLORS.side },
      { id: 'width', a: v[5], b: v[1], color: COLORS.radius },
      { id: 'height', a: v[4], b: v[6], color: COLORS.radius },
      { id: 'diag-space', a: v[0], b: v[7], color: COLORS.angle, out: V(0.6, 0.8, 0) },
    ],
    Math.max(p.l, p.w, p.h, Math.sqrt(p.l ** 2 + p.w ** 2 + p.h ** 2) * 0.8)
  );
}

export function buildRegularScene(shape: 'tetrahedron' | 'octahedron' | 'icosahedron' | 'dodecahedron', p: RegularParams): SceneBuild {
  const a = p.a;
  const poly = { tetrahedron: tetrahedronPoly, octahedron: octahedronPoly, icosahedron: icosahedronPoly, dodecahedron: dodecahedronPoly }[shape](a);
  const v = poly.verts.map(fromTuple);
  const origin = V(0, 0, 0);
  const R = Math.max(...v.map((x) => x.length()));
  const size = 2 * R;
  const segs: Seg[] = [];

  if (shape === 'tetrahedron') {
    const h = a * Math.sqrt(2 / 3);
    segs.push({ id: 'edge', a: v[2], b: v[3], color: COLORS.side });
    segs.push({ id: 'height', a: V(0, -h / 2, 0), b: v[0], color: COLORS.radius, out: V(1, 0, 0.4) });
    segs.push({ id: 'radius', a: origin, b: v[1], color: COLORS.angle, out: V(0, 1, 0) });
  } else if (shape === 'octahedron') {
    // v[0]/v[1] are ±x, v[2]/v[3] are bottom/top, v[4]/v[5] are ±z.
    segs.push({ id: 'edge', a: v[0], b: v[4], color: COLORS.side });
    segs.push({ id: 'diagonal', a: v[2], b: v[3], color: COLORS.radius, out: V(-1, 0, 0.4) });
    segs.push({ id: 'radius', a: origin, b: v[1], color: COLORS.angle, out: V(0, 1, 0) });
  } else {
    // Any edge works as the highlighted one; take the first pair of adjacent vertices.
    let pair: [number, number] = [0, 1];
    outer: for (let i = 0; i < v.length; i++)
      for (let j = i + 1; j < v.length; j++)
        if (Math.abs(v[i].distanceTo(v[j]) - a) < a * 1e-6) {
          pair = [i, j];
          break outer;
        }
    const far = v
      .map((x, i) => ({ i, y: x.y }))
      .filter((x) => x.i !== pair[0] && x.i !== pair[1])
      .sort((m, n) => n.y - m.y)[0].i;
    segs.push({ id: 'edge', a: v[pair[0]], b: v[pair[1]], color: COLORS.side });
    segs.push({ id: 'radius', a: origin, b: v[far], color: COLORS.radius, out: V(1, 0.2, 0.4) });
  }
  return buildPolyScene(poly, segs, size);
}

export function buildPyramidScene(p: PyramidParams): SceneBuild {
  const poly = pyramidPoly(p.l, p.w, p.h);
  const v = poly.verts.map(fromTuple);
  return buildPolyScene(
    poly,
    [
      { id: 'length', a: v[3], b: v[2], color: COLORS.side },
      { id: 'width', a: v[2], b: v[1], color: COLORS.radius },
      { id: 'height', a: V(0, -p.h / 2, 0), b: v[4], color: COLORS.radius, out: V(-1, 0, 0.5) },
      { id: 'lateral', a: v[2], b: v[4], color: COLORS.angle, out: V(1, 0.4, 0.6) },
    ],
    Math.max(p.l, p.w, p.h)
  );
}

export function buildPrismScene(p: PrismParams): SceneBuild {
  const poly = prismPoly(p.b, p.t, p.L);
  const v = poly.verts.map(fromTuple);
  return buildPolyScene(
    poly,
    [
      { id: 'base', a: v[0], b: v[1], color: COLORS.side },
      { id: 'tri-height', a: V(0, -p.t / 2, p.L / 2), b: v[2], color: COLORS.radius, out: V(-1, 0.2, 0.8) },
      { id: 'length', a: v[1], b: v[4], color: COLORS.radius },
      { id: 'slant', a: v[1], b: v[2], color: COLORS.angle, out: V(1, 0.4, 0.4) },
    ],
    Math.max(p.b, p.t, p.L)
  );
}

/** Faint latitude and longitude rings, so a round solid still reads as a solid. */
function ring(radius: number, axis: 'x' | 'y' | 'z', y = 0) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const c = Math.cos(t) * radius;
    const s = Math.sin(t) * radius;
    pts.push(axis === 'y' ? V(c, y, s) : axis === 'x' ? V(y, c, s) : V(c, s, y));
  }
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: COLORS.outline, transparent: true, opacity: 0.35 }));
  return line;
}

export function buildCylinderScene(p: CylinderParams): SceneBuild {
  const { r, h } = p;
  const size = Math.max(2 * r, h);
  return buildSolid({
    geometry: new THREE.CylinderGeometry(r, r, h, 64, 1, false),
    wire: [ring(r, 'y', -h / 2), ring(r, 'y', h / 2)],
    segs: [
      { id: 'radius', a: V(0, h / 2, 0), b: V(r, h / 2, 0), color: COLORS.radius, out: V(0, 1, 0.3) },
      { id: 'diameter', a: V(-r, -h / 2, 0), b: V(r, -h / 2, 0), color: COLORS.side, out: V(0, -1, 0.4) },
      { id: 'height', a: V(0, -h / 2, 0), b: V(0, h / 2, 0), color: COLORS.angle, out: V(-1, 0, 0.3) },
    ],
    flat: false,
    edges: null,
    size,
    minY: -h / 2,
    cameraPosition: V(size * 1.25, size * 0.95, size * 1.9),
  });
}

export function buildConeScene(p: ConeParams): SceneBuild {
  const { r, h } = p;
  const size = Math.max(2 * r, h);
  const apex = V(0, h / 2, 0);
  return buildSolid({
    geometry: new THREE.ConeGeometry(r, h, 64, 1, false),
    wire: [ring(r, 'y', -h / 2)],
    segs: [
      { id: 'radius', a: V(0, -h / 2, 0), b: V(r, -h / 2, 0), color: COLORS.radius, out: V(0, -1, 0.4) },
      { id: 'height', a: V(0, -h / 2, 0), b: apex, color: COLORS.angle, out: V(-1, 0, 0.3) },
      { id: 'slant', a: V(r, -h / 2, 0), b: apex, color: COLORS.side, out: V(1, 0.3, 0) },
    ],
    vertices: [apex],
    flat: false,
    edges: null,
    size,
    minY: -h / 2,
    cameraPosition: V(size * 1.25, size * 0.95, size * 1.9),
  });
}

export function buildSphereScene(p: SphereParams): SceneBuild {
  const r = p.r;
  const size = 2 * r;
  const u = V(0.6, 0.64, 0.48).multiplyScalar(r);
  return buildSolid({
    geometry: new THREE.SphereGeometry(r, 48, 32),
    wire: [ring(r, 'y', 0), ring(r, 'x', 0), ring(r, 'z', 0)],
    segs: [
      { id: 'radius', a: V(0, 0, 0), b: u, color: COLORS.radius, out: V(-0.6, 0.5, 0.6) },
      { id: 'diameter', a: V(-r, 0, 0), b: V(r, 0, 0), color: COLORS.side, out: V(0, -1, 0.5) },
    ],
    vertices: [V(0, 0, 0)],
    flat: false,
    edges: null,
    size,
    minY: -r,
    cameraPosition: V(size * 1.25, size * 0.95, size * 1.9),
  });
}

export function buildScene(shape: ShapeId, params: unknown): SceneBuild {
  switch (shape) {
    case 'triangle':
      return buildTriangleScene(params as TriangleParams);
    case 'circle':
      return buildCircleScene(params as CircleParams);
    case 'polygon':
      return buildPolygonScene(params as PolygonParams);
    case 'frustum':
      return buildFrustumScene(params as FrustumParams);
    case 'cube':
      return buildCubeScene(params as CubeParams);
    case 'cuboid':
      return buildCuboidScene(params as CuboidParams);
    case 'tetrahedron':
    case 'octahedron':
    case 'icosahedron':
    case 'dodecahedron':
      return buildRegularScene(shape, params as RegularParams);
    case 'pyramid':
      return buildPyramidScene(params as PyramidParams);
    case 'prism':
      return buildPrismScene(params as PrismParams);
    case 'cylinder':
      return buildCylinderScene(params as CylinderParams);
    case 'cone':
      return buildConeScene(params as ConeParams);
    case 'sphere':
      return buildSphereScene(params as SphereParams);
  }
}
