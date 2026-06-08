import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useSceneStore } from '../store/useSceneStore';

export function EditorGrid() {
  const showGrid = useSceneStore(s => s.showGrid);
  const showAxes = useSceneStore(s => s.showAxes);

  return (
    <>
      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#c8c8d0"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#a0a0a8"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
      )}
      {showAxes && (
        <axesHelper args={[5]} />
      )}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={['#ff3653', '#8adb00', '#2c8fff']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}
