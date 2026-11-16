'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './fem.module.css';

/**
 * 엔진이 그 작업의 실제 메쉬에서 만든 viewer.json(경계면 삼각형)을 그대로 그린다.
 * 개념도·샘플 메쉬가 아니며, 여기서 형상을 간소화하거나 보간하지 않는다.
 * 렌더링 부하 상한을 넘으면 그리지 않고 생략 사실을 알린다.
 */
export type ViewerPayload = {
  positions: number[];
  triangles: number[];
  edges: number[];
  tri_quality: number[];
  tri_bad: number[];
  quality_metric?: string;
};

export const MAX_RENDER_TRIANGLES = 600_000;

export function isViewerPayload(v: unknown): v is ViewerPayload {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  const nums = (a: unknown): a is number[] => Array.isArray(a) && (a.length === 0 || typeof a[0] === 'number');
  if (!nums(p.positions) || !nums(p.triangles) || !nums(p.edges) || !nums(p.tri_quality) || !nums(p.tri_bad)) return false;
  if (p.positions.length % 3 !== 0 || p.triangles.length % 3 !== 0 || p.edges.length % 2 !== 0) return false;
  return p.tri_quality.length === p.triangles.length / 3 && p.triangles.length > 0;
}

type Handle = { setWire: (on: boolean) => void; setQuality: (on: boolean) => void; fit: () => void; dispose: () => void };

export function MeshViewer({ data, wire, quality, fitSignal, onError }: {
  data: ViewerPayload; wire: boolean; quality: boolean; fitSignal: number; onError: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<Handle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    const el = host.current;
    if (!el) return;
    (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;

        const nVert = data.positions.length / 3;
        const tri = data.triangles;
        const nTri = tri.length / 3;
        for (let i = 0; i < tri.length; i++) if (!(tri[i] >= 0 && tri[i] < nVert)) throw new Error('bad index');

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf4f7fb);
        const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1e7);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(1, 2, 3);
        camera.add(sun);
        scene.add(camera);

        // 삼각형마다 색을 정확히 주기 위해 인덱스를 푼다(면 단위 색·평면 음영).
        const pos = new Float32Array(tri.length * 3);
        const col = new Float32Array(tri.length * 3);
        for (let i = 0; i < tri.length; i++) {
          pos[i * 3] = data.positions[tri[i] * 3];
          pos[i * 3 + 1] = data.positions[tri[i] * 3 + 1];
          pos[i * 3 + 2] = data.positions[tri[i] * 3 + 2];
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          vertexColors: true, roughness: 0.6, flatShading: true,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
        scene.add(mesh);

        const E = data.edges;
        const lp = new Float32Array(E.length * 3);
        for (let i = 0; i < E.length; i++) {
          lp[i * 3] = data.positions[E[i] * 3];
          lp[i * 3 + 1] = data.positions[E[i] * 3 + 1];
          lp[i * 3 + 2] = data.positions[E[i] * 3 + 2];
        }
        const lgeo = new THREE.BufferGeometry();
        lgeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
        const lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.7 }));
        scene.add(lines);

        const bad = new Set(data.tri_bad);
        const c = new THREE.Color();
        const colorize = (byQuality: boolean) => {
          for (let t = 0; t < nTri; t++) {
            if (bad.has(t)) c.setRGB(0.9, 0.15, 0.15);                     // 품질 기준 미달 요소의 면
            else if (byQuality) {
              const q = Math.max(0, Math.min(1, data.tri_quality[t]));
              if (q < 0.5) c.setRGB(0.86, 0.15 + 0.72 * q, 0.15);
              else { const s = (q - 0.5) / 0.5; c.setRGB(0.95 - 0.75 * s, 0.75 - 0.25 * s, 0.2 + 0.65 * s); }
            } else c.setRGB(0.36, 0.6, 0.92);
            for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (t * 3 + k) * 3);
          }
          geo.attributes.color.needsUpdate = true;
        };
        const fit = () => {
          const box = new THREE.Box3().setFromObject(mesh);
          if (box.isEmpty()) return;
          const s = box.getSize(new THREE.Vector3()).length();
          const ctr = box.getCenter(new THREE.Vector3());
          controls.target.copy(ctr);
          camera.position.copy(ctr).add(new THREE.Vector3(0.9, 0.7, 1.1).normalize().multiplyScalar(s * 1.5));
          camera.near = s / 1000;
          camera.far = s * 100;
          camera.updateProjectionMatrix();
        };
        const resize = () => {
          const w = el.clientWidth || 300, h = el.clientHeight || 300;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        resize();
        colorize(false);
        fit();
        let raf = 0;
        const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
        loop();

        handle.current = {
          setWire: (on) => { lines.visible = on; },
          setQuality: (on) => colorize(on),
          fit,
          dispose: () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            controls.dispose();
            geo.dispose(); lgeo.dispose();
            (mesh.material as { dispose: () => void }).dispose();
            (lines.material as { dispose: () => void }).dispose();
            renderer.dispose();
            renderer.domElement.remove();
          },
        };
        setReady(true);
      } catch {
        if (!disposed) onError();
      }
    })();
    return () => {
      disposed = true;
      handle.current?.dispose();
      handle.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => { if (ready) handle.current?.setWire(wire); }, [ready, wire]);
  useEffect(() => { if (ready) handle.current?.setQuality(quality); }, [ready, quality]);
  useEffect(() => { if (ready && fitSignal > 0) handle.current?.fit(); }, [ready, fitSignal]);

  return <div ref={host} className={styles.viewerCanvas} />;
}
