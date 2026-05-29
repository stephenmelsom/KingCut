import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { isFurnitureDesignValid } from '../furniture/generate';
import type { FurnitureDesign } from '../furniture/types';

type Props = {
  design: FurnitureDesign;
};

export function FurniturePreview({ design }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();
    if (!isFurnitureDesignValid(design)) {
      const message = document.createElement('div');
      message.className = 'canvas-empty';
      message.textContent = 'Adjust the grid dimensions to show the preview.';
      host.append(message);
      return;
    }

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

  return <div className="furniture-preview-canvas" ref={hostRef} />;
}

function addCabinetPreview(scene: THREE.Scene, design: FurnitureDesign) {
  const t = design.materialThickness;
  const w = design.width;
  const h = design.height;
  const d = design.depth;
  const toeKick = design.includeToeKick ? Math.max(0, design.toeKickHeight) : 0;
  const innerW = w - 2 * t;
  const innerH = h - 2 * t - toeKick;
  const originX = -innerW / 2;
  const originY = -h / 2 + toeKick + t;

  const carcassMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.75,
    transparent: true,
    opacity: 0.82,
  });
  const dividerMaterial = new THREE.MeshStandardMaterial({
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
    opacity: 0.76,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9c8a9,
    roughness: 0.7,
    transparent: true,
    opacity: 0.72,
  });
  const drawerBoxMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1e4c8,
    roughness: 0.7,
    transparent: true,
    opacity: 0.34,
  });

  addBox(scene, [-w / 2 + t / 2, 0, 0], [t, h, d], carcassMaterial);
  addBox(scene, [w / 2 - t / 2, 0, 0], [t, h, d], carcassMaterial);
  addBox(scene, [0, h / 2 - t / 2, 0], [innerW, t, d], carcassMaterial);
  addBox(scene, [0, -h / 2 + toeKick + t / 2, 0], [innerW, t, d], carcassMaterial);

  if (toeKick > 0) {
    addBox(
      scene,
      [0, -h / 2 + toeKick / 2, d / 2 - design.toeKickDepth - t / 2],
      [innerW, toeKick, t],
      carcassMaterial,
    );
  }

  if (design.includeBack) {
    addBox(
      scene,
      [0, 0, -d / 2 + design.backThickness / 2],
      [w, h, design.backThickness],
      backMaterial,
    );
  }

  let x = originX;
  for (let columnIndex = 0; columnIndex < design.columns.length - 1; columnIndex += 1) {
    x += design.columns[columnIndex].width;
    addBox(scene, [x + t / 2, originY + innerH / 2, 0], [t, innerH, d], dividerMaterial);
    x += t;
  }

  x = originX;
  for (const [columnIndex, column] of design.columns.entries()) {
    let y = originY;
    for (let rowIndex = 0; rowIndex < design.rows.length - 1; rowIndex += 1) {
      y += design.rows[rowIndex].height;
      addBox(
        scene,
        [x + column.width / 2, y + t / 2, 0],
        [column.width, t, d],
        dividerMaterial,
      );
      y += t;
    }

    y = originY;
    for (const [rowIndex, row] of design.rows.entries()) {
      const cell = design.cells[rowIndex][columnIndex];
      const center: [number, number, number] = [
        x + column.width / 2,
        y + row.height / 2,
        d / 2 + t * 0.12,
      ];
      if (cell.kind === 'drawer') {
        addBox(
          scene,
          center,
          [column.width - design.drawerFrontGap, row.height - design.drawerFrontGap, t * 0.35],
          drawerMaterial,
        );
        addBox(
          scene,
          [x + column.width / 2, y + row.height / 2, t / 2],
          [
            column.width - design.drawerSideClearance,
            Math.max(row.height - design.drawerFrontGap, 0.01) * 0.78,
            d - t,
          ],
          drawerBoxMaterial,
        );
      } else if (cell.door === 'single') {
        addBox(
          scene,
          center,
          [column.width - design.drawerFrontGap, row.height - design.drawerFrontGap, t * 0.3],
          doorMaterial,
        );
      } else if (cell.door === 'pair') {
        const doorWidth = (column.width - design.drawerFrontGap) / 2;
        addBox(
          scene,
          [center[0] - doorWidth / 2, center[1], center[2]],
          [doorWidth, row.height - design.drawerFrontGap, t * 0.3],
          doorMaterial,
        );
        addBox(
          scene,
          [center[0] + doorWidth / 2, center[1], center[2]],
          [doorWidth, row.height - design.drawerFrontGap, t * 0.3],
          doorMaterial,
        );
      }
      y += row.height + t;
    }
    x += column.width + t;
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
