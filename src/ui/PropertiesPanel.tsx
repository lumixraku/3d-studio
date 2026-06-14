import { useState } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import { useHistoryStore } from '../store/useHistoryStore';
import type { SceneObject, MaterialProps, LightProps } from '../types';
import { DEFAULT_LIGHT_PROPS } from '../types';
import { SkeletonPreview } from './SkeletonPreview';

function NumberInput({ label, value, onChange, step = 0.1, min, max }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div style={styles.inputRow}>
      <label style={styles.inputLabel}>{label}</label>
      <input
        type="number"
        style={styles.numberInput}
        value={Math.round(value * 100) / 100}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function Vec3Input({ label, value, onChange, step = 0.1 }: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  return (
    <div style={styles.vecRow}>
      <label style={styles.vecLabel}>{label}</label>
      <div style={styles.vecInputs}>
        <div style={styles.vecInputGroup}>
          <span style={styles.vecAxis}>X</span>
          <input type="number" style={styles.vecInput} value={Math.round(value[0] * 100) / 100} step={step}
            onChange={(e) => onChange([parseFloat(e.target.value) || 0, value[1], value[2]])} />
        </div>
        <div style={styles.vecInputGroup}>
          <span style={{ ...styles.vecAxis, color: '#4ade80' }}>Y</span>
          <input type="number" style={styles.vecInput} value={Math.round(value[1] * 100) / 100} step={step}
            onChange={(e) => onChange([value[0], parseFloat(e.target.value) || 0, value[2]])} />
        </div>
        <div style={styles.vecInputGroup}>
          <span style={{ ...styles.vecAxis, color: '#60a5fa' }}>Z</span>
          <input type="number" style={styles.vecInput} value={Math.round(value[2] * 100) / 100} step={step}
            onChange={(e) => onChange([value[0], value[1], parseFloat(e.target.value) || 0])} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

export function PropertiesPanel() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const updateObject = useSceneStore(s => s.updateObject);
  const splitObject = useSceneStore(s => s.splitObject);
  const pushHistory = useHistoryStore(s => s.push);
  const [splitBusy, setSplitBusy] = useState(false);
  const [splitMsg, setSplitMsg] = useState<string | null>(null);
  const [cutSensitivity, setCutSensitivity] = useState(0);

  const obj = objects.find(o => o.id === selectedId);

  if (!obj) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>Properties</div>
        <div style={styles.empty}>Select an object to edit its properties.</div>
      </div>
    );
  }

  const handleChange = <K extends keyof SceneObject>(key: K, value: SceneObject[K]) => {
    pushHistory([...objects]);
    updateObject(obj.id, { [key]: value });
  };

  const handleMaterialChange = (key: keyof MaterialProps, value: any) => {
    pushHistory([...objects]);
    updateObject(obj.id, { material: { ...obj.material, [key]: value } });
  };

  const handleLightChange = (key: keyof LightProps, value: any) => {
    pushHistory([...objects]);
    updateObject(obj.id, { lightProps: { ...DEFAULT_LIGHT_PROPS, ...(obj.lightProps || {}), [key]: value } });
  };

  const handleGeoChange = (key: string, value: number) => {
    pushHistory([...objects]);
    updateObject(obj.id, { geometryParams: { ...(obj.geometryParams || {}), [key]: value } });
  };

  const isLight = obj.type.includes('Light');
  const deg = (r: number) => Math.round((r * 180 / Math.PI) * 100) / 100;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Properties</div>
      <div style={styles.content}>
        <Section title="Object">
          <div style={styles.inputRow}>
            <label style={styles.inputLabel}>Name</label>
            <input style={styles.textInput} value={obj.name}
              onChange={(e) => handleChange('name', e.target.value)} />
          </div>
          <div style={styles.inputRow}>
            <label style={styles.inputLabel}>Type</label>
            <span style={styles.typeLabel}>{obj.type}</span>
          </div>
        </Section>

        {obj.type === 'gltfModel' && (
          <Section title="Skeleton Animation">
            <SkeletonPreview />
          </Section>
        )}

        {obj.type === 'gltfModel' && (
          <Section title="Split Parts">
            <div style={styles.splitDesc}>
              Break the model into independently movable parts.
            </div>
            <div style={styles.inputRow}>
              <label style={styles.inputLabel}>Sensitivity</label>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={cutSensitivity}
                style={{ flex: 1 }}
                onChange={(e) => setCutSensitivity(parseInt(e.target.value))}
              />
              <span style={styles.splitVal}>{cutSensitivity === 0 ? 'Off' : (cutSensitivity / 10).toFixed(1)}</span>
            </div>
            <div style={styles.splitHint}>
              {cutSensitivity === 0
                ? 'Connected parts only — splits multi-piece models.'
                : 'Also cuts thin/long connections. Higher = more fragments.'}
            </div>
            <button
              style={{ ...styles.splitBtn, ...(splitBusy ? styles.splitBtnBusy : {}) }}
              disabled={splitBusy}
              onClick={async () => {
                setSplitBusy(true);
                setSplitMsg(null);
                pushHistory([...objects]);
                const n = await splitObject(obj.id, cutSensitivity / 10);
                setSplitBusy(false);
                setSplitMsg(n > 0 ? `Split into ${n} parts.` : 'Model is a single connected piece — try raising sensitivity.');
              }}
            >
              {splitBusy ? 'Splitting…' : '✂ Split into Parts'}
            </button>
            {splitMsg && <div style={styles.splitResult}>{splitMsg}</div>}
          </Section>
        )}

        <Section title="Transform">
          <Vec3Input label="Position" value={obj.position}
            onChange={(v) => handleChange('position', v)} />
          <Vec3Input label="Rotation" value={[deg(obj.rotation[0]), deg(obj.rotation[1]), deg(obj.rotation[2])]}
            step={1}
            onChange={(v) => handleChange('rotation', [v[0] * Math.PI / 180, v[1] * Math.PI / 180, v[2] * Math.PI / 180])} />
          <Vec3Input label="Scale" value={obj.scale}
            onChange={(v) => handleChange('scale', v)} />
        </Section>

        {!isLight && (
          <Section title="Material">
            <div style={styles.inputRow}>
              <label style={styles.inputLabel}>Color</label>
              <input type="color" style={styles.colorInput} value={obj.material.color}
                onChange={(e) => handleMaterialChange('color', e.target.value)} />
            </div>
            <NumberInput label="Metalness" value={obj.material.metalness} min={0} max={1} step={0.05}
              onChange={(v) => handleMaterialChange('metalness', v)} />
            <NumberInput label="Roughness" value={obj.material.roughness} min={0} max={1} step={0.05}
              onChange={(v) => handleMaterialChange('roughness', v)} />
            <NumberInput label="Opacity" value={obj.material.opacity} min={0} max={1} step={0.05}
              onChange={(v) => handleMaterialChange('opacity', v)} />
            <div style={styles.inputRow}>
              <label style={styles.inputLabel}>Emissive</label>
              <input type="color" style={styles.colorInput} value={obj.material.emissive}
                onChange={(e) => handleMaterialChange('emissive', e.target.value)} />
            </div>
            <NumberInput label="Emissive Int." value={obj.material.emissiveIntensity} min={0} max={5} step={0.1}
              onChange={(v) => handleMaterialChange('emissiveIntensity', v)} />
            <div style={styles.inputRow}>
              <label style={styles.inputLabel}>Wireframe</label>
              <input type="checkbox" checked={obj.material.wireframe}
                onChange={(e) => handleMaterialChange('wireframe', e.target.checked)} />
            </div>
          </Section>
        )}

        {isLight && obj.lightProps && (
          <Section title="Light">
            <div style={styles.inputRow}>
              <label style={styles.inputLabel}>Color</label>
              <input type="color" style={styles.colorInput} value={obj.lightProps.color}
                onChange={(e) => handleLightChange('color', e.target.value)} />
            </div>
            <NumberInput label="Intensity" value={obj.lightProps.intensity} min={0} max={20} step={0.1}
              onChange={(v) => handleLightChange('intensity', v)} />
            {obj.type !== 'ambientLight' && (
              <>
                <NumberInput label="Distance" value={obj.lightProps.distance} min={0} max={100} step={1}
                  onChange={(v) => handleLightChange('distance', v)} />
                <div style={styles.inputRow}>
                  <label style={styles.inputLabel}>Shadow</label>
                  <input type="checkbox" checked={obj.lightProps.castShadow}
                    onChange={(e) => handleLightChange('castShadow', e.target.checked)} />
                </div>
              </>
            )}
            {obj.type === 'spotLight' && (
              <>
                <NumberInput label="Angle" value={Math.round(obj.lightProps.angle * 180 / Math.PI)} min={0} max={90} step={1}
                  onChange={(v) => handleLightChange('angle', v * Math.PI / 180)} />
                <NumberInput label="Penumbra" value={obj.lightProps.penumbra} min={0} max={1} step={0.05}
                  onChange={(v) => handleLightChange('penumbra', v)} />
              </>
            )}
          </Section>
        )}

        {!isLight && obj.geometryParams && (
          <Section title="Geometry">
            {Object.entries(obj.geometryParams).map(([key, val]) => (
              <NumberInput key={key} label={key} value={val}
                step={key.includes('Segments') ? 1 : 0.1}
                min={key.includes('Segments') ? 3 : 0.01}
                max={key.includes('Segments') ? 128 : 20}
                onChange={(v) => handleGeoChange(key, v)} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 260,
    background: '#fafafa',
    borderLeft: '1px solid #d2d2d7',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
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
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  empty: {
    padding: '20px 12px',
    fontSize: 11,
    color: '#86868b',
    textAlign: 'center',
  },
  section: {
    borderBottom: '1px solid #d2d2d7',
    padding: '8px 12px',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#007aff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    color: '#86868b',
    width: 80,
    flexShrink: 0,
  },
  numberInput: {
    width: 80,
    background: '#ffffff',
    border: '1px solid #d2d2d7',
    borderRadius: 4,
    color: '#1d1d1f',
    padding: '4px 6px',
    fontSize: 11,
    outline: 'none',
    textAlign: 'right',
  },
  textInput: {
    flex: 1,
    background: '#ffffff',
    border: '1px solid #d2d2d7',
    borderRadius: 4,
    color: '#1d1d1f',
    padding: '4px 6px',
    fontSize: 11,
    outline: 'none',
  },
  colorInput: {
    width: 40,
    height: 24,
    border: '1px solid #d2d2d7',
    borderRadius: 4,
    cursor: 'pointer',
    background: 'none',
    padding: 0,
  },
  typeLabel: {
    fontSize: 11,
    color: '#1d1d1f',
    background: '#e8e8ed',
    padding: '2px 8px',
    borderRadius: 4,
  },
  vecRow: {
    marginBottom: 6,
  },
  vecLabel: {
    fontSize: 11,
    color: '#86868b',
    display: 'block',
    marginBottom: 3,
  },
  vecInputs: {
    display: 'flex',
    gap: 4,
  },
  vecInputGroup: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid #d2d2d7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  vecAxis: {
    fontSize: 9,
    fontWeight: 700,
    color: '#ff3b30',
    padding: '0 4px',
    width: 16,
    textAlign: 'center',
  },
  vecInput: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#1d1d1f',
    padding: '4px 4px',
    fontSize: 11,
    outline: 'none',
    textAlign: 'right',
  },
  splitDesc: {
    fontSize: 11,
    color: '#86868b',
    marginBottom: 8,
  },
  splitVal: {
    fontSize: 11,
    color: '#1d1d1f',
    width: 28,
    textAlign: 'right',
  },
  splitHint: {
    fontSize: 10,
    color: '#aeaeb2',
    marginBottom: 8,
    lineHeight: 1.4,
  },
  splitBtn: {
    width: '100%',
    background: '#007aff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  splitBtnBusy: {
    background: '#a0c4ff',
    cursor: 'default',
  },
  splitResult: {
    fontSize: 11,
    color: '#34c759',
    marginTop: 8,
    textAlign: 'center',
  },
};
