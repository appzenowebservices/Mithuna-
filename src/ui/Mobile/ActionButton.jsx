import { setVirtualKey } from "../../input/Keyboard";

export function ActionButton({ label, className = "", virtualKey, keyLabel }) {
  const press = (pressed) => {
    setVirtualKey(keyLabel ?? label, pressed);
  };

  return (
    <button
      className={`act-btn ui-interactive ${className}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        press(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        e.preventDefault();
        press(false);
      }}
      onPointerCancel={() => press(false)}
      onPointerLeave={() => press(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
