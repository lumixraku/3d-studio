import { useRef } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import { useHistoryStore } from '../store/useHistoryStore';
import type { ObjectType, TransformMode } from '../types';
import { CAMERA_VIEWS } from '../types';

export function Toolbar({ onCameraView }: { onCameraView: (view: string) => void }) {
  const addObject = useSceneStore(s => s.addObject);
  const transformMode = useSceneStore(s => s.transformMode);
  const setTransformMode = useSceneStore(s => s.setTransformMode);
  const snapEnabled = useSceneStore(s => s.snapEnabled);
  const toggleSnap = useSceneStore(s => s.toggleSnap);
  const showGrid = useSceneStore(s => s.showGrid);
  const toggleGrid = useSceneStore(s => s.toggleGrid);
  const objects = useSceneStore(s => s.objects);
  const loadScene = useSceneStore(s => s.loadScene);
  const resetScene = useSceneStore(s => s.resetScene);
  const pushHistory = useHistoryStore(s => s.push);
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gltfInputRef = useRef<HTMLInputElement>(null);

  const primitives: { type: ObjectType; label: string; icon: string }[] = [
    { type: 'cube', label: 'Cube', icon: '⬜' },
    { type: 'sphere', label: 'Sphere', icon: '⚪' },
    { type: 'cylinder', label: 'Cylinder', icon: '⬭' },
    { type: 'plane', label: 'Plane', icon: '▬' },
    { type: 'torus', label: 'Torus', icon: '◯' },
    { type: 'cone', label: 'Cone', icon: '△' },
  ];

  const lights: { type: ObjectType; label: string; icon: string }[] = [
    { type: 'pointLight', label: 'Point', icon: '💡' },
    { type: 'directionalLight', label: 'Directional', icon: '☀️' },
    { type: 'spotLight', label: 'Spot', icon: '🔦' },
    { type: 'ambientLight', label: 'Ambient', icon: '🌐' },
  ];

  const handleSave = () => {
    const data = JSON.stringify(objects, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        pushHistory([...objects]);
        loadScene(data);
      } catch (err) {
        console.error('Failed to load scene:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportGLTF = async () => {
    const THREE_import = await import('three');
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const scene = new THREE_import.Scene();
    
    objects.forEach(obj => {
      if (obj.type.includes('Light')) return;
      let geometry: THREE.BufferGeometry;
      const p = obj.geometryParams || {};
      switch (obj.type) {
        case 'cube': geometry = new THREE_import.BoxGeometry(p.width || 1, p.height || 1, p.depth || 1); break;
        case 'sphere': geometry = new THREE_import.SphereGeometry(p.radius || 0.5, 32, 32); break;
        case 'cylinder': geometry = new THREE_import.CylinderGeometry(p.radiusTop || 0.5, p.radiusBottom || 0.5, p.height || 1, 32); break;
        case 'plane': geometry = new THREE_import.PlaneGeometry(p.width || 2, p.height || 2); break;
        case 'torus': geometry = new THREE_import.TorusGeometry(p.radius || 0.5, p.tube || 0.2, 16, 48); break;
        case 'cone': geometry = new THREE_import.ConeGeometry(p.radius || 0.5, p.height || 1, 32); break;
        default: geometry = new THREE_import.BoxGeometry();
      }
      const material = new THREE_import.MeshStandardMaterial({
        color: obj.material.color,
        metalness: obj.material.metalness,
        roughness: obj.material.roughness,
      });
      const mesh = new THREE_import.Mesh(geometry, material);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);
      mesh.name = obj.name;
      scene.add(mesh);
    });

    const exporter = new GLTFExporter();
    exporter.parse(scene, (result) => {
      const output = JSON.stringify(result, null, 2);
      const blob = new Blob([output], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scene.gltf';
      a.click();
      URL.revokeObjectURL(url);
    }, (err) => console.error(err), { binary: false });
  };

  return (
    <div style={styles.toolbar}>
      <div style={styles.section}>
        <span style={styles.label}>Add:</span>
        {primitives.map(p => (
          <button
            key={p.type}
            style={styles.btn}
            onClick={() => { pushHistory([...objects]); addObject(p.type); }}
            title={p.label}
          >
            {p.icon} {p.label}
          </button>
        ))}
        <span style={styles.divider}>|</span>
        {lights.map(l => (
          <button
            key={l.type}
            style={styles.btn}
            onClick={() => { pushHistory([...objects]); addObject(l.type); }}
            title={l.label}
          >
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <span style={styles.divider}>|</span>
        <span style={styles.label}>Transform:</span>
        <button
          style={{ ...styles.btn, ...(transformMode === 'translate' ? styles.btnActive : {}) }}
          onClick={() => setTransformMode('translate')}
          title="Move (W)"
        >
          ↕ Move
        </button>
        <button
          style={{ ...styles.btn, ...(transformMode === 'rotate' ? styles.btnActive : {}) }}
          onClick={() => setTransformMode('rotate')}
          title="Rotate (E)"
        >
          ↻ Rotate
        </button>
        <button
          style={{ ...styles.btn, ...(transformMode === 'scale' ? styles.btnActive : {}) }}
          onClick={() => setTransformMode('scale')}
          title="Scale (R)"
        >
          ⤡ Scale
        </button>
        <button
          style={{ ...styles.btn, ...(snapEnabled ? styles.btnActive : {}) }}
          onClick={toggleSnap}
          title="Toggle Snap"
        >
          ⊞ Snap
        </button>
        <button
          style={{ ...styles.btn, ...(showGrid ? styles.btnActive : {}) }}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          # Grid
        </button>
      </div>

      <div style={styles.section}>
        <span style={styles.divider}>|</span>
        <span style={styles.label}>View:</span>
        {Object.keys(CAMERA_VIEWS).map(v => (
          <button key={v} style={styles.btnSm} onClick={() => onCameraView(v)} title={v}>
            {v.charAt(0).toUpperCase() + v.slice(1, 3)}
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <span style={styles.divider}>|</span>
        <button style={styles.btn} onClick={() => { const prev = undo(objects); if (prev) loadScene(prev); }} title="Undo (Ctrl+Z)">↩ Undo</button>
        <button style={styles.btn} onClick={() => { const next = redo(objects); if (next) loadScene(next); }} title="Redo (Ctrl+Shift+Z)">↪ Redo</button>
        <span style={styles.divider}>|</span>
        <button style={styles.btn} onClick={handleSave} title="Save (Ctrl+S)">💾 Save</button>
        <button style={styles.btn} onClick={() => fileInputRef.current?.click()}>📂 Load</button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleLoad} />
        <button style={styles.btn} onClick={handleExportGLTF}>📤 GLTF</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    height: 44,
    background: '#ffffff',
    borderBottom: '1px solid #d2d2d7',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    gap: 4,
    overflow: 'auto',
    flexShrink: 0,
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    color: '#86868b',
    fontSize: 11,
    fontWeight: 600,
    marginRight: 2,
    whiteSpace: 'nowrap',
  },
  btn: {
    background: '#f5f5f7',
    color: '#1d1d1f',
    border: '1px solid #d2d2d7',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnActive: {
    background: '#007aff',
    color: '#fff',
    borderColor: '#007aff',
  },
  btnSm: {
    background: '#f5f5f7',
    color: '#1d1d1f',
    border: '1px solid #d2d2d7',
    borderRadius: 3,
    padding: '3px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
  divider: {
    color: '#d2d2d7',
    margin: '0 4px',
    fontSize: 14,
  },
};
