import { useState } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import { useHistoryStore } from '../store/useHistoryStore';

export function HierarchyPanel() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const selectObject = useSceneStore(s => s.selectObject);
  const updateObject = useSceneStore(s => s.updateObject);
  const removeObject = useSceneStore(s => s.removeObject);
  const duplicateObject = useSceneStore(s => s.duplicateObject);
  const pushHistory = useHistoryStore(s => s.push);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setContextMenu(null);
  };

  const handleRenameSubmit = (id: string) => {
    if (editName.trim()) {
      pushHistory([...objects]);
      updateObject(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    pushHistory([...objects]);
    removeObject(id);
    setContextMenu(null);
  };

  const handleDuplicate = (id: string) => {
    pushHistory([...objects]);
    duplicateObject(id);
    setContextMenu(null);
  };

  const handleVisibility = (e: React.MouseEvent, id: string, visible: boolean) => {
    e.stopPropagation();
    pushHistory([...objects]);
    updateObject(id, { visible: !visible });
  };

  const getIcon = (type: string) => {
    if (type.includes('Light')) return '💡';
    switch (type) {
      case 'cube': return '⬜';
      case 'sphere': return '⚪';
      case 'cylinder': return '⬭';
      case 'plane': return '▬';
      case 'torus': return '◯';
      case 'cone': return '△';
      default: return '◻';
    }
  };

  return (
    <div style={styles.panel} onClick={() => setContextMenu(null)}>
      <div style={styles.header}>Scene Hierarchy</div>
      <div style={styles.list}>
        {objects.length === 0 && (
          <div style={styles.empty}>No objects yet. Add primitives from the toolbar.</div>
        )}
        {objects.map(obj => (
          <div
            key={obj.id}
            style={{
              ...styles.item,
              ...(obj.id === selectedId ? styles.itemSelected : {}),
              opacity: obj.visible ? 1 : 0.5,
            }}
            onClick={() => selectObject(obj.id)}
            onContextMenu={(e) => handleContextMenu(e, obj.id)}
          >
            <span style={styles.icon}>{getIcon(obj.type)}</span>
            {editingId === obj.id ? (
              <input
                style={styles.renameInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(obj.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(obj.id)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span style={styles.name}>{obj.name}</span>
            )}
            <button
              style={styles.eyeBtn}
              onClick={(e) => handleVisibility(e, obj.id, obj.visible)}
              title={obj.visible ? 'Hide' : 'Show'}
            >
              {obj.visible ? '👁' : '🚫'}
            </button>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          style={{ ...styles.contextMenu, left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.menuItem} onClick={() => handleRename(contextMenu.id, objects.find(o => o.id === contextMenu.id)?.name || '')}>
            Rename
          </div>
          <div style={styles.menuItem} onClick={() => handleDuplicate(contextMenu.id)}>
            Duplicate
          </div>
          <div style={styles.menuDivider} />
          <div style={{ ...styles.menuItem, color: '#ff4444' }} onClick={() => handleDelete(contextMenu.id)}>
            Delete
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240,
    background: '#fafafa',
    borderRight: '1px solid #d2d2d7',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
  },
  header: {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#86868b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1px solid #d2d2d7',
    background: '#f5f5f7',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
    color: '#1d1d1f',
    gap: 8,
    userSelect: 'none',
  },
  itemSelected: {
    background: '#e8e8ed',
    color: '#1d1d1f',
  },
  icon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  name: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    padding: '0 2px',
    opacity: 0.6,
  },
  empty: {
    padding: '20px 12px',
    fontSize: 11,
    color: '#86868b',
    textAlign: 'center',
  },
  renameInput: {
    flex: 1,
    background: '#fff',
    border: '1px solid #007aff',
    borderRadius: 3,
    color: '#1d1d1f',
    padding: '2px 6px',
    fontSize: 12,
    outline: 'none',
  },
  contextMenu: {
    position: 'fixed' as const,
    background: '#ffffff',
    border: '1px solid #d2d2d7',
    borderRadius: 6,
    padding: '4px 0',
    minWidth: 140,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 1000,
  },
  menuItem: {
    padding: '8px 16px',
    fontSize: 12,
    color: '#1d1d1f',
    cursor: 'pointer',
  },
  menuDivider: {
    height: 1,
    background: '#d2d2d7',
    margin: '4px 0',
  },
};
