import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TransformGizmo } from './TransformGizmo';
import { buildSharkBones, applyWalkCycle } from './sharkWalkRig';

interface SharkDanceProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onSelect?: (additive?: boolean) => void;
  isSelected?: boolean;
  isPrimary?: boolean;
}

const MODEL_PATH = '/cartoon shark 3d model.glb';

/**
 * The shark GLB is a single static mesh with no skeleton, so we auto-rig it at
 * runtime with a shark-shaped skeleton (see sharkWalkRig). Each vertex is skinned
 * to its two nearest bones (inverse-square distance), the mesh is rebuilt as a
 * THREE.SkinnedMesh, and a walk cycle deforms the geometry. The skeleton itself
 * is not drawn in the scene — it's shown in the Properties-panel preview instead.
 */
function buildRig(source: THREE.Mesh) {
  const geometry = source.geometry.clone();
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox!.getSize(size);

  const { bones, boneList } = buildSharkBones();

  // Skin each vertex to its two nearest bones by inverse-square distance.
  const material = Array.isArray(source.material) ? source.material[0].clone() : source.material.clone();
  const skinned = new THREE.SkinnedMesh(geometry, material);
  skinned.add(bones.root);
  skinned.updateMatrixWorld(true);
  const anchors = boneList.map((b) => b.getWorldPosition(new THREE.Vector3()));

  const pos = geometry.attributes.position;
  const vertexCount = pos.count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  const v = new THREE.Vector3();

  for (let i = 0; i < vertexCount; i++) {
    v.fromBufferAttribute(pos, i);
    let b0 = 0;
    let b1 = 1;
    let d0 = Infinity;
    let d1 = Infinity;
    for (let b = 0; b < anchors.length; b++) {
      const d = v.distanceToSquared(anchors[b]);
      if (d < d0) {
        d1 = d0;
        b1 = b0;
        d0 = d;
        b0 = b;
      } else if (d < d1) {
        d1 = d;
        b1 = b;
      }
    }
    const w0 = 1 / (d0 + 0.02);
    const w1 = 1 / (d1 + 0.02);
    const sum = w0 + w1;
    const o = i * 4;
    skinIndices[o] = b0;
    skinIndices[o + 1] = b1;
    skinWeights[o] = w0 / sum;
    skinWeights[o + 1] = w1 / sum;
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  skinned.castShadow = true;
  skinned.receiveShadow = true;
  skinned.frustumCulled = false; // bones push verts outside the original bbox
  skinned.bind(new THREE.Skeleton(boneList));

  return { skinned, bones, size };
}

export function SharkDance({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  onSelect,
  isSelected,
  isPrimary,
}: SharkDanceProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const walkRef = useRef<THREE.Group>(null);

  const rig = useMemo(() => {
    let sourceMesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (!sourceMesh && child instanceof THREE.Mesh) sourceMesh = child;
    });
    return sourceMesh ? buildRig(sourceMesh) : null;
  }, [scene]);

  useFrame((state) => {
    if (!rig) return;
    const { bobY, rockX } = applyWalkCycle(rig.bones, state.clock.elapsedTime);
    if (walkRef.current) {
      walkRef.current.position.y = bobY;
      walkRef.current.rotation.x = rockX;
    }
  });

  if (!rig) return null;

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(e.shiftKey || e.metaKey || e.ctrlKey);
        }}
      >
        <group ref={walkRef}>
          <primitive object={rig.skinned} />
        </group>
        {isSelected && (
          <mesh>
            <boxGeometry args={[rig.size.x * 1.1, rig.size.y * 1.1, rig.size.z * 1.1]} />
            <meshBasicMaterial color="#007aff" wireframe transparent opacity={0.2} />
          </mesh>
        )}
      </group>
      {isPrimary && <TransformGizmo meshRef={groupRef} />}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
