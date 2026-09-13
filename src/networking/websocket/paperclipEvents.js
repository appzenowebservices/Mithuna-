export class PaperclipEventSubscriber {
  constructor() {
    this.ws = null;
    this.url = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.isDisposed = false;
  }

  connect(companyId, host) {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    const resolvedHost = host ?? (typeof window !== "undefined" ? window.location.host : "localhost:3000");
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${protocol}//${resolvedHost}/api/companies/${companyId}/events/ws`;
    this.isDisposed = false;
    this.createConnection();
  }

  createConnection() {
    if (!this.url || this.isDisposed) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.dispatch(data);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (!this.isDisposed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.isDisposed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.createConnection();
    }, 3000);
  }

  dispatch(event) {
    const exact = this.listeners.get(event.type);
    if (exact) exact.forEach((cb) => cb(event));

    const wildcard = this.listeners.get("*");
    if (wildcard) wildcard.forEach((cb) => cb(event));

    const prefix = event.type.split(".").slice(0, -1).join(".");
    if (prefix) {
      const prefixListeners = this.listeners.get(`${prefix}.*`);
      if (prefixListeners) prefixListeners.forEach((cb) => cb(event));
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType).add(callback);
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  disconnect() {
    this.isDisposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
  }
}

export const paperclipEvents = new PaperclipEventSubscriber();
