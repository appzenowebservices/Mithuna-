// src/ui/Panels/chatStore.js
//
// Tiny external store bridging the in-world agent tags and the right-side chat
// panel. Clicking the mic on an agent's name opens a conversation for it.
//
// The Comms panel is now the single transcript for BOTH text messages and LIVE
// call turns (the LIVE dialer reads/writes the same thread). Messages carry a
// `kind` ("text" | "live") and a `streaming` flag so the UI can render the
// in-flight agent reply as it types.

import { useEffect, useReducer } from "react";

const initialState = {
  activeAgentId: null,
  activeAgentName: null,
  conversations: {},
  activeTab: "chat",
};

let state = { ...initialState };

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function threadFor(agentId) {
  return state.conversations[agentId] ? [...state.conversations[agentId]] : [];
}

function withThread(agentId, thread) {
  state = { ...state, conversations: { ...state.conversations, [agentId]: thread } };
  emit();
}

export const chatStore = {
  getState: () => ({ ...state }),

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  openChat(agentId, agentName) {
    state = {
      ...state,
      activeAgentId: agentId,
      activeAgentName: agentName,
      conversations: { ...state.conversations },
    };
    emit();
  },

  closeChat() {
    state = { ...state, activeAgentId: null, activeAgentName: null };
    emit();
  },

  appendMessage(role, text) {
    const { activeAgentId } = state;
    if (!activeAgentId || !text) return;
    const thread = [...threadFor(activeAgentId), { role, text, kind: "text" }];
    withThread(activeAgentId, thread);
  },

  /** Append a final user utterance from a LIVE call turn. */
  appendLiveUser(agentId, text) {
    if (!agentId || !text) return;
    const thread = [...threadFor(agentId), { role: "user", text, kind: "live" }];
    withThread(agentId, thread);
  },

  /** Start (or reset) the streaming agent reply for a LIVE turn. */
  streamAgentStart(agentId, text) {
    if (!agentId) return;
    const thread = threadFor(agentId);
    const last = thread[thread.length - 1];
    if (last && last.role === "agent" && last.streaming) {
      thread[thread.length - 1] = { role: "agent", text, kind: "live", streaming: true };
    } else {
      thread.push({ role: "agent", text, kind: "live", streaming: true });
    }
    withThread(agentId, thread);
  },

  /** Append streamed deltas to the in-flight agent reply. */
  streamAgentDelta(agentId, delta) {
    if (!agentId || !delta) return;
    const thread = threadFor(agentId);
    const last = thread[thread.length - 1];
    if (last && last.role === "agent" && last.streaming) {
      thread[thread.length - 1] = { ...last, text: last.text + delta };
    } else {
      thread.push({ role: "agent", text: delta, kind: "live", streaming: true });
    }
    withThread(agentId, thread);
  },

  /** Finalize the streaming agent reply (turn ended / hang-up / barge-in). */
  streamAgentEnd(agentId) {
    if (!agentId) return;
    const thread = threadFor(agentId);
    const last = thread[thread.length - 1];
    if (last && last.role === "agent" && last.streaming) {
      thread[thread.length - 1] = { ...last, streaming: false };
      withThread(agentId, thread);
    }
  },

  /** Start (or reset) the streaming agent reply for a text-chat turn. */
  streamTextStart(agentId) {
    if (!agentId) return;
    const thread = threadFor(agentId);
    const last = thread[thread.length - 1];
    if (last && last.role === "agent" && last.streaming && last.kind === "text") {
      thread[thread.length - 1] = { role: "agent", text: "", kind: "text", streaming: true };
    } else {
      thread.push({ role: "agent", text: "", kind: "text", streaming: true });
    }
    withThread(agentId, thread);
  },

  /** Replace the in-flight text reply with the latest full text. */
  streamTextDelta(agentId, fullText) {
    if (!agentId) return;
    const thread = threadFor(agentId);
    const last = thread[thread.length - 1];
    if (last && last.role === "agent" && last.streaming && last.kind === "text") {
      thread[thread.length - 1] = { ...last, text: fullText };
    } else {
      thread.push({ role: "agent", text: fullText, kind: "text", streaming: true });
    }
    withThread(agentId, thread);
  },

  /** Finalize the streaming text reply. Alias of streamAgentEnd for clarity. */
  streamTextEnd(agentId) {
    if (!agentId) return;
    const thread = threadFor(agentId);
    const last = thread[thread.length - 1];
    if (last && last.role === "agent" && last.streaming) {
      thread[thread.length - 1] = { ...last, streaming: false, kind: last.kind || "text" };
      withThread(agentId, thread);
    }
  },

  clearConversation(agentId) {
    if (!agentId) return;
    const next = { ...state.conversations };
    delete next[agentId];
    state = { ...state, conversations: next };
    emit();
  },

  setTab(tab) {
    state = { ...state, activeTab: tab };
    emit();
  },
};

export function useChatStore(selector) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => chatStore.subscribe(force), []);
  return selector(chatStore.getState());
}
