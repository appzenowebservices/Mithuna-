// src/services/live/liveClient.js
//
// Browser side of the hermes /api/v1/live WebSocket. THIN protocol (see
// docs/live-protocol.md): we send final user text + camera JPEG frames and a
// cancel/hang-up signal, and receive the brain's reply as streamed text deltas.
// No audio on the wire - the browser runs STT/TTS on-device.
//
// Adapted from OpenLive's LiveClient (apps/web/src/lib/live/liveClient.ts);
// the coding-agent message types (permission/elicitation/ACP) are dropped.

const TAG_FRAME_IN = 0x02;

function liveUrl() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  // Vite proxies /hermes -> hermes-agent on :8765 (see vite.config.js).
  return `${proto}://${window.location.host}/hermes/api/v1/live`;
}

export class LiveClient {
  constructor(handlers = {}) {
    this.h = handlers;
    this.ws = null;
    this.closedByUser = false;
    this.reconnectTimer = null;
    this.attempts = 0;
    this.queue = [];
  }

  connect() {
    this.closedByUser = false;
    this.open();
  }

  open() {
    const ws = new WebSocket(liveUrl());
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      this.h.onOpen?.();
      if (this.queue.length && ws.readyState === WebSocket.OPEN) {
        for (const s of this.queue.splice(0)) ws.send(s);
      }
    };
    ws.onclose = (ev) => {
      if (this.closedByUser) {
        this.h.onClose?.();
        return;
      }
      if (this.attempts < 4) {
        this.h.onReconnecting?.();
        const delay = Math.min(2000, 300 * 2 ** this.attempts);
        this.attempts += 1;
        this.reconnectTimer = setTimeout(() => this.open(), delay);
      } else {
        this.h.onError?.(ev?.reason?.trim() || "Couldn't connect to the LIVE link. Is hermes running on :8765?");
        this.h.onClose?.();
      }
    };
    ws.onerror = () => {};
    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      this.attempts = 0;
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      switch (m.t) {
        case "ready":
          return this.h.onReady?.(m);
        case "assistant_delta":
          return this.h.onDelta?.(m.delta ?? "");
        case "turn_end":
          return this.h.onTurnEnd?.();
        case "error":
          return this.h.onError?.(m.message);
        case "session_closed":
          return this.h.onSessionClosed?.();
      }
    };
    this.ws = ws;
  }

  sendJson(m) {
    if (this.ready) this.ws.send(JSON.stringify(m));
  }

  sendUserTurn(m) {
    const s = JSON.stringify(m);
    if (this.ready) {
      this.ws.send(s);
      return;
    }
    if (this.closedByUser) return;
    this.queue.push(s);
    if (this.queue.length > 8) this.queue.shift();
  }

  bind(agentId, name, role, systemPrompt) {
    this.sendUserTurn({ t: "bind", agentId, name, role, systemPrompt });
  }

  userTurn(text, frames = []) {
    this.sendUserTurn({ t: "user_turn", text, ...(frames.length ? { frames } : {}) });
  }

  control(action) {
    this.sendJson({ t: "control", action });
  }

  sendFrame(jpeg) {
    if (!this.ready) return;
    const out = new Uint8Array(jpeg.byteLength + 1);
    out[0] = TAG_FRAME_IN;
    out.set(new Uint8Array(jpeg), 1);
    this.ws.send(out.buffer);
  }

  get ready() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  close() {
    this.closedByUser = true;
    this.queue.length = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.control("end");
    try {
      this.ws?.close();
    } catch {
      // already closed
    }
    this.ws = null;
  }
}
