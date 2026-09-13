// src/ui/Live/Orb.jsx
//
// Gemini-Live-style orb: pulses with the agent's live voice amplitude. Reads
// the level straight from the active LiveSpeech player (not the store) so it
// animates per frame without churning store state. Color follows the call
// phase (amber connecting, yellow listening, blue thinking, green speaking).

import { useEffect, useRef } from "react";
import { getLiveSession } from "../../services/live/liveSession";

const PHASE_COLOR = {
  off: "#ffe9a8",
  connecting: "#f2b05a",
  ready: "#ffe9a8",
  listening: "#facc15",
  thinking: "#60a5fa",
  speaking: "#4ade80",
};

export function Orb({ size = 200, phase = "ready", color }) {
  const ref = useRef(null);

  useEffect(() => {
    let raf;
    const loop = () => {
      const level = getLiveSession()?.speech?.level?.() ?? 0;
      if (ref.current) {
        const scale = 1 + Math.min(0.3, level * 1.1);
        ref.current.style.transform = `scale(${scale})`;
        ref.current.style.filter = `brightness(${1 + level})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const orbColor = color || PHASE_COLOR[phase] || PHASE_COLOR.ready;

  return (
    <div className="live-orb-wrap" style={{ width: size, height: size }}>
      <div
        ref={ref}
        className="live-orb"
        style={{ "--orb": orbColor, width: size, height: size }}
      />
    </div>
  );
}
