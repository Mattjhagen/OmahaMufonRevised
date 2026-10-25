import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Eye, Layers, RotateCcw, ChevronDown, ChevronUp, Sun, Sparkles, Compass } from 'lucide-react';

export type CraftModelType = 'triangle' | 'orb' | 'disc' | 'commercial';

interface Sighting3DViewerProps {
  initialModel?: CraftModelType;
  onClose?: () => void;
}

export const Sighting3DViewer: React.FC<Sighting3DViewerProps> = ({
  initialModel = 'triangle',
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeModel, setActiveModel] = useState<CraftModelType>(initialModel);
  const [materialFinish, setMaterialFinish] = useState<'stealth' | 'titanium' | 'luminescent' | 'alloy'>('stealth');
  const [explodedAmount, setExplodedAmount] = useState<number>(0);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'night_twilight' | 'high_altitude'>('night_twilight');

  // Three.js instance references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const explodedPartsRef = useRef<{ mesh: THREE.Object3D; originalPos: THREE.Vector3; explodeDir: THREE.Vector3 }[]>([]);
  const targetExplodeRef = useRef<number>(0);

  // Sync state to ref for animation loop
  useEffect(() => {
    targetExplodeRef.current = explodedAmount;
  }, [explodedAmount]);

  // Build Procedural Multi-Part Models (3-12 parts)
  const buildModel = useCallback((type: CraftModelType, finish: string) => {
    const group = new THREE.Group();
    explodedPartsRef.current = [];

    // Helper material generator
    const getPbrMaterial = (options: {
      color?: number;
      roughness?: number;
      metalness?: number;
      emissive?: number;
      emissiveIntensity?: number;
      clearcoat?: number;
      transmission?: number;
      wireframe?: boolean;
    }) => {
      let baseColor = 0x1e293b;
      let roughness = 0.4;
      let metalness = 0.7;

      if (finish === 'stealth') {
        baseColor = 0x0f172a;
        roughness = 0.85;
        metalness = 0.3;
      } else if (finish === 'titanium') {
        baseColor = 0x94a3b8;
        roughness = 0.25;
        metalness = 0.95;
      } else if (finish === 'luminescent') {
        baseColor = 0xe2e8f0;
        roughness = 0.15;
        metalness = 0.5;
      } else if (finish === 'alloy') {
        baseColor = 0x64748b;
        roughness = 0.35;
        metalness = 0.8;
      }

      return new THREE.MeshPhysicalMaterial({
        color: options.color ?? baseColor,
        roughness: options.roughness ?? roughness,
        metalness: options.metalness ?? metalness,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0,
        clearcoat: options.clearcoat ?? (finish === 'titanium' ? 0.6 : 0.1),
        clearcoatRoughness: 0.1,
      });
    };

    if (type === 'triangle') {
      // 1. Primary Silhouette: Chevron / Delta Main Hull
      const hullShape = new THREE.Shape();
      hullShape.moveTo(0, 3.2); // Nose
      hullShape.lineTo(2.4, -2.2); // Starboard wingtip
      hullShape.lineTo(0, -1.2); // Trailing edge notch
      hullShape.lineTo(-2.4, -2.2); // Port wingtip
      hullShape.closePath();

      const extrudeSettings = {
        depth: 0.45,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.15,
        bevelThickness: 0.15,
      };

      const hullGeom = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
      hullGeom.center();
      const hullMat = getPbrMaterial({ roughness: 0.4, metalness: 0.8 });
      const hullMesh = new THREE.Mesh(hullGeom, hullMat);
      hullMesh.rotation.x = -Math.PI / 2;
      hullMesh.castShadow = true;
      hullMesh.receiveShadow = true;
      group.add(hullMesh);

      explodedPartsRef.current.push({
        mesh: hullMesh,
        originalPos: hullMesh.position.clone(),
        explodeDir: new THREE.Vector3(0, 0, 0),
      });

      // 2. Secondary Silhouette: Ventral Sensor Spine & Cockpit Ridge
      const ridgeGeom = new THREE.BoxGeometry(0.5, 0.25, 3.2);
      const ridgeMat = getPbrMaterial({ roughness: 0.2, metalness: 0.9 });
      const ridgeMesh = new THREE.Mesh(ridgeGeom, ridgeMat);
      ridgeMesh.position.set(0, 0.4, -0.2);
      ridgeMesh.castShadow = true;
      group.add(ridgeMesh);

      explodedPartsRef.current.push({
        mesh: ridgeMesh,
        originalPos: ridgeMesh.position.clone(),
        explodeDir: new THREE.Vector3(0, 1.2, 0),
      });

      // 3-5. Accent Details: 3 Corner Propulsion Lenses / Lights
      const lightGeom = new THREE.CylinderGeometry(0.28, 0.32, 0.1, 16);
      const lightMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: finish === 'luminescent' ? 4 : 2,
        roughness: 0.1,
      });

      const lightPositions = [
        new THREE.Vector3(0, -0.32, -1.9), // Nose ventral emitter
        new THREE.Vector3(1.7, -0.32, 1.3), // Right corner
        new THREE.Vector3(-1.7, -0.32, 1.3), // Left corner
      ];

      lightPositions.forEach((pos, idx) => {
        const emitter = new THREE.Mesh(lightGeom, lightMat);
        emitter.position.copy(pos);
        group.add(emitter);

        explodedPartsRef.current.push({
          mesh: emitter,
          originalPos: emitter.position.clone(),
          explodeDir: new THREE.Vector3(pos.x * 0.8, -1.0, pos.z * 0.8),
        });
      });

      // 6. Central Ventral Plasma Aperture
      const centerApertureGeom = new THREE.TorusGeometry(0.5, 0.08, 16, 32);
      const apertureMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.5,
      });
      const centerAperture = new THREE.Mesh(centerApertureGeom, apertureMat);
      centerAperture.rotation.x = Math.PI / 2;
      centerAperture.position.set(0, -0.32, 0);
      group.add(centerAperture);

      explodedPartsRef.current.push({
        mesh: centerAperture,
        originalPos: centerAperture.position.clone(),
        explodeDir: new THREE.Vector3(0, -1.5, 0),
      });
    } else if (type === 'orb') {
      // 1. Primary: Central Emissive Core
      const coreGeom = new THREE.SphereGeometry(1.2, 32, 32);
      const coreMat = new THREE.MeshPhysicalMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.0,
        roughness: 0.1,
        metalness: 0.2,
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      group.add(coreMesh);

      explodedPartsRef.current.push({
        mesh: coreMesh,
        originalPos: coreMesh.position.clone(),
        explodeDir: new THREE.Vector3(0, 0, 0),
      });

      // 2. Secondary: Outer Translucent Gimbal Lattice
      const ring1Geom = new THREE.TorusGeometry(1.6, 0.08, 16, 64);
      const ringMat = getPbrMaterial({ roughness: 0.2, metalness: 0.95 });
      const ring1 = new THREE.Mesh(ring1Geom, ringMat);
      group.add(ring1);

      explodedPartsRef.current.push({
        mesh: ring1,
        originalPos: ring1.position.clone(),
        explodeDir: new THREE.Vector3(1.4, 0, 0),
      });

      const ring2 = new THREE.Mesh(ring1Geom, ringMat);
      ring2.rotation.x = Math.PI / 2;
      group.add(ring2);

      explodedPartsRef.current.push({
        mesh: ring2,
        originalPos: ring2.position.clone(),
        explodeDir: new THREE.Vector3(0, 1.4, 0),
      });

      // 3. Equatorial Polar Nodes
      const nodeGeom = new THREE.SphereGeometry(0.18, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 3,
      });

      [
        new THREE.Vector3(1.6, 0, 0),
        new THREE.Vector3(-1.6, 0, 0),
        new THREE.Vector3(0, 1.6, 0),
        new THREE.Vector3(0, -1.6, 0),
      ].forEach((pos) => {
        const node = new THREE.Mesh(nodeGeom, nodeMat);
        node.position.copy(pos);
        group.add(node);

        explodedPartsRef.current.push({
          mesh: node,
          originalPos: node.position.clone(),
          explodeDir: pos.clone().normalize().multiplyScalar(1.8),
        });
      });
    } else if (type === 'disc') {
      // 1. Primary: Ellipsoid Disc Hull
      const discGeom = new THREE.CylinderGeometry(2.4, 2.7, 0.4, 48);
      const discMat = getPbrMaterial({ roughness: 0.2, metalness: 0.9 });
      const discMesh = new THREE.Mesh(discGeom, discMat);
      discMesh.castShadow = true;
      group.add(discMesh);

      explodedPartsRef.current.push({
        mesh: discMesh,
        originalPos: discMesh.position.clone(),
        explodeDir: new THREE.Vector3(0, 0, 0),
      });

      // 2. Upper Observation Dome
      const domeGeom = new THREE.SphereGeometry(0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.1,
        clearcoat: 1.0,
      });
      const domeMesh = new THREE.Mesh(domeGeom, domeMat);
      domeMesh.position.set(0, 0.2, 0);
      group.add(domeMesh);

      explodedPartsRef.current.push({
        mesh: domeMesh,
        originalPos: domeMesh.position.clone(),
        explodeDir: new THREE.Vector3(0, 1.4, 0),
      });

      // 3. Lower Power Flange
      const lowerFlangeGeom = new THREE.CylinderGeometry(1.6, 0.8, 0.35, 32);
      const lowerFlangeMat = getPbrMaterial({ roughness: 0.4, metalness: 0.7 });
      const lowerFlange = new THREE.Mesh(lowerFlangeGeom, lowerFlangeMat);
      lowerFlange.position.set(0, -0.35, 0);
      group.add(lowerFlange);

      explodedPartsRef.current.push({
        mesh: lowerFlange,
        originalPos: lowerFlange.position.clone(),
        explodeDir: new THREE.Vector3(0, -1.2, 0),
      });

      // 4. Perimeter Optical Apertures (12 lights around rim)
      const rimLightGeom = new THREE.SphereGeometry(0.08, 12, 12);
      const rimLightMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 2.5,
      });

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 2.5;
        const z = Math.sin(angle) * 2.5;
        const light = new THREE.Mesh(rimLightGeom, rimLightMat);
        light.position.set(x, 0, z);
        group.add(light);

        explodedPartsRef.current.push({
          mesh: light,
          originalPos: light.position.clone(),
          explodeDir: new THREE.Vector3(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5),
        });
      }
    } else {
      // Commercial Comparison: 12-part Twin-Turbofan Jet (Boeing 737 / Cessna Profile)
      // 1. Fuselage
      const fuselageGeom = new THREE.CylinderGeometry(0.42, 0.38, 5.2, 24);
      fuselageGeom.rotateX(Math.PI / 2);
      const civilMat = getPbrMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.6 });
      const fuselage = new THREE.Mesh(fuselageGeom, civilMat);
      fuselage.castShadow = true;
      group.add(fuselage);

      explodedPartsRef.current.push({
        mesh: fuselage,
        originalPos: fuselage.position.clone(),
        explodeDir: new THREE.Vector3(0, 0, 0),
      });

      // 2. Wings (Swept left & right)
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(2.8, -1.2);
      wingShape.lineTo(2.6, -1.5);
      wingShape.lineTo(0, -0.6);
      wingShape.closePath();

      const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
      wingExtrude.center();

      const rightWing = new THREE.Mesh(wingExtrude, civilMat);
      rightWing.rotation.x = Math.PI / 2;
      rightWing.position.set(1.4, -0.05, 0.2);
      group.add(rightWing);

      explodedPartsRef.current.push({
        mesh: rightWing,
        originalPos: rightWing.position.clone(),
        explodeDir: new THREE.Vector3(1.6, 0, 0),
      });

      const leftWing = rightWing.clone();
      leftWing.scale.x = -1;
      leftWing.position.set(-1.4, -0.05, 0.2);
      group.add(leftWing);

      explodedPartsRef.current.push({
        mesh: leftWing,
        originalPos: leftWing.position.clone(),
        explodeDir: new THREE.Vector3(-1.6, 0, 0),
      });

      // 3. Turbofan Engines (Under wings)
      const engineGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.9, 16);
      engineGeom.rotateX(Math.PI / 2);
      const engineMat = getPbrMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.85 });

      const rightEngine = new THREE.Mesh(engineGeom, engineMat);
      rightEngine.position.set(1.0, -0.35, 0.2);
      group.add(rightEngine);

      explodedPartsRef.current.push({
        mesh: rightEngine,
        originalPos: rightEngine.position.clone(),
        explodeDir: new THREE.Vector3(1.0, -1.0, 0),
      });

      const leftEngine = new THREE.Mesh(engineGeom, engineMat);
      leftEngine.position.set(-1.0, -0.35, 0.2);
      group.add(leftEngine);

      explodedPartsRef.current.push({
        mesh: leftEngine,
        originalPos: leftEngine.position.clone(),
        explodeDir: new THREE.Vector3(-1.0, -1.0, 0),
      });

      // 4. Vertical Stabilizer (Tail fin)
      const tailShape = new THREE.Shape();
      tailShape.moveTo(0, 0);
      tailShape.lineTo(0, 1.4);
      tailShape.lineTo(0.5, 1.3);
      tailShape.lineTo(1.1, 0);
      tailShape.closePath();
      const tailExtrude = new THREE.ExtrudeGeometry(tailShape, { depth: 0.06, bevelEnabled: false });
      tailExtrude.center();
      const tailFin = new THREE.Mesh(tailExtrude, civilMat);
      tailFin.position.set(0, 0.85, -2.1);
      group.add(tailFin);

      explodedPartsRef.current.push({
        mesh: tailFin,
        originalPos: tailFin.position.clone(),
        explodeDir: new THREE.Vector3(0, 1.4, -0.8),
      });
    }

    // Grounding plane / contact shadow
    const shadowGeom = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.2;
    group.add(shadowPlane);

    // Center model at origin
    group.position.set(0, 0, 0);
    return group;
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mountRef.current.clientWidth || 900;
    const height = mountRef.current.clientHeight || 560;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.5, 3.8, 6.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. Studio Environment Lighting with PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. 3-Point Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(6, 9, 5);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    rimLight.position.set(0, 7, -6);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.6);
    scene.add(hemiLight);

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 20;
    controls.minDistance = 2;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controlsRef.current = controls;

    // 7. Initial Model Build
    const initialGroup = buildModel(activeModel, materialFinish);
    scene.add(initialGroup);
    modelGroupRef.current = initialGroup;

    // 8. Animation loop with smooth exponential damping for exploded view
    let frameId: number;
    const clock = new THREE.Clock();

    let isUserInteracting = false;
    controls.addEventListener('start', () => {
      isUserInteracting = true;
    });
    controls.addEventListener('end', () => {
      isUserInteracting = false;
    });

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Smooth exploded view damping
      const targetExp = targetExplodeRef.current;
      explodedPartsRef.current.forEach(({ mesh, originalPos, explodeDir }) => {
        const targetPos = originalPos.clone().add(explodeDir.clone().multiplyScalar(targetExp));
        mesh.position.lerp(targetPos, Math.min(delta * 8, 1));
      });

      // Gentle auto-rotation if not interacting
      if (modelGroupRef.current && !isUserInteracting) {
        modelGroupRef.current.rotation.y += delta * 0.15;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [buildModel]);

  // Handle Model Switch
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
    }

    const newGroup = buildModel(activeModel, materialFinish);
    scene.add(newGroup);
    modelGroupRef.current = newGroup;
  }, [activeModel, materialFinish, buildModel]);

  // Camera presets
  const setCameraPreset = (view: 'iso' | 'top' | 'front' | 'side') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (view === 'iso') {
      camera.position.set(5.5, 3.8, 6.5);
    } else if (view === 'top') {
      camera.position.set(0, 9, 0.1);
    } else if (view === 'front') {
      camera.position.set(0, 0.5, 7.5);
    } else if (view === 'side') {
      camera.position.set(7.5, 0.5, 0);
    }
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
      {/* 3D WebGL Canvas Mount (Isolated Ref) */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Telemetry Header (Minimal, zero-occlusion) */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-0.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>THREE.JS PBR SILHOUETTE LAB · PROCEDURAL ASSETS</span>
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          {activeModel === 'triangle' && 'Fontenelle Delta Triangle (35mm Correlated)'}
          {activeModel === 'orb' && 'Bennington Luminous Spheroid'}
          {activeModel === 'disc' && 'Elkhorn Metallic Disc Configuration'}
          {activeModel === 'commercial' && 'Boeing 737 / Cessna 172 Scale Reference'}
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          PBR Studio Lighting · ACES Filmic Tone Mapping · Drag to rotate · Scroll to zoom
        </p>
      </div>

      {/* Model Selection Tabs (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1 bg-slate-950/90 border border-slate-800 rounded-lg shadow-xl text-xs font-mono">
        <button
          onClick={() => setActiveModel('triangle')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeModel === 'triangle'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Chevron
        </button>
        <button
          onClick={() => setActiveModel('orb')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeModel === 'orb'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Orb
        </button>
        <button
          onClick={() => setActiveModel('disc')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeModel === 'disc'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Disc
        </button>
        <button
          onClick={() => setActiveModel('commercial')}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeModel === 'commercial'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Aviation Reference
        </button>
      </div>

      {/* ZERO-OCCLUSION COLLAPSIBLE BOTTOM DOCK (Section 5 Directive) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl transition-all duration-300 ${
          isControlsCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Toggle Tab */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/95 border border-slate-800 rounded-t-lg text-[11px] font-mono text-slate-300 hover:text-cyan-400 transition-colors shadow-lg"
          >
            {isControlsCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show 3D Inspector Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Collapse Controls (Zen Mode)</span>
              </>
            )}
          </button>
        </div>

        {/* Consolidated Dock Panel */}
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* 1. Exploded View Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exploded Architecture</span>
                </span>
                <span className="text-cyan-400 font-semibold tabular-nums">
                  {Math.round(explodedAmount * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={explodedAmount}
                onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* 2. PBR Material Finish Selector */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Surface Finish</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {[
                  { id: 'stealth', label: 'Absorptive' },
                  { id: 'titanium', label: 'Titanium' },
                  { id: 'luminescent', label: 'Luminous' },
                  { id: 'alloy', label: 'Alloy' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMaterialFinish(f.id as any)}
                    className={`flex-1 py-1 rounded text-[11px] transition-colors ${
                      materialFinish === f.id
                        ? 'bg-slate-800 text-cyan-300 border border-cyan-800 font-semibold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Camera Angles */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Viewpoint Angles</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-mono">
                <button
                  onClick={() => setCameraPreset('iso')}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300"
                >
                  Isometric
                </button>
                <button
                  onClick={() => setCameraPreset('top')}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300"
                >
                  Top Plan
                </button>
                <button
                  onClick={() => setCameraPreset('front')}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300"
                >
                  Elevation
                </button>
                <button
                  onClick={() => setCameraPreset('side')}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300"
                >
                  Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
