// src/networking/api/hermesClient.js
//
// Direct Mithuna → hermes text chat (the same runtime that executes company
// work). Uses the Vite-proxied SSE endpoint POST /hermes/api/v1/chat and a
// stable per-agent session id so each character keeps its own conversation
// thread inside hermes.
//
// Wire format (see AgentSession.chat): anonymous `data:` frames carrying
//   {type:"content", content}  — reply delta
//   {type:"done", session_id}  — terminal success
//   {type:"error", content}    — terminal failure

const HERMES_API_BASE = "/hermes/api/v1";

const sessions = new Map(); // agentId -> stable session id

function sessionIdFor(agentId) {
  if (!sessions.has(agentId)) {
    const slug = String(agentId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    sessions.set(
      agentId,
      `mithuna-${slug || "agent"}-${Math.random().toString(36).slice(2, 8)}`
    );
  }
  return sessions.get(agentId);
}

export function resetHermesSession(agentId) {
  sessions.delete(agentId);
}

async function* sseFrames(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of frame.split("\n")) {
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
  }
}

/**
 * Send a chat message to an agent's hermes runtime.
 * Streams reply deltas via onDelta(text-so-far); resolves to the full reply.
 */
export async function sendHermesChat(agentId, message, { onDelta } = {}) {
  const res = await fetch(`${HERMES_API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionIdFor(agentId),
      max_turns: 20,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`hermes ${res.status}: ${res.statusText || "unreachable"}`);
  }

  let full = "";
  for await (const data of sseFrames(res.body)) {
    let evt;
    try {
      evt = JSON.parse(data);
    } catch {
      continue;
    }
    if (evt.type === "content" && evt.content) {
      full += evt.content;
      onDelta?.(full);
    } else if (evt.type === "error") {
      throw new Error(evt.content || "agent runtime error");
    } else if (evt.type === "done") {
      break;
    }
  }
  return full;
}
