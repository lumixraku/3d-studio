import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TransformGizmo } from './TransformGizmo';

interface SkeletonDummyProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onSelect?: () => void;
  isSelected?: boolean;
}

const JOINT_RADIUS = 0.07;
const BASE_Y = 0.95; // lift hips so the feet rest near the grid

/**
 * A standalone "dummy" that makes a skeletal animation visible. It is a real
 * bone hierarchy (hips → spine → head, plus arms and legs) with no skin: each
 * joint is drawn as a sphere and the bones are drawn as lines by a
 * THREE.SkeletonHelper. A basic dance (sway, arm waves, marching legs, head
 * bob) is driven by rotating the bones directly — so you literally watch the
 * armature that a skeletal animation moves.
 */
function buildDummy(jointMaterial: THREE.Material) {
  const bones: Record<string, THREE.Bone> = {};

  const makeBone = (name: string, parent: string | null, pos: [number, number, number]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...pos);
    bones[name] = bone;
    if (parent) bones[parent].add(bone);
    // Visible joint marker, parented to the bone so it follows the motion.
    const joint = new THREE.Mesh(new THREE.SphereGeometry(JOINT_RADIUS, 12, 12), jointMaterial);
    bone.add(joint);
    return bone;
  };

  // Spine (root = hips)
  makeBone('hips', null, [0, 0, 0]);
  makeBone('spine', 'hips', [0, 0.35, 0]);
  makeBone('chest', 'spine', [0, 0.35, 0]);
  makeBone('neck', 'chest', [0, 0.22, 0]);
  makeBone('head', 'neck', [0, 0.25, 0]);

  // Arms
  makeBone('armL', 'chest', [0.18, 0.12, 0]);
  makeBone('forearmL', 'armL', [0.32, 0, 0]);
  makeBone('handL', 'forearmL', [0.28, 0, 0]);
  makeBone('armR', 'chest', [-0.18, 0.12, 0]);
  makeBone('forearmR', 'armR', [-0.32, 0, 0]);
  makeBone('handR', 'forearmR', [-0.28, 0, 0]);

  // Legs
  makeBone('legL', 'hips', [0.12, -0.1, 0]);
  makeBone('shinL', 'legL', [0, -0.42, 0]);
  makeBone('footL', 'shinL', [0, -0.42, 0]);
  makeBone('legR', 'hips', [-0.12, -0.1, 0]);
  makeBone('shinR', 'legR', [0, -0.42, 0]);
  makeBone('footR', 'shinR', [0, -0.42, 0]);

  // Armature group holds the bone tree, lifted so feet land near the grid.
  const armature = new THREE.Group();
  armature.position.y = BASE_Y;
  armature.add(bones.hips);

  const helper = new THREE.SkeletonHelper(armature);
  (helper.material as THREE.LineBasicMaterial).linewidth = 2;

  return { armature, bones, helper };
}

export function SkeletonDummy({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  onSelect,
  isSelected,
}: SkeletonDummyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { armature, bones, helper } = useMemo(() => {
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: '#ff8c42',
      emissive: '#ff6b1a',
      emissiveIntensity: 0.35,
      roughness: 0.5,
    });
    return buildDummy(jointMaterial);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Body bob and sway.
    armature.position.y = BASE_Y + Math.abs(Math.sin(t * 3)) * 0.08;
    bones.hips.rotation.y = Math.sin(t * 2) * 0.25;
    bones.spine.rotation.z = Math.sin(t * 2) * 0.12;
    bones.chest.rotation.z = Math.sin(t * 2 + 0.4) * 0.12;
    bones.head.rotation.z = Math.sin(t * 2) * 0.18;
    bones.head.rotation.x = Math.sin(t * 3) * 0.1;

    // Arms wave up and down, mirrored, with a little elbow bend.
    const armWave = Math.sin(t * 4);
    bones.armL.rotation.z = -1.1 - armWave * 0.6;
    bones.armR.rotation.z = 1.1 + armWave * 0.6;
    bones.forearmL.rotation.y = Math.sin(t * 4 + 1) * 0.5;
    bones.forearmR.rotation.y = Math.sin(t * 4 + 1) * 0.5;

    // Legs march in opposition with knees flexing.
    const step = Math.sin(t * 4);
    bones.legL.rotation.x = step * 0.4;
    bones.legR.rotation.x = -step * 0.4;
    bones.shinL.rotation.x = Math.max(0, -step) * 0.6;
    bones.shinR.rotation.x = Math.max(0, step) * 0.6;
  });

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        <primitive object={armature} />
        <primitive object={helper} />
        {isSelected && (
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1.2, 2.4, 0.8]} />
            <meshBasicMaterial color="#007aff" wireframe transparent opacity={0.2} />
          </mesh>
        )}
      </group>
      {isSelected && <TransformGizmo meshRef={groupRef} />}
    </>
  );
}
