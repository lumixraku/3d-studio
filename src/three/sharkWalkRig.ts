import * as THREE from 'three';

/**
 * Shared shark skeleton + walk cycle, used both to deform the shark mesh in the
 * scene and to drive the standalone skeleton preview thumbnail. Keeping the bone
 * layout and the animation in one place guarantees the preview matches the shark.
 *
 * Orientation (from the model's vertex distribution): head/body toward +X, the
 * thin tail toward -X, up is +Y, feet split left/right along ±Z.
 */
export const SHARK_BONE_ORDER = ['root', 'spine', 'head', 'tail', 'legL', 'legR'] as const;
export type SharkBoneName = (typeof SHARK_BONE_ORDER)[number];
export type SharkBones = Record<SharkBoneName, THREE.Bone>;

export function buildSharkBones(): { bones: SharkBones; boneList: THREE.Bone[] } {
  const bones = {} as SharkBones;
  const make = (name: SharkBoneName, parent: SharkBoneName | null, offset: [number, number, number]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...offset);
    bones[name] = bone;
    if (parent) bones[parent].add(bone);
  };

  make('root', null, [0.1, -0.1, 0]); // hips, at the body core
  make('spine', 'root', [0.05, 0.3, 0]); // up through the body
  make('head', 'spine', [0.15, 0.12, 0]); // forward + up to the snout
  make('tail', 'root', [-0.42, 0.08, 0]); // out the back
  make('legL', 'root', [0.02, -0.12, 0.18]); // left foot (+Z)
  make('legR', 'root', [0.02, -0.12, -0.18]); // right foot (-Z)

  const boneList = SHARK_BONE_ORDER.map((n) => bones[n]);
  return { bones, boneList };
}

/**
 * Apply one frame of the in-place walk cycle to the bones, returning the
 * body-level offsets (vertical bob + side-to-side waddle) for the caller to
 * apply to the parent group.
 */
export function applyWalkCycle(bones: SharkBones, time: number): { bobY: number; rockX: number } {
  const phase = time * 3.5; // stride speed
  const step = Math.sin(phase);

  // Legs swing fore/aft in opposition (rotate about Z → foot moves along X).
  bones.legL.rotation.z = step * 0.55;
  bones.legR.rotation.z = -step * 0.55;

  // Upper body and head counter-motion for weight.
  bones.spine.rotation.x = step * 0.07;
  bones.head.rotation.x = -step * 0.05;

  // Tail wags side to side, lifted slightly.
  bones.tail.rotation.y = step * 0.5;
  bones.tail.rotation.z = 0.15;

  return {
    bobY: Math.abs(Math.sin(phase)) * 0.05, // bob up on each footfall (2× per stride)
    rockX: -step * 0.13, // lean toward the planted foot
  };
}
