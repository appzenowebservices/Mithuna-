// src/services/live/liveStore.js
//
// Tiny external store for the LIVE call surface (same pattern as chatStore).
// One call at a time, global — the dialer overlay reads this.

import { useEffect, useReducer } from "react";

const initialState = {
  active: false,
  agentId: null,
  agentName: null,
  role: "",
  phase: "off", // connecting | ready | listening | thinking | speaking
  micOn: true,
  cameraOn: false,
  muted: false,
  userCaption: "",
  agentCaption: "",
  error: null,
  pttActive: false,
  mics: [],
  cams: [],
  micId: null,
  camId: null,
};

let state = { ...initialState };

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export const liveStore = {
  getState: () => ({ ...state }),

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  startCall(agentId, agentName, role = "") {
    state = { ...initialState, active: true, agentId, agentName, role, phase: "connecting" };
    emit();
  },

  endCall() {
    state = { ...initialState };
    emit();
  },

  set(patch) {
    state = { ...state, ...patch };
    emit();
  },

  setPhase(phase) {
    state = { ...state, phase };
    emit();
  },

  setError(message) {
    state = { ...state, error: message, phase: "ready" };
    emit();
  },

  toggleMic() {
    state = { ...state, micOn: !state.micOn };
    emit();
  },

  toggleMute() {
    state = { ...state, muted: !state.muted };
    emit();
  },

  toggleCamera() {
    state = { ...state, cameraOn: !state.cameraOn };
    emit();
  },

  setUserCaption(text) {
    if (state.userCaption === text) return;
    state = { ...state, userCaption: text };
    emit();
  },

  setAgentCaption(text) {
    if (state.agentCaption === text) return;
    state = { ...state, agentCaption: text };
    emit();
  },

  setDevices({ mics, cams }) {
    state = { ...state, mics: mics ?? state.mics, cams: cams ?? state.cams };
    emit();
  },

  setMicId(deviceId) {
    if (state.micId === deviceId) return;
    state = { ...state, micId: deviceId };
    emit();
  },

  setCamId(deviceId) {
    if (state.camId === deviceId) return;
    state = { ...state, camId: deviceId };
    emit();
  },
};

export function useLiveStore(selector) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => liveStore.subscribe(force), []);
  return selector(liveStore.getState());
}
