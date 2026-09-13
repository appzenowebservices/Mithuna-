// src/ui/NoWebGL.jsx
//
// Graceful degradation for environments where WebGL is unavailable (GPU
// disabled, hardware acceleration off, GPU process crashed and blocked).
// Renders a themed 2D placeholder so the app and the LIVE voice call keep
// working even though the 3D simulation can't start.

import { useState } from "react";

const shell = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  background:
    "radial-gradient(1200px 600px at 50% 30%, rgba(42, 65, 112, 0.35), var(--background) 70%)",
  color: "var(--hud-text)",
  textAlign: "center",
  padding: 24,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const title = {
  fontSize: 18,
  letterSpacing: "0.28em",
  color: "var(--primary)",
};

const sub = {
  fontSize: 11,
  letterSpacing: "0.18em",
  opacity: 0.6,
  maxWidth: 420,
  lineHeight: 1.7,
};

const btn = {
  marginTop: 8,
  padding: "10px 22px",
  border: "1px solid var(--border)",
  background: "rgba(255, 233, 168, 0.08)",
  color: "var(--primary)",
  cursor: "pointer",
  fontSize: 12,
  letterSpacing: "0.22em",
  borderRadius: 4,
};

const hint = {
  fontSize: 11,
  opacity: 0.75,
  maxWidth: 420,
  lineHeight: 1.7,
  marginTop: 8,
};

export function NoWebGL({ onRetry }) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div style={shell}>
      <div style={title}>3D VIEW UNAVAILABLE</div>
      <div style={sub}>WEBGL COULD NOT BE INITIALIZED</div>
      <button
        type="button"
        className="ui-interactive"
        style={btn}
        onClick={onRetry}
      >
        RETRY 3D
      </button>
      <button
        type="button"
        className="ui-interactive"
        style={{ ...btn, marginTop: 0, background: "transparent", opacity: 0.7 }}
        onClick={() => setShowHint((v) => !v)}
      >
        {showHint ? "HIDE TROUBLESHOOTING" : "TROUBLESHOOTING"}
      </button>
      {showHint && (
        <p style={hint}>
          The simulation needs a WebGL-capable GPU. Enable "Use graphics
          acceleration when available" in your browser's system settings (or
          restart the browser after a GPU crash), then press RETRY 3D. Voice
          calls, chat, and panels keep working in the meantime.
        </p>
      )}
    </div>
  );
}
