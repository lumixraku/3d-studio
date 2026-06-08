import { useState } from 'react';
import { Toolbar } from './ui/Toolbar';
import { HierarchyPanel } from './ui/HierarchyPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { AnimationTimeline } from './ui/AnimationTimeline';
import { Viewport } from './ui/Viewport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

function App() {
  useKeyboardShortcuts();
  const [viewTrigger, setViewTrigger] = useState<{ view: string; timestamp: number } | null>(null);

  const handleCameraView = (view: string) => {
    setViewTrigger({ view, timestamp: Date.now() });
  };

  return (
    <div style={styles.app}>
      <Toolbar onCameraView={handleCameraView} />
      <div style={styles.main}>
        <HierarchyPanel />
        <div style={styles.center}>
          <Viewport viewTrigger={viewTrigger} />
          <AnimationTimeline />
        </div>
        <PropertiesPanel />
      </div>
      <div style={styles.statusBar}>
        <span>Ready</span>
        <span>W: Move | E: Rotate | R: Scale | Del: Delete | Ctrl+Z: Undo | Ctrl+D: Duplicate | Ctrl+S: Save</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f7',
    color: '#1d1d1f',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  statusBar: {
    height: 22,
    background: '#ffffff',
    borderTop: '1px solid #d2d2d7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: 10,
    color: '#86868b',
    flexShrink: 0,
  },
};

export default App;
