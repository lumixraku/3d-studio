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
