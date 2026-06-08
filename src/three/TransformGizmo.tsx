import { useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import { useSceneStore } from '../store/useSceneStore';
import { useHistoryStore } from '../store/useHistoryStore';
import * as THREE from 'three';

export function TransformGizmo({ meshRef }: { meshRef: React.MutableRefObject<THREE.Object3D | null> }) {
  const transformMode = useSceneStore(s => s.transformMode);
  const snapEnabled = useSceneStore(s => s.snapEnabled);
  const snapValue = useSceneStore(s => s.snapValue);
  const updateObject = useSceneStore(s => s.updateObject);
  const selectedId = useSceneStore(s => s.selectedId);
  const objects = useSceneStore(s => s.objects);
  const pushHistory = useHistoryStore(s => s.push);
  const controlsRef = useRef<any>(null);

  const selectedObj = objects.find(o => o.id === selectedId);
  const isLight = selectedObj?.type.includes('Light');

  if (!meshRef.current || !selectedId || isLight) return null;

  const translationSnap = snapEnabled ? snapValue : undefined;
  const rotationSnap = snapEnabled ? THREE.MathUtils.degToRad(15) : undefined;
  const scaleSnap = snapEnabled ? 0.25 : undefined;

  return (
    <TransformControls
      ref={controlsRef}
      object={meshRef.current}
      mode={transformMode}
      translationSnap={translationSnap}
      rotationSnap={rotationSnap}
      scaleSnap={scaleSnap}
      onMouseDown={() => {
        pushHistory([...objects.map(o => ({ ...o }))]);
      }}
      onObjectChange={() => {
        if (!meshRef.current || !selectedId) return;
        const pos = meshRef.current.position;
        const rot = meshRef.current.rotation;
        const scl = meshRef.current.scale;
        updateObject(selectedId, {
          position: [pos.x, pos.y, pos.z],
          rotation: [rot.x, rot.y, rot.z],
          scale: [scl.x, scl.y, scl.z],
        });
      }}
    />
  );
}
