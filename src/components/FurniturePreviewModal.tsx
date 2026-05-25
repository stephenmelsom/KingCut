import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { isFurnitureDesignValid } from '../furniture/generate';
import type { FurnitureDesign } from '../furniture/types';

type Props = {
  design: FurnitureDesign;
  onClose: () => void;
};

export function FurniturePreviewModal({ design, onClose }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !isFurnitureDesignValid(design)) return;

    host.replaceChildren();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      const message = document.createElement('div');
      message.className = 'canvas-empty';
      message.textContent = '3D preview is unavailable because WebGL could not start.';
      host.append(message);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf8fafc, 1);
    host.append(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    addCabinetPreview(scene, design);

    const maxDim = Math.max(design.width, design.height, design.depth);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, maxDim * 10);
    camera.position.set(maxDim * 1.35, maxDim * 1.05, maxDim * 1.45);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.minDistance = maxDim * 0.75;
    controls.maxDistance = maxDim * 4;
    controls.update();

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      host.replaceChildren();
    };
  }, [design]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal furniture-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="furniture-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="furniture-preview-title">Furniture preview</h2>
          <button
            className="btn-icon modal-close"
            aria-label="Close preview"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="furniture-preview-canvas" ref={hostRef} />
      </div>
    </div>
  );
}

function addCabinetPreview(scene: THREE.Scene, design: FurnitureDesign) {
  const t = design.materialThickness;
  const w = design.width;
  const h = design.height;
  const d = design.depth;
  const innerW = w - 2 * t;
  const innerH = h - 2 * t;

  const carcassMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.75,
    transparent: true,
    opacity: 0.82,
  });
  const shelfMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.72,
    transparent: true,
    opacity: 0.78,
  });
  const backMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.8,
    transparent: true,
    opacity: 0.38,
  });
  const drawerMaterial = new THREE.MeshStandardMaterial({
    color: 0xb6c7a9,
    roughness: 0.7,
    transparent: true,
    opacity: 0.72,
  });
  const drawerBoxMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9c8a9,
    roughness: 0.7,
    transparent: true,
    opacity: 0.34,
  });

  addBox(scene, [-w / 2 + t / 2, 0, 0], [t, h, d], carcassMaterial);
  addBox(scene, [w / 2 - t / 2, 0, 0], [t, h, d], carcassMaterial);
  addBox(scene, [0, h / 2 - t / 2, 0], [innerW, t, d], carcassMaterial);
  addBox(scene, [0, -h / 2 + t / 2, 0], [innerW, t, d], carcassMaterial);

  for (let index = 1; index <= design.shelfCount; index += 1) {
    const y = -h / 2 + t + (innerH * index) / (design.shelfCount + 1);
    addBox(scene, [0, y, 0], [innerW, t, d], shelfMaterial);
  }

  if (design.includeBack) {
    addBox(
      scene,
      [0, 0, -d / 2 + design.backThickness / 2],
      [w, h, design.backThickness],
      backMaterial,
    );
  }

  if (design.drawerCount > 0) {
    const drawerW = innerW - design.drawerSideClearance;
    const drawerD = d - t;
    const segmentH = innerH / design.drawerCount;
    const drawerH = segmentH - design.drawerFrontGap;

    for (let index = 0; index < design.drawerCount; index += 1) {
      const y = -h / 2 + t + segmentH * index + segmentH / 2;
      addBox(
        scene,
        [0, y, d / 2 + t * 0.12],
        [drawerW, drawerH, t * 0.35],
        drawerMaterial,
      );
      addBox(
        scene,
        [0, y, t / 2],
        [drawerW, drawerH * 0.78, drawerD],
        drawerBoxMaterial,
      );
    }
  }
}

function addBox(
  scene: THREE.Scene,
  position: [number, number, number],
  size: [number, number, number],
  material: THREE.Material,
) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  scene.add(mesh);

  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edges = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.6 }),
  );
  edges.position.copy(mesh.position);
  scene.add(edges);
}
