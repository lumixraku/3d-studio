import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import { TransformGizmo } from './TransformGizmo';
import { SharkDance } from './SharkDance';
import { SkeletonDummy } from './SkeletonDummy';
import { getGeometry } from './geometryRegistry';
import type { SceneObject, Keyframe, LightProps } from '../types';
import { DEFAULT_LIGHT_PROPS } from '../types';

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function interpolateKeyframes(tracks: Keyframe[], time: number) {
  if (!tracks || tracks.length === 0) return null;
  if (tracks.length === 1) return tracks[0];
  
  if (time <= tracks[0].time) return tracks[0];
  if (time >= tracks[tracks.length - 1].time) return tracks[tracks.length - 1];
  
  for (let i = 0; i < tracks.length - 1; i++) {
    if (time >= tracks[i].time && time <= tracks[i + 1].time) {
      const t = (time - tracks[i].time) / (tracks[i + 1].time - tracks[i].time);
      return {
        position: lerp3(tracks[i].position, tracks[i + 1].position, t),
        rotation: lerp3(tracks[i].rotation, tracks[i + 1].rotation, t),
        scale: lerp3(tracks[i].scale, tracks[i + 1].scale, t),
      };
    }
  }
  return tracks[tracks.length - 1];
}

function SceneObject3D({ obj, isSelected, isPrimary, onSelect }: {
  obj: SceneObject;
  isSelected: boolean;
  isPrimary: boolean;
  onSelect: (additive?: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.Light>(null);
  const animation = useSceneStore(s => s.animation);

  // Apply animation
  useFrame(() => {
    if (!animation.isPlaying && animation.currentTime === 0) return;
    if (!obj.animationTracks || obj.animationTracks.length === 0) return;
    
    const interpolated = interpolateKeyframes(obj.animationTracks, animation.currentTime);
    if (interpolated && meshRef.current) {
      meshRef.current.position.set(...interpolated.position);
      meshRef.current.rotation.set(...interpolated.rotation);
      meshRef.current.scale.set(...interpolated.scale);
    }
  });

  // Sync position from store (when not animating)
  useEffect(() => {
    if (meshRef.current && !animation.isPlaying) {
      meshRef.current.position.set(...obj.position);
      meshRef.current.rotation.set(...obj.rotation);
      meshRef.current.scale.set(...obj.scale);
    }
    if (lightRef.current && !animation.isPlaying) {
      lightRef.current.position.set(...obj.position);
    }
  }, [obj.position, obj.rotation, obj.scale, animation.isPlaying]);

  if (!obj.visible) return null;

  if (obj.type === 'gltfModel') {
    return (
      <SharkDance
        key={obj.id}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        isSelected={isSelected}
        isPrimary={isPrimary}
        onSelect={onSelect}
      />
    );
  }

  if (obj.type === 'skeletonDummy') {
    return (
      <SkeletonDummy
        key={obj.id}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        isSelected={isSelected}
        isPrimary={isPrimary}
        onSelect={onSelect}
      />
    );
  }

  if (obj.type === 'meshPart') {
    return <MeshPartRender key={obj.id} obj={obj} isSelected={isSelected} isPrimary={isPrimary} onSelect={onSelect} />;
  }

  const isLight = obj.type.includes('Light');

  const renderGeometry = () => {
    const p = obj.geometryParams || {};
    switch (obj.type) {
      case 'cube':
        return <boxGeometry args={[p.width || 1, p.height || 1, p.depth || 1]} />;
      case 'sphere':
        return <sphereGeometry args={[p.radius || 0.5, p.widthSegments || 32, p.heightSegments || 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[p.radiusTop || 0.5, p.radiusBottom || 0.5, p.height || 1, p.radialSegments || 32]} />;
      case 'plane':
        return <planeGeometry args={[p.width || 2, p.height || 2]} />;
      case 'torus':
        return <torusGeometry args={[p.radius || 0.5, p.tube || 0.2, p.radialSegments || 16, p.tubularSegments || 48]} />;
      case 'cone':
        return <coneGeometry args={[p.radius || 0.5, p.height || 1, p.radialSegments || 32]} />;
      default:
        return <boxGeometry />;
    }
  };

  const renderLight = () => {
    const lp: LightProps = obj.lightProps || DEFAULT_LIGHT_PROPS;
    switch (obj.type) {
      case 'pointLight':
        return (
          <pointLight
            ref={lightRef as any}
            color={lp.color}
            intensity={lp.intensity}
            distance={lp.distance}
            castShadow={lp.castShadow}
          />
        );
      case 'directionalLight':
        return (
          <directionalLight
            ref={lightRef as any}
            color={lp.color}
            intensity={lp.intensity}
            castShadow={lp.castShadow}
          />
        );
      case 'spotLight':
        return (
          <spotLight
            ref={lightRef as any}
            color={lp.color}
            intensity={lp.intensity}
            distance={lp.distance}
            angle={lp.angle}
            penumbra={lp.penumbra}
            castShadow={lp.castShadow}
          />
        );
      case 'ambientLight':
        return <ambientLight color={lp.color} intensity={lp.intensity} />;
      default:
        return null;
    }
  };

  // Light helper visualization
  const renderLightHelper = () => {
    return null;
  };

  if (isLight) {
    return (
      <group
        ref={lightRef as any}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey || e.metaKey || e.ctrlKey); }}
      >
        {renderLight()}
        {/* Light indicator sphere */}
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial
            color={obj.lightProps?.color || '#ffff00'}
            transparent
            opacity={0.6}
          />
        </mesh>
        {isSelected && (
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#007aff" wireframe transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <>
      <mesh
        ref={meshRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey || e.metaKey || e.ctrlKey); }}
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={obj.material.color}
          metalness={obj.material.metalness}
          roughness={obj.material.roughness}
          wireframe={obj.material.wireframe}
          transparent={obj.material.opacity < 1}
          opacity={obj.material.opacity}
          emissive={obj.material.emissive}
          emissiveIntensity={obj.material.emissiveIntensity}
        />
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[meshRef.current?.geometry]} />
            <lineBasicMaterial color="#007aff" linewidth={2} />
          </lineSegments>
        )}
      </mesh>
      {isPrimary && <TransformGizmo meshRef={meshRef} />}
    </>
  );
}

function MeshPartRender({ obj, isSelected, isPrimary, onSelect }: {
  obj: SceneObject;
  isSelected: boolean;
  isPrimary: boolean;
  onSelect: (additive?: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const animation = useSceneStore(s => s.animation);
  const geometry = useMemo(
    () => (obj.geometryId ? getGeometry(obj.geometryId) ?? null : null),
    [obj.geometryId],
  );

  useFrame(() => {
    if (!animation.isPlaying && animation.currentTime === 0) return;
    if (!obj.animationTracks || obj.animationTracks.length === 0) return;
    const interpolated = interpolateKeyframes(obj.animationTracks, animation.currentTime);
    if (interpolated && meshRef.current) {
      meshRef.current.position.set(...interpolated.position);
      meshRef.current.rotation.set(...interpolated.rotation);
      meshRef.current.scale.set(...interpolated.scale);
    }
  });

  useEffect(() => {
    if (meshRef.current && !animation.isPlaying) {
      meshRef.current.position.set(...obj.position);
      meshRef.current.rotation.set(...obj.rotation);
      meshRef.current.scale.set(...obj.scale);
    }
  }, [obj.position, obj.rotation, obj.scale, animation.isPlaying]);

  if (!geometry) return null;

  return (
    <>
      <mesh
        ref={meshRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey || e.metaKey || e.ctrlKey); }}
      >
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          color={obj.material.color}
          metalness={obj.material.metalness}
          roughness={obj.material.roughness}
          wireframe={obj.material.wireframe}
          transparent={obj.material.opacity < 1}
          opacity={obj.material.opacity}
          emissive={obj.material.emissive}
          emissiveIntensity={obj.material.emissiveIntensity}
        />
        {isSelected && (
          <mesh geometry={geometry}>
            <meshBasicMaterial color="#007aff" wireframe transparent opacity={0.35} />
          </mesh>
        )}
      </mesh>
      {isPrimary && <TransformGizmo meshRef={meshRef} />}
    </>
  );
}

export function SceneContent() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const selectedIds = useSceneStore(s => s.selectedIds);
  const selectObject = useSceneStore(s => s.selectObject);
  const multi = selectedIds.length > 1;

  return (
    <>
      {objects.map(obj => (
        <SceneObject3D
          key={obj.id}
          obj={obj}
          isSelected={selectedIds.includes(obj.id)}
          isPrimary={obj.id === selectedId && !multi}
          onSelect={(additive) => selectObject(obj.id, additive)}
        />
      ))}
    </>
  );
}
