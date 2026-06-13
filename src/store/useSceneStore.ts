import { create } from 'zustand';
import type { SceneObject, ObjectType, TransformMode, Keyframe } from '../types';
import { DEFAULT_MATERIAL, DEFAULT_LIGHT_PROPS, DEFAULT_GEOMETRY } from '../types';

function generateId() {
  return Math.random().toString(36).slice(2, 11);
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
  };
  return count === 1 ? names[type] : `${names[type]} ${count}`;
}

interface SceneState {
  objects: SceneObject[];
  selectedId: string | null;
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
  addGLBModel: (path: string) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  duplicateObject: (id: string) => void;
  selectObject: (id: string | null) => void;
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
  objects: [],
  selectedId: null,
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
    set({ objects: [...objects, newObj], selectedId: newObj.id });
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
    set({ objects: [...objects, newObj], selectedId: newObj.id });
  },

  removeObject: (id) => {
    set(state => ({
      objects: state.objects.filter(o => o.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
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
    set({ objects: [...objects, newObj], selectedId: newObj.id });
  },

  selectObject: (id) => set({ selectedId: id }),

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

  resetScene: () => set({ objects: [], selectedId: null }),

  loadScene: (objects) => set({ objects, selectedId: null }),
}));
