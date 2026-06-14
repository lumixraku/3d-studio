import * as THREE from 'three';

// In-memory store for BufferGeometry instances produced by splitting.
// SceneObjects reference these by id; the store itself stays serializable.
const registry = new Map<string, THREE.BufferGeometry>();

export function registerGeometry(id: string, geo: THREE.BufferGeometry): void {
  registry.set(id, geo);
}

export function getGeometry(id: string): THREE.BufferGeometry | undefined {
  return registry.get(id);
}

export function removeGeometry(id: string): void {
  const geo = registry.get(id);
  if (geo) {
    geo.dispose();
    registry.delete(id);
  }
}

/**
 * Merge several geometries (each with its own world transform) into a single
 * BufferGeometry in shared world space. Normals are recomputed after merge.
 */
export function mergeGeometriesWithTransform(
  items: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  let offset = 0;

  for (const { geometry, matrix } of items) {
    const geo = geometry.clone();
    geo.applyMatrix4(matrix);
    const pos = geo.attributes.position;
    const idx = geo.index;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + offset);
      }
    } else {
      for (let i = 0; i < count; i++) indices.push(i + offset);
    }
    offset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
