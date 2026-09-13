const keys = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());

    if (e.key === " ") {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });
}

export function setVirtualKey(key, pressed) {
  const normalized = key.toLowerCase();
  if (pressed) keys.add(normalized);
  else keys.delete(normalized);
}

export function getMovementIntent() {
  return {
    forward: keys.has("w"),
    backward: keys.has("s"),
    left: keys.has("a"),
    right: keys.has("d"),

    jump: keys.has(" "),

    sprint:
      keys.has("shift") ||
      keys.has("shiftleft") ||
      keys.has("shiftright"),
  };
}