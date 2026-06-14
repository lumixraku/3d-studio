import { create } from 'zustand';
import * as THREE from 'three';
import type { SceneObject, ObjectType, TransformMode, Keyframe } from '../types';
import { DEFAULT_MATERIAL, DEFAULT_LIGHT_PROPS, DEFAULT_GEOMETRY } from '../types';
import { registerGeometry, removeGeometry, mergeGeometriesWithTransform, getGeometry } from '../three/geometryRegistry';
import { loadAndSplitGLB } from '../three/splitGeometry';

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

const SHARK_MODEL_PATH = '/cartoon shark 3d model.glb';

// The editor opens with the shark GLB already loaded by default.
function createDefaultObjects(): SceneObject[] {
  return [
    {
      id: generateId(),
      name: 'Model',
      type: 'gltfModel',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      visible: true,
      gltfPath: SHARK_MODEL_PATH,
      animationTracks: [],
    },
  ];
}

function getObjectName(type: ObjectType, objects: SceneObject[]): string {
  const count = objects.filter(o => o.type === type).length + 1;
  const names: Record<ObjectType, string> = {
    cube: 'Cube',
    sphere: 'Sphere',
    cylinder: 'Cylinder',
    plane: 'Plane',
    torus: 'Torus',
    cone: 'Cone',
    pointLight: 'Point Light',
    directionalLight: 'Directional Light',
    spotLight: 'Spot Light',
    ambientLight: 'Ambient Light',
    gltfModel: 'Model',
    meshPart: 'Part',
    skeletonDummy: 'Dummy',
  };
  return count === 1 ? names[type] : `${names[type]} ${count}`;
}

interface SceneState {
  objects: SceneObject[];
  selectedId: string | null;
  selectedIds: string[];
  transformMode: TransformMode;
  snapEnabled: boolean;
  snapValue: number;
  showGrid: boolean;
  showAxes: boolean;
  postProcessing: {
    bloom: boolean;
    bloomIntensity: number;
    vignette: boolean;
    vignetteIntensity: number;
  };
  animation: {
    currentTime: number;
    isPlaying: boolean;
    duration: number;
  };

  // Actions
  addObject: (type: ObjectType) => void;
  addDummy: () => void;
  addGLBModel: (path: string) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  duplicateObject: (id: string) => void;
  splitObject: (id: string, cutThreshold?: number) => Promise<number>;
  mergeSelected: () => void;
  selectObject: (id: string | null, additive?: boolean) => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleSnap: () => void;
  setSnapValue: (value: number) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  togglePostProcessing: (effect: 'bloom' | 'vignette') => void;
  setPostProcessingValue: (effect: 'bloomIntensity' | 'vignetteIntensity', value: number) => void;
  setAnimationTime: (time: number) => void;
  toggleAnimation: () => void;
  addKeyframe: (objectId: string, keyframe: Keyframe) => void;
  removeKeyframe: (objectId: string, time: number) => void;
  resetScene: () => void;
  loadScene: (objects: SceneObject[]) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: createDefaultObjects(),
  selectedId: null,
  selectedIds: [],
  transformMode: 'translate',
  snapEnabled: false,
  snapValue: 0.5,
  showGrid: true,
  showAxes: true,
  postProcessing: {
    bloom: false,
    bloomIntensity: 0.5,
    vignette: false,
    vignetteIntensity: 0.5,
  },
  animation: {
    currentTime: 0,
    isPlaying: false,
    duration: 5,
  },

  addObject: (type) => {
    const { objects } = get();
    const isLight = type.includes('Light');
    const newObj: SceneObject = {
      id: generateId(),
      name: getObjectName(type, objects),
      type,
      position: [0, isLight ? 3 : 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      visible: true,
      lightProps: isLight ? { ...DEFAULT_LIGHT_PROPS } : undefined,
      geometryParams: !isLight ? { ...DEFAULT_GEOMETRY[type] } : undefined,
      animationTracks: [],
    };
    set({ objects: [...objects, newObj], selectedId: newObj.id, selectedIds: [newObj.id] });
  },

  addDummy: () => {
    const { objects } = get();
    const newObj: SceneObject = {
      id: generateId(),
      name: getObjectName('skeletonDummy', objects),
      type: 'skeletonDummy',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      visible: true,
      animationTracks: [],
    };
    set({ objects: [...objects, newObj], selectedId: newObj.id, selectedIds: [newObj.id] });
  },

  addGLBModel: (path) => {
    const { objects } = get();
    const newObj: SceneObject = {
      id: generateId(),
      name: getObjectName('gltfModel', objects),
      type: 'gltfModel',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      visible: true,
      gltfPath: path,
      animationTracks: [],
    };
    set({ objects: [...objects, newObj], selectedId: newObj.id, selectedIds: [newObj.id] });
  },

  removeObject: (id) => {
    set(state => {
      const removed = state.objects.find(o => o.id === id);
      if (removed?.geometryId) removeGeometry(removed.geometryId);
      const newSelectedIds = state.selectedIds.filter(i => i !== id);
      return {
        objects: state.objects.filter(o => o.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        selectedIds: newSelectedIds,
      };
    });
  },

  updateObject: (id, updates) => {
    set(state => ({
      objects: state.objects.map(o => (o.id === id ? { ...o, ...updates } : o)),
    }));
  },

  duplicateObject: (id) => {
    const { objects } = get();
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    const newObj: SceneObject = {
      ...JSON.parse(JSON.stringify(obj)),
      id: generateId(),
      name: `${obj.name} Copy`,
      position: [obj.position[0] + 1, obj.position[1], obj.position[2]],
    };
    set({ objects: [...objects, newObj], selectedId: newObj.id, selectedIds: [newObj.id] });
  },

  splitObject: async (id, cutThreshold = 0) => {
    const { objects } = get();
    const obj = objects.find(o => o.id === id);
    if (!obj || obj.type !== 'gltfModel' || !obj.gltfPath) return 0;

    const parts = await loadAndSplitGLB(obj.gltfPath, cutThreshold);
    if (parts.length === 0) return 0;

    const modelMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...obj.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation)),
      new THREE.Vector3(...obj.scale),
    );

    const partColors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a29bfe', '#fd79a8',
      '#00b894', '#e17055', '#74b9ff', '#ffeaa7', '#dfe6e9', '#fab1a0',
    ];

    const newObjects: SceneObject[] = parts.map((part, i) => {
      const geometryId = generateId();
      registerGeometry(geometryId, part.geometry);
      const worldCenter = part.center.clone().applyMatrix4(modelMatrix);
      return {
        id: generateId(),
        name: part.name,
        type: 'meshPart',
        position: [worldCenter.x, worldCenter.y, worldCenter.z],
        rotation: [...obj.rotation] as [number, number, number],
        scale: [...obj.scale] as [number, number, number],
        material: { ...DEFAULT_MATERIAL, color: partColors[i % partColors.length] },
        visible: true,
        geometryId,
        animationTracks: [],
      };
    });

    set(state => ({
      objects: [
        ...state.objects.filter(o => o.id !== id),
        ...newObjects,
      ],
      selectedId: newObjects[0]?.id ?? null,
      selectedIds: newObjects.length ? [newObjects[0].id] : [],
    }));

    return parts.length;
  },

  mergeSelected: () => {
    const { objects, selectedIds } = get();
    const parts = objects.filter(
      o => selectedIds.includes(o.id) && o.type === 'meshPart' && o.geometryId,
    );
    if (parts.length < 2) return;

    const items = parts
      .map(p => {
        const geo = p.geometryId ? getGeometry(p.geometryId) : undefined;
        if (!geo) return null;
        const matrix = new THREE.Matrix4().compose(
          new THREE.Vector3(...p.position),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)),
          new THREE.Vector3(...p.scale),
        );
        return { geometry: geo, matrix };
      })
      .filter((x): x is { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 } => x !== null);

    if (items.length < 2) return;

    const merged = mergeGeometriesWithTransform(items);
    merged.computeBoundingBox();
    const center = new THREE.Vector3();
    merged.boundingBox!.getCenter(center);
    merged.translate(-center.x, -center.y, -center.z);
    merged.computeBoundingBox();
    merged.computeBoundingSphere();

    const newGeoId = generateId();
    registerGeometry(newGeoId, merged);

    const newObj: SceneObject = {
      id: generateId(),
      name: 'Merged Part',
      type: 'meshPart',
      position: [center.x, center.y, center.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      visible: true,
      geometryId: newGeoId,
      animationTracks: [],
    };

    // NOTE: old part geometries are intentionally NOT disposed here so that
    // undo can restore them. They are reclaimed when the object is deleted.
    set(state => ({
      objects: [
        ...state.objects.filter(o => !selectedIds.includes(o.id)),
        newObj,
      ],
      selectedId: newObj.id,
      selectedIds: [newObj.id],
    }));
  },

  selectObject: (id, additive) => {
    if (id === null) {
      set({ selectedId: null, selectedIds: [] });
      return;
    }
    if (additive) {
      set(state => {
        const ids = state.selectedIds.includes(id)
          ? state.selectedIds.filter(i => i !== id)
          : [...state.selectedIds, id];
        return {
          selectedIds: ids,
          selectedId: ids.length > 0 ? ids[ids.length - 1] : null,
        };
      });
    } else {
      set({ selectedId: id, selectedIds: [id] });
    }
  },

  setTransformMode: (mode) => set({ transformMode: mode }),

  toggleSnap: () => set(state => ({ snapEnabled: !state.snapEnabled })),

  setSnapValue: (value) => set({ snapValue: value }),

  toggleGrid: () => set(state => ({ showGrid: !state.showGrid })),

  toggleAxes: () => set(state => ({ showAxes: !state.showAxes })),

  togglePostProcessing: (effect) => {
    set(state => ({
      postProcessing: {
        ...state.postProcessing,
        [effect]: !state.postProcessing[effect],
      },
    }));
  },

  setPostProcessingValue: (effect, value) => {
    set(state => ({
      postProcessing: {
        ...state.postProcessing,
        [effect]: value,
      },
    }));
  },

  setAnimationTime: (time) => {
    set(state => ({
      animation: { ...state.animation, currentTime: time },
    }));
  },

  toggleAnimation: () => {
    set(state => ({
      animation: { ...state.animation, isPlaying: !state.animation.isPlaying },
    }));
  },

  addKeyframe: (objectId, keyframe) => {
    set(state => ({
      objects: state.objects.map(o => {
        if (o.id !== objectId) return o;
        const tracks = [...(o.animationTracks || [])];
        const existing = tracks.findIndex(k => k.time === keyframe.time);
        if (existing >= 0) {
          tracks[existing] = keyframe;
        } else {
          tracks.push(keyframe);
          tracks.sort((a, b) => a.time - b.time);
        }
        return { ...o, animationTracks: tracks };
      }),
    }));
  },

  removeKeyframe: (objectId, time) => {
    set(state => ({
      objects: state.objects.map(o => {
        if (o.id !== objectId) return o;
        return {
          ...o,
          animationTracks: (o.animationTracks || []).filter(k => k.time !== time),
        };
      }),
    }));
  },

  resetScene: () => set({ objects: [], selectedId: null, selectedIds: [] }),

  loadScene: (objects) => set({ objects, selectedId: null, selectedIds: [] }),
}));
