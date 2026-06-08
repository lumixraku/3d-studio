import { useEffect } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import { useHistoryStore } from '../store/useHistoryStore';

export function useKeyboardShortcuts() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const setTransformMode = useSceneStore(s => s.setTransformMode);
  const removeObject = useSceneStore(s => s.removeObject);
  const duplicateObject = useSceneStore(s => s.duplicateObject);
  const loadScene = useSceneStore(s => s.loadScene);
  const selectObject = useSceneStore(s => s.selectObject);
  const pushHistory = useHistoryStore(s => s.push);
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // Transform modes
      if (!isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'w':
            setTransformMode('translate');
            break;
          case 'e':
            setTransformMode('rotate');
            break;
          case 'r':
            setTransformMode('scale');
            break;
          case 'delete':
          case 'backspace':
            if (selectedId) {
              pushHistory([...objects]);
              removeObject(selectedId);
            }
            break;
          case 'escape':
            selectObject(null);
            break;
        }
      }

      // Ctrl shortcuts
      if (isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              const next = redo(objects);
              if (next) loadScene(next);
            } else {
              const prev = undo(objects);
              if (prev) loadScene(prev);
            }
            break;
          case 'd':
            e.preventDefault();
            if (selectedId) {
              pushHistory([...objects]);
              duplicateObject(selectedId);
            }
            break;
          case 's':
            e.preventDefault();
            const data = JSON.stringify(objects, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scene.json';
            a.click();
            URL.revokeObjectURL(url);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [objects, selectedId, setTransformMode, removeObject, duplicateObject, loadScene, selectObject, pushHistory, undo, redo]);
}
