# Progress

Branch: `main`

## Done
- 3D editor scaffold (React + Three.js): scene hierarchy, transform gizmos, properties panel, animation timeline, undo/redo, save/load, GLTF export, post-processing.
- GLB shark model loading with runtime auto-rigged skeletal animation.
- Shark walk-cycle skeleton, skeleton preview thumbnail, humanoid dummy.
- Editor opens with the shark GLB loaded by default (`createDefaultObjects`).
- Viewport camera navigation: left-drag pans, **Shift+drag orbits**, scroll zooms.
  Set declaratively via the `mouseButtons` prop on `<OrbitControls>` (Three.js
  switches PAN→ROTATE automatically while Shift is held).
- Status bar updated with navigation hints.
- **Model part-splitting (拆件)**: select a GLB model and split it into
  independently movable parts via connected-components analysis (Union-Find)
  with an optional long-edge-breaking heuristic for single-piece meshes.
  - `src/three/splitGeometry.ts` — geometry processing core.
  - `src/three/geometryRegistry.ts` — in-memory store for split-part geometries.
  - `src/store/useSceneStore.ts` — `splitObject(id, cutThreshold)` action.
  - Split UI (sensitivity slider + button) in the Properties panel.

## Notes
- Camera controls live in `src/ui/Viewport.tsx`.
- Default scene objects live in `src/store/useSceneStore.ts` (`createDefaultObjects`).
- Split-part geometries are held in `geometryRegistry` (not the serializable
  store); `removeObject` disposes them on deletion. Undo restores object
  metadata but does not reclaim orphaned geometries.
