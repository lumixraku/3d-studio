import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface SharkDanceProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onSelect?: () => void;
  isSelected?: boolean;
}

const MODEL_PATH = '/cartoon shark 3d model.glb';
const BONE_COUNT = 10;

/**
 * The shark GLB is a single static mesh with no skeleton. To produce a real
 * skeletal animation we auto-rig it at runtime: a chain of bones is laid out
 * along the model's longest axis (its "spine"), each vertex is skinned to the
 * two nearest bones by linear blend weights, and the mesh is rebuilt as a
 * THREE.SkinnedMesh. A travelling sine wave through the bone chain then makes
 * the geometry itself deform — genuine bone-driven animation, not a transform.
 */
function buildRig(source: THREE.Mesh) {
  const geometry = source.geometry.clone();
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Spine = longest axis. The two remaining axes are the bend directions.
  const extents = [size.x, size.y, size.z];
  const spine = extents.indexOf(Math.max(...extents)); // 0=x,1=y,2=z
  const perp = [0, 1, 2].filter((a) => a !== spine); // bend axes

  const axisName = (['x', 'y', 'z'] as const);
  const minAlong = bbox.min.getComponent(spine);
  const maxAlong = bbox.max.getComponent(spine);
  const spacing = (maxAlong - minAlong) / (BONE_COUNT - 1);

  // Build the bone chain down the model's centerline.
  const bones: THREE.Bone[] = [];
  for (let i = 0; i < BONE_COUNT; i++) {
    const bone = new THREE.Bone();
    if (i === 0) {
      // Root sits at the centerline of the "start" end.
      const root = center.clone();
      root.setComponent(spine, minAlong);
      bone.position.copy(root);
    } else {
      // Children are offset from their parent by one segment along the spine.
      bone.position.setComponent(spine, spacing);
      bones[i - 1].add(bone);
    }
    bones.push(bone);
  }

  // Skin each vertex to the two bones it sits between.
  const pos = geometry.attributes.position;
  const vertexCount = pos.count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  for (let v = 0; v < vertexCount; v++) {
    const coord = pos.getComponent(v, spine);
    const t = (coord - minAlong) / spacing; // 0 .. BONE_COUNT-1
    let i0 = Math.floor(t);
    let frac = t - i0;
    if (i0 < 0) {
      i0 = 0;
      frac = 0;
    } else if (i0 >= BONE_COUNT - 1) {
      i0 = BONE_COUNT - 1;
      frac = 0;
    }
    const i1 = Math.min(i0 + 1, BONE_COUNT - 1);
    const o = v * 4;
    skinIndices[o] = i0;
    skinIndices[o + 1] = i1;
    skinWeights[o] = 1 - frac;
    skinWeights[o + 1] = frac;
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const material = Array.isArray(source.material)
    ? source.material[0].clone()
    : source.material.clone();

  const skinned = new THREE.SkinnedMesh(geometry, material);
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  skinned.frustumCulled = false; // bones push verts outside the original bbox
  skinned.add(bones[0]);
  skinned.updateMatrixWorld(true);

  const skeleton = new THREE.Skeleton(bones);
  skinned.bind(skeleton);

  return {
    skinned,
    bones,
    perp: [axisName[perp[0]], axisName[perp[1]]] as const,
    size,
  };
}

export function SharkDance({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  onSelect,
  isSelected,
}: SharkDanceProps) {
  const { scene } = useGLTF(MODEL_PATH);

  const rig = useMemo(() => {
    let sourceMesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (!sourceMesh && child instanceof THREE.Mesh) sourceMesh = child;
    });
    return sourceMesh ? buildRig(sourceMesh) : null;
  }, [scene]);

  useFrame((state) => {
    if (!rig) return;
    const t = state.clock.elapsedTime;
    const { bones, perp } = rig;
    const n = bones.length;

    for (let i = 1; i < n; i++) {
      const falloff = i / (n - 1); // tip moves more than the base
      // Primary sway: a wave travelling from base to tip.
      bones[i].rotation[perp[0]] = 0.45 * falloff * Math.sin(t * 3 - i * 0.6);
      // Secondary motion on the other axis for a livelier "dance".
      bones[i].rotation[perp[1]] = 0.22 * falloff * Math.sin(t * 2.2 - i * 0.4);
    }
  });

  if (!rig) return null;

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      <primitive object={rig.skinned} />
      {isSelected && (
        <mesh>
          <boxGeometry args={[rig.size.x * 1.1, rig.size.y * 1.1, rig.size.z * 1.1]} />
          <meshBasicMaterial color="#007aff" wireframe transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
