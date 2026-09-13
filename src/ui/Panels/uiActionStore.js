// src/ui/Panels/uiActionStore.js
//
// Tiny bridge for cross-surface UI actions inside Mithuna's console.
// The 3D world (agent tags / click menus) publishes intents like
// "assign a task to this agent"; panels subscribe and react.

import { useEffect, useReducer } from "react";

const initialState = {
  /** When set, IssuesPanel opens its new-task form pre-assigned to this agent. */
  assignToAgent: null, // {id, name}
  /** When set, the live run-transcript mini-panel shows this agent's work. */
  transcriptAgentId: null,
  transcriptAgentName: null,
};

let state = { ...initialState };
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function setState(partial) {
  state = { ...state, ...partial };
  emit();
}

export const uiActionStore = {
  getState: () => ({ ...state }),
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  requestAssignTask(agentId, agentName) {
    setState({ assignToAgent: { id: agentId, name: agentName } });
  },

  consumeAssignTask() {
    if (!state.assignToAgent) return null;
    const value = state.assignToAgent;
    setState({ assignToAgent: null });
    return value;
  },

  openTranscript(agentId, agentName) {
    setState({ transcriptAgentId: agentId, transcriptAgentName: agentName });
  },

  closeTranscript() {
    setState({ transcriptAgentId: null, transcriptAgentName: null });
  },
};

export function useUiActionStore(selector) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => uiActionStore.subscribe(force), []);
  return selector(uiActionStore.getState());
}
