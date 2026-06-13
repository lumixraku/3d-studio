# Progress

Branch: `feat/glb-skeletal-animation`

## Done
- 3D editor scaffold (React + Three.js): scene hierarchy, transform gizmos, properties panel, animation timeline, undo/redo, save/load, GLTF export, post-processing.
- GLB shark model loading with runtime auto-rigged skeletal animation.
- Shark walk-cycle skeleton, skeleton preview thumbnail, humanoid dummy.
- Editor opens with the shark GLB loaded by default (`createDefaultObjects`).
- Viewport camera navigation: left-drag pans, **Shift+drag orbits**, scroll zooms.
  Set declaratively via the `mouseButtons` prop on `<OrbitControls>` (Three.js
  switches PAN→ROTATE automatically while Shift is held).
- Status bar updated with navigation hints.

## Notes
- Camera controls live in `src/ui/Viewport.tsx`.
- Default scene objects live in `src/store/useSceneStore.ts` (`createDefaultObjects`).
