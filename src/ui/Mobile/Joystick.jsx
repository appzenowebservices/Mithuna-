import { useRef } from "react";
import { setVirtualKey } from "../../input/Keyboard";

const MOVE_KEYS = ["w", "a", "s", "d"];
const DEADZONE = 12;

export function Joystick() {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const activeRef = useRef(false);

  const clearKeys = () => {
    MOVE_KEYS.forEach((k) => setVirtualKey(k, false));
  };

  const release = () => {
    activeRef.current = false;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(-50%, -50%)";
    }
    clearKeys();
  };

  const handleMove = (e) => {
    if (!activeRef.current) return;
    if (!baseRef.current || !knobRef.current) return;

    const base = baseRef.current.getBoundingClientRect();
    const cx = base.left + base.width / 2;
    const cy = base.top + base.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = base.width / 2 - 26;
    const len = Math.hypot(dx, dy);

    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }

    knobRef.current.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;

    clearKeys();
    if (len > DEADZONE) {
      const nx = dx / max;
      const ny = dy / max;
      if (ny < -0.35) setVirtualKey("w", true);
      if (ny > 0.35) setVirtualKey("s", true);
      if (nx < -0.35) setVirtualKey("a", true);
      if (nx > 0.35) setVirtualKey("d", true);
    }
  };

  return (
    <div
      ref={baseRef}
      className="joy-base ui-interactive"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        activeRef.current = true;
        handleMove(e);
      }}
      onPointerMove={handleMove}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      <div className="joy-knob" ref={knobRef} />
    </div>
  );
}
