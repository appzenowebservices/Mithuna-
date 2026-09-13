// src/systems/Camera/cameraStore.js
//
// Central store for camera modes. Supports the full Blender workflow:
// - Blender Cameras (real Camera objects) OR Empties named CAM_* become
//   monitoring views — auto-discovered from the world GLB
// - Player views: third-person (default) and first-person, switchable at runtime
// - Monitoring views: fixed surveillance angles, selectable via UI
//
// This store is intentionally tiny (no Zustand dependency) — mirrors
// paperclipStore/boardChannelStore pattern already used elsewhere.

import { useEffect, useReducer } from "react";

export const CameraMode = {
  THIRD_PERSON: "third",
  FIRST_PERSON: "first",
  MONITOR: "monitor",
  TPV: "tpv",
};

const initialState = {
  mode: CameraMode.THIRD_PERSON,
  monitors: [], // [{ id, name, position:[x,y,z], quaternion:[x,y,z,w], fov, near, far, source }]
  activeMonitorId: null,
  fov: 75,
};

let state = { ...initialState };
const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}
function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

export const cameraStore = {
  getState: () => ({ ...state }),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // --- Mode switching ---
  setMode(mode) {
    if (!Object.values(CameraMode).includes(mode)) return;
    setState({ mode });
  },
  setFirstPerson() {
    setState({ mode: CameraMode.FIRST_PERSON });
  },
  setThirdPerson() {
    setState({ mode: CameraMode.THIRD_PERSON });
  },
  setTPV() {
    setState({ mode: CameraMode.TPV });
  },

  // --- Monitors (from Blender) ---
  setMonitors(monitors) {
    const list = Array.isArray(monitors) ? monitors : [];
    // Preserve activeMonitorId if it still exists, otherwise pick first
    let active = state.activeMonitorId;
    if (list.length > 0 && !list.some((m) => m.id === active)) {
      active = list[0].id;
    }
    if (list.length === 0) active = null;
    setState({ monitors: list, activeMonitorId: active });
  },
  setActiveMonitor(id) {
    if (!state.monitors.some((m) => m.id === id)) return;
    setState({ mode: CameraMode.MONITOR, activeMonitorId: id });
  },
  getActiveMonitor() {
    return state.monitors.find((m) => m.id === state.activeMonitorId) ?? null;
  },

  // --- FOV (for player views, monitors use Blender FOV) ---
  setFov(v) {
    if (Number.isFinite(v)) setState({ fov: v });
  },

  reset() {
    state = { ...initialState };
    emit();
  },
};

export function useCameraStore(selector) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => cameraStore.subscribe(force), []);
  return selector(cameraStore.getState());
}

// Convenience selectors
export const selectMode = (s) => s.mode;
export const selectMonitors = (s) => s.monitors;
export const selectActiveMonitor = (s) =>
  s.monitors.find((m) => m.id === s.activeMonitorId) ?? null;
