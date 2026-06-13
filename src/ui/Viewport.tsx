import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useSceneStore } from '../store/useSceneStore';
import { SceneContent } from '../three/SceneContent';
import { EditorGrid } from '../three/EditorGrid';
import { EditorLights } from '../three/EditorLights';
import type { CAMERA_VIEWS } from '../types';

function CameraController({ viewTrigger }: { viewTrigger: { view: string; timestamp: number } | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!viewTrigger || !controlsRef.current) return;
    
    const views: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
      front: { pos: [0, 0, 8], target: [0, 0, 0] },
      back: { pos: [0, 0, -8], target: [0, 0, 0] },
      top: { pos: [0, 8, 0.01], target: [0, 0, 0] },
      bottom: { pos: [0, -8, 0.01], target: [0, 0, 0] },
      left: { pos: [-8, 0, 0], target: [0, 0, 0] },
      right: { pos: [8, 0, 0], target: [0, 0, 0] },
      perspective: { pos: [5, 5, 5], target: [0, 0, 0] },
    };

    const v = views[viewTrigger.view];
    if (!v) return;

    camera.position.set(...v.pos);
    controlsRef.current.target.set(...v.target);
    controlsRef.current.update();
  }, [viewTrigger, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={50}
      // Left-drag pans; Shift+drag orbits (OrbitControls switches PAN→ROTATE while Shift is held).
      mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    />
  );
}

function PostProcessing() {
  const pp = useSceneStore(s => s.postProcessing);

  return (
    <EffectComposer>
      {pp.bloom && (
        <Bloom
          intensity={pp.bloomIntensity}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
        />
      )}
      {pp.vignette && (
        <Vignette eskil={false} offset={0.1} darkness={pp.vignetteIntensity} />
      )}
    </EffectComposer>
  );
}

export function Viewport({ viewTrigger }: { viewTrigger: { view: string; timestamp: number } | null }) {
  const selectObject = useSceneStore(s => s.selectObject);
  const pp = useSceneStore(s => s.postProcessing);
  const hasEffects = pp.bloom || pp.vignette;

  return (
    <div style={styles.viewport}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => selectObject(null)}
        style={{ background: '#e8e8ed' }}
      >
        <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} near={0.1} far={1000} />
        <CameraController viewTrigger={viewTrigger} />
        <color attach="background" args={['#e8e8ed']} />
        <fog attach="fog" args={['#e8e8ed', 20, 50]} />
        <EditorLights />
        <EditorGrid />
        <SceneContent />
        {/* Ground plane for shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <shadowMaterial transparent opacity={0.15} />
        </mesh>
        {hasEffects && <PostProcessing />}
      </Canvas>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};
