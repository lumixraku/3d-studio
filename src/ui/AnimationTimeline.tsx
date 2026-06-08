import { useState, useRef, useEffect, useCallback } from 'react';
import { useSceneStore } from '../store/useSceneStore';
import { useHistoryStore } from '../store/useHistoryStore';
import type { Keyframe } from '../types';

export function AnimationTimeline() {
  const objects = useSceneStore(s => s.objects);
  const selectedId = useSceneStore(s => s.selectedId);
  const addKeyframe = useSceneStore(s => s.addKeyframe);
  const removeKeyframe = useSceneStore(s => s.removeKeyframe);
  const animation = useSceneStore(s => s.animation);
  const setAnimationTime = useSceneStore(s => s.setAnimationTime);
  const toggleAnimation = useSceneStore(s => s.toggleAnimation);
  const pushHistory = useHistoryStore(s => s.push);

  const selectedObj = objects.find(o => o.id === selectedId);
  const tracks = selectedObj?.animationTracks || [];
  const timelineRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [collapsed, setCollapsed] = useState(false);

  // Animation playback loop
  useEffect(() => {
    if (!animation.isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const newTime = animation.currentTime + delta;
      if (newTime >= animation.duration) {
        setAnimationTime(0);
      } else {
        setAnimationTime(newTime);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animation.isPlaying, animation.currentTime, animation.duration, setAnimationTime]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * animation.duration;
    setAnimationTime(Math.max(0, Math.min(time, animation.duration)));
  };

  const handleAddKeyframe = () => {
    if (!selectedObj) return;
    pushHistory([...objects]);
    const keyframe: Keyframe = {
      time: Math.round(animation.currentTime * 100) / 100,
      position: [...selectedObj.position],
      rotation: [...selectedObj.rotation],
      scale: [...selectedObj.scale],
    };
    addKeyframe(selectedObj.id, keyframe);
  };

  const handleRemoveKeyframe = (time: number) => {
    if (!selectedObj) return;
    pushHistory([...objects]);
    removeKeyframe(selectedObj.id, time);
  };

  const pixelsPerSecond = 100;
  const duration = animation.duration;

  return (
    <div style={{ ...styles.panel, height: collapsed ? 32 : 160 }}>
      <div style={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <span>Animation Timeline {collapsed ? '▲' : '▼'}</span>
        <div style={styles.controls}>
          <button style={styles.ctrlBtn} onClick={(e) => { e.stopPropagation(); toggleAnimation(); }}>
            {animation.isPlaying ? '⏸' : '▶'}
          </button>
          <button style={styles.ctrlBtn} onClick={(e) => { e.stopPropagation(); setAnimationTime(0); }}>
            ⏮
          </button>
          <span style={styles.timeDisplay}>{animation.currentTime.toFixed(2)}s / {duration}s</span>
          <button style={styles.ctrlBtn} onClick={handleAddKeyframe} title="Add keyframe at current time"
            disabled={!selectedObj}>
            + Key
          </button>
        </div>
      </div>
      
      {!collapsed && (
        <div style={styles.body}>
          {/* Time ruler */}
          <div style={styles.ruler} ref={timelineRef} onClick={handleTimelineClick}>
            {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
              <div key={i} style={{ ...styles.rulerMark, left: `${(i / duration) * 100}%` }}>
                <span style={styles.rulerLabel}>{i}s</span>
                <div style={styles.rulerLine} />
              </div>
            ))}
            {/* Playhead */}
            <div style={{ ...styles.playhead, left: `${(animation.currentTime / duration) * 100}%` }} />
          </div>

          {/* Tracks */}
          <div style={styles.tracks}>
            {!selectedObj && (
              <div style={styles.emptyTracks}>Select an object to view its animation tracks.</div>
            )}
            {selectedObj && (
              <div style={styles.track}>
                <div style={styles.trackLabel}>{selectedObj.name}</div>
                <div style={styles.trackTimeline} ref={timelineRef} onClick={handleTimelineClick}>
                  {/* Keyframe diamonds */}
                  {tracks.map((kf, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.keyframe,
                        left: `${(kf.time / duration) * 100}%`,
                      }}
                      onClick={(e) => { e.stopPropagation(); setAnimationTime(kf.time); }}
                      onDoubleClick={(e) => { e.stopPropagation(); handleRemoveKeyframe(kf.time); }}
                      title={`${kf.time.toFixed(2)}s - Double click to remove`}
                    >
                      ◆
                    </div>
                  ))}
                  {/* Playhead in track */}
                  <div style={{ ...styles.playhead, left: `${(animation.currentTime / duration) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#fafafa',
    borderTop: '1px solid #d2d2d7',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
    transition: 'height 0.2s',
  },
  header: {
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#86868b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    background: '#f5f5f7',
    borderBottom: '1px solid #d2d2d7',
    cursor: 'pointer',
    userSelect: 'none',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  ctrlBtn: {
    background: '#ffffff',
    color: '#1d1d1f',
    border: '1px solid #d2d2d7',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  timeDisplay: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#1d1d1f',
    background: '#ffffff',
    padding: '2px 8px',
    borderRadius: 4,
    minWidth: 100,
    textAlign: 'center',
    border: '1px solid #d2d2d7',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  ruler: {
    height: 24,
    position: 'relative',
    background: '#f0f0f2',
    borderBottom: '1px solid #d2d2d7',
    cursor: 'pointer',
    flexShrink: 0,
  },
  rulerMark: {
    position: 'absolute',
    top: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  rulerLabel: {
    fontSize: 9,
    color: '#86868b',
    lineHeight: '14px',
  },
  rulerLine: {
    width: 1,
    flex: 1,
    background: '#d2d2d7',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    background: '#ff3b30',
    zIndex: 10,
    pointerEvents: 'none',
  },
  tracks: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
  },
  emptyTracks: {
    padding: '20px 12px',
    fontSize: 11,
    color: '#86868b',
    textAlign: 'center',
  },
  track: {
    display: 'flex',
    height: 32,
    borderBottom: '1px solid #e8e8ed',
  },
  trackLabel: {
    width: 120,
    padding: '0 8px',
    fontSize: 11,
    color: '#1d1d1f',
    display: 'flex',
    alignItems: 'center',
    background: '#f5f5f7',
    borderRight: '1px solid #d2d2d7',
    flexShrink: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trackTimeline: {
    flex: 1,
    position: 'relative',
    background: '#f0f0f2',
    cursor: 'pointer',
  },
  keyframe: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ff9500',
    fontSize: 14,
    cursor: 'pointer',
    zIndex: 5,
    userSelect: 'none',
    textShadow: '0 0 4px rgba(255,149,0,0.3)',
  },
};
