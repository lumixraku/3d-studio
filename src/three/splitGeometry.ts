import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface SplitPart {
  name: string;
  geometry: THREE.BufferGeometry;
  /** Center of the part in the source model's local space. */
  center: THREE.Vector3;
}

/**
 * Split a BufferGeometry into connected components using Union-Find.
 *
 * Vertices joined by a triangle edge are unioned. When `cutThreshold > 0`,
 * edges longer than the local mean edge length times the threshold are treated
 * as "bridging" connections and are NOT unioned — this breaks single-piece
 * meshes at thin/long junctions (e.g. a fin attached to a body).
 *
 * cutThreshold = 0  → pure connected components (multi-part models)
 * cutThreshold = ~2 → aggressive breaking of weak connections
 */
function buildComponentTriangleGroups(
  geometry: THREE.BufferGeometry,
  cutThreshold: number,
): number[][] {
  const indexed = !!geometry.index;
  const indexAttr = geometry.index;
  const posAttr = geometry.attributes.position;
  const vertexCount = posAttr.count;

  const triCount = indexed ? indexAttr!.count / 3 : vertexCount / 3;
  const getTriVerts = (t: number): [number, number, number] => {
    if (indexed) {
      const o = t * 3;
      return [indexAttr!.getX(o), indexAttr!.getX(o + 1), indexAttr!.getX(o + 2)];
    }
    return [t * 3, t * 3 + 1, t * 3 + 2];
  };

  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) {
      const nx = parent[x];
      parent[x] = r;
      x = nx;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const vTemp = new THREE.Vector3();
  const wTemp = new THREE.Vector3();
  const edgeSum = new Float64Array(vertexCount);
  const edgeCnt = new Float64Array(vertexCount);
  const edgeKey = (a: number, b: number) => (a < b ? a * vertexCount + b : b * vertexCount + a);
  const seenEdges = new Set<number>();

  for (let t = 0; t < triCount; t++) {
    const [a, b, c] = getTriVerts(t);
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const k = edgeKey(p, q);
      if (seenEdges.has(k)) continue;
      seenEdges.add(k);
      vTemp.fromBufferAttribute(posAttr, p);
      wTemp.fromBufferAttribute(posAttr, q);
      const len = vTemp.distanceTo(wTemp);
      edgeSum[p] += len;
      edgeCnt[p] += 1;
      edgeSum[q] += len;
      edgeCnt[q] += 1;
    }
  }

  const localMean = (v: number) => (edgeCnt[v] > 0 ? edgeSum[v] / edgeCnt[v] : 0);

  seenEdges.clear();
  for (let t = 0; t < triCount; t++) {
    const [a, b, c] = getTriVerts(t);
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const k = edgeKey(p, q);
      if (seenEdges.has(k)) continue;
      seenEdges.add(k);

      if (cutThreshold > 0) {
        vTemp.fromBufferAttribute(posAttr, p);
        wTemp.fromBufferAttribute(posAttr, q);
        const len = vTemp.distanceTo(wTemp);
        const local = Math.max(localMean(p), localMean(q));
        if (local > 0 && len > local * cutThreshold) continue;
      }
      union(p, q);
    }
  }

  const groups = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    const [a] = getTriVerts(t);
    const root = find(a);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(t);
  }

  return Array.from(groups.values());
}

function extractSubGeometry(
  geometry: THREE.BufferGeometry,
  triGroups: number[],
): THREE.BufferGeometry {
  const indexed = !!geometry.index;
  const indexAttr = geometry.index;
  const posAttr = geometry.attributes.position;
  const normalAttr = geometry.attributes.normal ?? null;
  const uvAttr = geometry.attributes.uv ?? null;

  const getVert = (t: number, i: number): number => {
    if (indexed) return indexAttr!.getX(t * 3 + i);
    return t * 3 + i;
  };

  const oldToNew = new Map<number, number>();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let next = 0;

  for (const t of triGroups) {
    for (let i = 0; i < 3; i++) {
      const v = getVert(t, i);
      if (!oldToNew.has(v)) {
        oldToNew.set(v, next);
        positions.push(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
        if (normalAttr) normals.push(normalAttr.getX(v), normalAttr.getY(v), normalAttr.getZ(v));
        if (uvAttr) uvs.push(uvAttr.getX(v), uvAttr.getY(v));
        next++;
      }
      indices.push(oldToNew.get(v)!);
    }
  }

  const sub = new THREE.BufferGeometry();
  sub.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normalAttr) sub.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (uvAttr) sub.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  sub.setIndex(indices);
  if (!normalAttr) sub.computeVertexNormals();
  sub.computeBoundingBox();
  sub.computeBoundingSphere();
  return sub;
}

/**
 * Load a GLB/GLTF file, collect all meshes, and split every mesh geometry into
 * connected components. Returns one SplitPart per component.
 */
export async function loadAndSplitGLB(
  path: string,
  cutThreshold = 0,
): Promise<SplitPart[]> {
  const loader = new GLTFLoader();
  const glb = await loader.loadAsync(path);

  const meshes: THREE.Mesh[] = [];
  glb.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
  });
  glb.scene.updateMatrixWorld(true);

  const parts: SplitPart[] = [];
  let idx = 0;

  for (const mesh of meshes) {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    const triGroups = buildComponentTriangleGroups(geo, cutThreshold);
    const multi = meshes.length > 1;
    const baseName = mesh.name || 'Part';

    for (const tris of triGroups) {
      if (tris.length < 3) continue;
      const sub = extractSubGeometry(geo, tris);
      sub.computeBoundingBox();
      const center = new THREE.Vector3();
      sub.boundingBox!.getCenter(center);
      sub.translate(-center.x, -center.y, -center.z);
      sub.computeBoundingBox();
      sub.computeBoundingSphere();

      parts.push({
        name: multi ? `${baseName} ${idx + 1}` : `Part ${idx + 1}`,
        geometry: sub,
        center,
      });
      idx++;
    }
  }

  return parts;
}
