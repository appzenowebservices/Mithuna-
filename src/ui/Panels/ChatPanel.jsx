// src/ui/Panels/ChatPanel.jsx
//
// Right-side chat interface for a selected agent. Opens when the user clicks
// the mic option on an agent's in-world name tag. Sends text to the agent's
// hermes runtime (streamed), speaks the reply via kokoro TTS, and renders the
// exchange here.

import { useEffect, useRef, useState } from "react";
import { chatStore, useChatStore } from "./chatStore";
import { speakText } from "../../services/tts/speech";
import { useLiveStore } from "../../services/live/liveStore";
import { sendHermesChat, resetHermesSession } from "../../networking/api/hermesClient";

export function ChatPanel() {
  const { activeAgentId, activeAgentName, conversations } = useChatStore((s) => s);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const messages = activeAgentId ? (conversations[activeAgentId] ?? []) : [];
  const inLive = useLiveStore((s) => s.active && s.agentId === activeAgentId);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, activeAgentId, inLive]);

  if (!activeAgentId) return null;

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    chatStore.appendMessage("user", text);
    setDraft("");
    setSending(true);
    chatStore.streamTextStart(activeAgentId);

    try {
      const reply = await sendHermesChat(activeAgentId, text, {
        onDelta: (full) => chatStore.streamTextDelta(activeAgentId, full),
      });
      if (!reply) chatStore.streamTextDelta(activeAgentId, "(no reply)");
      speakText(activeAgentId, reply || "(no reply)", activeAgentName);
    } catch (err) {
      chatStore.streamTextDelta(
        activeAgentId,
        `⚠ link error: ${err.message}. Is hermes-agent running on :8765?`
      );
    } finally {
      chatStore.streamTextEnd(activeAgentId);
      setSending(false);
    }
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-title">
        <span>Comms // {activeAgentName}</span>
        <span className="chat-actions">
          <button
            type="button"
            className="chat-action"
            title="Reset agent session"
            onClick={() => {
              resetHermesSession(activeAgentId);
              chatStore.clearConversation(activeAgentId);
            }}
          >
            ↺
          </button>
          <button
            type="button"
            className="chat-action"
            title="Close"
            onClick={() => chatStore.closeChat()}
          >
            ▣
          </button>
        </span>
      </div>

      <div className="chat-log" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">link established with {activeAgentName}</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-line chat-${m.role} ${m.kind === "live" ? "chat-live" : ""} ${m.streaming ? "chat-streaming" : ""}`}
          >
            <span className="chat-role">
              {m.role === "user" ? "YOU" : activeAgentName}
              {m.kind === "live" && <em className="chat-live-tag">LIVE</em>}
            </span>
            <span className="chat-text">
              {m.text}
              {m.streaming && <span className="chat-caret" />}
            </span>
          </div>
        ))}
      </div>

      {inLive ? (
        <div className="chat-input chat-input-live">
          <span>● LIVE LINK — {activeAgentName} is on the line. The full-screen dialer is controlling the call.</span>
        </div>
      ) : (
        <div className="chat-input ui-interactive">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder={sending ? `${activeAgentName} is thinking…` : `msg ${activeAgentName}…`}
            disabled={sending}
          />
          <button type="button" className="chat-send" onClick={() => void send()} disabled={sending}>
            {sending ? "…" : "SEND"}
          </button>
        </div>
      )}
    </section>
  );
}
