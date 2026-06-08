import { create } from 'zustand';
import type { SceneObject } from '../types';

interface HistoryState {
  past: SceneObject[][];
  future: SceneObject[][];
  push: (state: SceneObject[]) => void;
  undo: (current: SceneObject[]) => SceneObject[] | null;
  redo: (current: SceneObject[]) => SceneObject[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (state) => {
    set(s => ({
      past: [...s.past.slice(-(MAX_HISTORY - 1)), state],
      future: [],
    }));
  },

  undo: (current) => {
    const { past } = get();
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [current, ...get().future],
    });
    return previous;
  },

  redo: (current) => {
    const { future } = get();
    if (future.length === 0) return null;
    const next = future[0];
    set({
      future: future.slice(1),
      past: [...get().past, current],
    });
    return next;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
