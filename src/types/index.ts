export type ObjectType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'plane'
  | 'torus'
  | 'cone'
  | 'pointLight'
  | 'directionalLight'
  | 'spotLight'
  | 'ambientLight';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface MaterialProps {
  color: string;
  metalness: number;
  roughness: number;
  wireframe: boolean;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
}

export interface LightProps {
  color: string;
  intensity: number;
  distance: number;
  angle: number;
  penumbra: number;
  castShadow: boolean;
}

export interface GeometryParams {
  [key: string]: number;
}

export interface Keyframe {
  time: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface AnimationTrack {
  objectId: string;
  keyframes: Keyframe[];
}

export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material: MaterialProps;
  visible: boolean;
  lightProps?: LightProps;
  geometryParams?: GeometryParams;
  animationTracks?: Keyframe[];
}

export interface CameraView {
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_VIEWS: Record<string, CameraView> = {
  front: { position: [0, 0, 8], target: [0, 0, 0] },
  back: { position: [0, 0, -8], target: [0, 0, 0] },
  top: { position: [0, 8, 0], target: [0, 0, 0] },
  bottom: { position: [0, -8, 0], target: [0, 0, 0] },
  left: { position: [-8, 0, 0], target: [0, 0, 0] },
  right: { position: [8, 0, 0], target: [0, 0, 0] },
  perspective: { position: [5, 5, 5], target: [0, 0, 0] },
};

export const DEFAULT_MATERIAL: MaterialProps = {
  color: '#5e5ce6',
  metalness: 0.1,
  roughness: 0.6,
  wireframe: false,
  opacity: 1,
  emissive: '#000000',
  emissiveIntensity: 0,
};

export const DEFAULT_LIGHT_PROPS: LightProps = {
  color: '#ffffff',
  intensity: 1,
  distance: 0,
  angle: Math.PI / 3,
  penumbra: 0,
  castShadow: true,
};

export const DEFAULT_GEOMETRY: Record<string, GeometryParams> = {
  cube: { width: 1, height: 1, depth: 1 },
  sphere: { radius: 0.5, widthSegments: 32, heightSegments: 32 },
  cylinder: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 32 },
  plane: { width: 2, height: 2 },
  torus: { radius: 0.5, tube: 0.2, radialSegments: 16, tubularSegments: 48 },
  cone: { radius: 0.5, height: 1, radialSegments: 32 },
};
