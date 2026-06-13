import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildSharkBones, applyWalkCycle } from '../three/sharkWalkRig';

/**
 * A standalone thumbnail that shows the shark's skeletal walk animation on its
 * own — joints drawn as spheres, bones as SkeletonHelper lines — running the
 * exact same walk cycle as the shark in the scene. The skeleton is no longer
 * overlaid on the model in the viewport; this preview is where you watch it.
 */
function PreviewRig() {
  const groupRef = useRef<THREE.Group>(null);

  const { bones, container, helper } = useMemo(() => {
    const { bones, boneList } = buildSharkBones();
    const container = new THREE.Group();
    container.add(bones.root);
    const jointMat = new THREE.MeshBasicMaterial({ color: '#ff8c42' });
    boneList.forEach((b) => {
      b.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), jointMat));
    });
    container.updateMatrixWorld(true);
    const helper = new THREE.SkeletonHelper(container);
    return { bones, container, helper };
  }, []);

  useFrame((state) => {
    const { bobY, rockX } = applyWalkCycle(bones, state.clock.elapsedTime);
    if (groupRef.current) {
      groupRef.current.position.y = bobY;
      groupRef.current.rotation.x = rockX;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <primitive object={container} />
      </group>
      {/* Helper lives at scene root and reads the container's world matrix, so it
          tracks the bobbing group without being double-transformed by it. */}
      <primitive object={helper} />
    </>
  );
}

export function SkeletonPreview() {
  return (
    <div style={styles.wrap}>
      <div style={styles.label}>Skeleton · walk</div>
      <div style={styles.canvasBox}>
        <Canvas camera={{ position: [0.15, 0.15, 2.6], fov: 38 }} dpr={[1, 2]}>
          <PreviewRig />
        </Canvas>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: '8px 0',
  },
  label: {
    fontSize: 9,
    color: '#86868b',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  canvasBox: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #fbfbfd 0%, #eef0f3 100%)',
    border: '1px solid #d2d2d7',
  },
};
