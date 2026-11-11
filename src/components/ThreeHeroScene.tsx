import React, { useEffect, useRef, useState } from 'react';
import { Box } from 'lucide-react';
import { StatePanel } from './StatePanel.tsx';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  RotateCcw,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Compass,
  Boxes,
  Eye
} from 'lucide-react';

export type GeometryPreset = 'dual_polyhedron' | 'torus_knot' | 'vector_gimbal';

export const ThreeHeroScene: React.FC = () => {
  const [webglSupported, setWebglSupported] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // UI state for floating collapsible dock (<= 15% viewport footprint)
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<GeometryPreset>('dual_polyhedron');
  const [explodedAmount, setExplodedAmount] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [wireframeMode, setWireframeMode] = useState(false);

  // Refs to hold mutable parameters accessed by render loop without rebuilding Three.js
  const paramsRef = useRef({
    preset: 'dual_polyhedron' as GeometryPreset,
    exploded: 0,
    speed: 1,
    wireframe: false,
    cameraAngleTarget: 0
  });

  useEffect(() => {
    paramsRef.current.preset = activePreset;
    paramsRef.current.exploded = explodedAmount;
    paramsRef.current.speed = rotationSpeed;
    paramsRef.current.wireframe = wireframeMode;
  }, [activePreset, explodedAmount, rotationSpeed, wireframeMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Without WebGL 2 the scene cannot draw; explain instead of failing.
    if (!document.createElement('canvas').getContext('webgl2')) {
      setWebglSupported(false);
      return;
    }

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Scene, Renderer & Color Pipeline
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);
    scene.fog = new THREE.FogExp2(0x0b0d12, 0.04);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 580;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    const isPhone = window.matchMedia('(max-width: 640px)').matches;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isPhone ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Mandatory Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 7.8);
    camera.lookAt(0, 0.8, 0);

    // 5. Studio Lighting Rig (Warm key + cool hemisphere fill)
    const hemiLight = new THREE.HemisphereLight(0x2dd4bf, 0x0b0d12, 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 25;
      const d = 4.5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.4);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    // 6. Ground Shadow & Contact Plane
    // Procedural radial shadow canvas texture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d')!;
    const gradient = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = gradient;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.2;
    scene.add(shadowPlane);

    // Subtle coordinate floor grid for mathematical architectural presence
    const gridHelper = new THREE.GridHelper(14, 28, 0x1f4d48, 0x0f2a28);
    gridHelper.position.y = -1.21;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    scene.add(gridHelper);

    // 7. Composite 3-12 Part Procedural Geometric Model
    // Group parent positioned slightly above floor
    const rootAssembly = new THREE.Group();
    rootAssembly.position.y = 0.8;
    scene.add(rootAssembly);

    // Part 1: Outer Gimbal Ring (Brass with tick marks)
    const outerRingGeo = new THREE.TorusGeometry(2.4, 0.065, 24, 96);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      metalness: 0.88,
      roughness: 0.22,
      wireframe: false
    });
    const outerRing = new THREE.Mesh(outerRingGeo, brassMat);
    outerRing.castShadow = !isSoftwareGl;
    rootAssembly.add(outerRing);

    // Part 2: Middle Gimbal Ring (Blued Titanium)
    const midRingGeo = new THREE.TorusGeometry(2.0, 0.055, 20, 80);
    const bluedSteelMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      metalness: 0.92,
      roughness: 0.18,
      wireframe: false
    });
    const midRing = new THREE.Mesh(midRingGeo, bluedSteelMat);
    midRing.rotation.x = Math.PI / 3;
    rootAssembly.add(midRing);

    // Part 3: Inner Orbital Ring (Polished Chrome)
    const innerRingGeo = new THREE.TorusGeometry(1.65, 0.045, 16, 64);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe7eaf1,
      metalness: 0.96,
      roughness: 0.1,
      wireframe: false
    });
    const innerRing = new THREE.Mesh(innerRingGeo, chromeMat);
    innerRing.rotation.y = Math.PI / 4;
    rootAssembly.add(innerRing);

    // Part 4: Dual Polyhedron - Outer Icosahedron Wireframe / Facets
    const icoGeo = new THREE.IcosahedronGeometry(1.15, 0);
    const icoMat = new THREE.MeshPhysicalMaterial({
      color: 0x2dd4bf,
      metalness: 0.45,
      roughness: 0.35,
      transmission: isSoftwareGl ? 0 : 0.45,
      transparent: true,
      opacity: isSoftwareGl ? 0.7 : 0.85,
      ior: 1.5,
      wireframe: false
    });
    const icosahedronMesh = new THREE.Mesh(icoGeo, icoMat);
    rootAssembly.add(icosahedronMesh);

    // Part 5: Inner Dual Dodecahedron Core
    const dodecaGeo = new THREE.DodecahedronGeometry(0.72, 0);
    const goldCoreMat = new THREE.MeshStandardMaterial({
      color: 0xd4ff3a,
      metalness: 0.9,
      roughness: 0.25,
      wireframe: false
    });
    const dodecaMesh = new THREE.Mesh(dodecaGeo, goldCoreMat);
    rootAssembly.add(dodecaMesh);

    // Part 6: Center Octahedral Radiant Crystalline Node
    const octaGeo = new THREE.OctahedronGeometry(0.38, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xd4ff3a,
      metalness: 0.3,
      roughness: 0.15,
      emissive: 0xd4ff3a,
      emissiveIntensity: 0.4
    });
    const octaMesh = new THREE.Mesh(octaGeo, crystalMat);
    rootAssembly.add(octaMesh);

    // Part 7: Vertex Node Spheres (InstancedMesh for golden vertices)
    const icoPos = icoGeo.attributes.position;
    const vertexCount = icoPos.count;
    const sphereGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1
    });
    const nodeSpheres = new THREE.InstancedMesh(sphereGeo, sphereMat, vertexCount);
    const dummyMat4 = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    for (let i = 0; i < vertexCount; i++) {
      tempPos.fromBufferAttribute(icoPos, i);
      dummyMat4.setPosition(tempPos);
      nodeSpheres.setMatrixAt(i, dummyMat4);
    }
    nodeSpheres.instanceMatrix.needsUpdate = true;
    rootAssembly.add(nodeSpheres);

    // Part 8: Alternate Model (Parametric Torus Knot)
    const knotGeo = new THREE.TorusKnotGeometry(1.05, 0.26, 120, 24, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      metalness: 0.75,
      roughness: 0.28,
      wireframe: false
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    knotMesh.visible = false;
    rootAssembly.add(knotMesh);

    // 8. Interactive Mouse Drag & Subtle Rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0;
    let targetRotX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      targetRotY += deltaX * 0.007;
      targetRotX += deltaY * 0.007;
      targetRotX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotX));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop with Exponential Damping & Software WebGL Pacing
    let frameId = 0;
    let running = true;
    let isOnScreen = true;
    // Resume the loop only when the scene is visible and the tab is active
    const resumeIfVisible = () => {
      if (isOnScreen && !document.hidden && !running) {
        running = true;
        tick();
      }
    };
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const currentParams = paramsRef.current;
      const speedMult = currentParams.speed;

      // Smooth damped rotation
      targetRotY += 0.35 * delta * speedMult;
      rootAssembly.rotation.y = THREE.MathUtils.damp(
        rootAssembly.rotation.y,
        targetRotY,
        4.0,
        delta
      );
      rootAssembly.rotation.x = THREE.MathUtils.damp(
        rootAssembly.rotation.x,
        targetRotX,
        4.0,
        delta
      );

      // Differential gimbal counter-rotation
      outerRing.rotation.z += 0.2 * delta * speedMult;
      midRing.rotation.x += 0.3 * delta * speedMult;
      innerRing.rotation.y += 0.45 * delta * speedMult;
      octaMesh.rotation.y -= 0.6 * delta * speedMult;
      octaMesh.rotation.z += 0.4 * delta * speedMult;

      // Handle Preset Visibility & Switching
      if (currentParams.preset === 'torus_knot') {
        knotMesh.visible = true;
        icosahedronMesh.visible = false;
        dodecaMesh.visible = false;
        octaMesh.visible = false;
        nodeSpheres.visible = false;
        outerRing.visible = true;
        midRing.visible = true;
      } else {
        knotMesh.visible = false;
        icosahedronMesh.visible = true;
        dodecaMesh.visible = true;
        octaMesh.visible = true;
        nodeSpheres.visible = true;
        outerRing.visible = true;
        midRing.visible = true;
      }

      // Handle Exploded View separation
      const exp = currentParams.exploded; // 0 to 1
      outerRing.scale.setScalar(1 + exp * 0.4);
      midRing.scale.setScalar(1 + exp * 0.25);
      icosahedronMesh.scale.setScalar(1 + exp * 0.3);
      dodecaMesh.scale.setScalar(1 - exp * 0.15);
      nodeSpheres.scale.setScalar(1 + exp * 0.3);

      // Wireframe toggle
      brassMat.wireframe = currentParams.wireframe;
      bluedSteelMat.wireframe = currentParams.wireframe;
      icoMat.wireframe = currentParams.wireframe;
      goldCoreMat.wireframe = currentParams.wireframe;
      knotMat.wireframe = currentParams.wireframe;

      // Render
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else if (isOnScreen && !document.hidden) {
        frameId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    tick();

    const observer = new IntersectionObserver(([entry]) => {
      isOnScreen = entry.isIntersecting;
      if (isOnScreen) resumeIfVisible();
    });
    observer.observe(container);
    document.addEventListener('visibilitychange', resumeIfVisible);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', resumeIfVisible);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!webglSupported) {
    return (
      <StatePanel
        icon={<Box className="h-5 w-5" />}
        title="3D needs WebGL"
        body="This browser cannot draw 3D graphics. Try a current version of Chrome, Edge, Firefox, or Safari. The graphs and calculators still work."
      />
    );
  }

  return (
    <div className="relative w-full h-[580px] bg-slate-950 overflow-hidden select-none border-b border-slate-800/80">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Mathematical Spec Badge */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-geometry uppercase tracking-wider">
          <span>3D geometry</span>
          <span aria-hidden="true">·</span>
          <span>Shapes you can rotate</span>
        </div>
        <p className="text-sm font-medium text-slate-300">
          Spin the gyroscope and explore symmetry
        </p>
      </div>

      {/* Interactive Hint Top-Right */}
      <div className="absolute top-6 right-6 z-10 hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
        <Eye className="w-3.5 h-3.5 text-indigo-400" />
        <span>Drag to rotate · Explore spatial geometry</span>
      </div>

      {/* Unified Ergonomic Collapsible Bottom Control Dock (<= 15% Viewport footprint) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-3xl transition-transform duration-300 ease-out ${
          isDockCollapsed ? 'translate-y-[calc(100%-32px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Tab */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 py-1 text-xs"
            aria-label={isDockCollapsed ? 'Show Controls' : 'Hide Controls'}
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Solid Control Bar (No CSS backdrop-filter to ensure 60fps on software WebGL) */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-5 py-3 shadow-xl flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Preset Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" /> Model:
            </span>
            <button
              onClick={() => setActivePreset('dual_polyhedron')}
              className={`btn btn-ghost btn-sm ${ activePreset === 'dual_polyhedron' ? 'bg-indigo-600 text-canvas' : 'text-slate-400 hover:text-white bg-slate-800/80' }`}
            >
              Dual Polyhedron
            </button>
            <button
              onClick={() => setActivePreset('torus_knot')}
              className={`btn btn-ghost btn-sm ${ activePreset === 'torus_knot' ? 'bg-indigo-600 text-canvas' : 'text-slate-400 hover:text-white bg-slate-800/80' }`}
            >
              Parametric Knot
            </button>
          </div>

          {/* Exploded Separation Slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" /> Explode:
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={explodedAmount}
              onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer"
              aria-label="Exploded separation slider"
            />
            <span className="font-sans tabular-nums text-slate-300 w-8 tabular-nums">
              {(explodedAmount * 100).toFixed(0)}%
            </span>
          </div>

          {/* Speed Multiplier Slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> Speed:
            </span>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.25"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
              className="w-16 accent-indigo-500 cursor-pointer"
              aria-label="Rotation speed multiplier"
            />
            <span className="font-sans tabular-nums text-slate-300 w-6 tabular-nums">{rotationSpeed}x</span>
          </div>

          {/* Wireframe Mode Toggle */}
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`btn btn-ghost btn-sm flex items-center gap-1.5 ${ wireframeMode ? 'bg-indigo-500 text-canvas' : 'bg-slate-800 text-slate-300 hover:text-white' }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wireframe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
