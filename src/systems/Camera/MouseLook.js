// src/systems/Camera/MouseLook.js

import { cameraState } from "./cameraState";

let initialized = false;

const LOCK_REACQUIRE_COOLDOWN_MS = 1250;

let lastLockExit = 0;

function isInteractiveTarget(target) {
  if (!target || !target.closest) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [role='button'], .ui-interactive, .live-overlay"
    )
  );
}

function acquirePointerLock() {
  if (document.pointerLockElement === document.body) return;
  if (Date.now() - lastLockExit < LOCK_REACQUIRE_COOLDOWN_MS) return;
  try {
    const p = document.body.requestPointerLock();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    // ignore — lock requests can be rejected by the browser
  }
}

export function initializeMouseLook() {
  if (initialized) return;

  initialized = true;

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== document.body) {
      lastLockExit = Date.now();
    }
  });

  window.addEventListener("click", (event) => {
    if (isInteractiveTarget(event.target)) return;

    acquirePointerLock();
  });

  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== document.body) return;

    const sens = cameraState.sensitivity;

    // GTA: direct, no heavy smoothing - Blender walk felt floaty
    cameraState.yaw -= event.movementX * sens;
    // pitch>0 = camera above looking down; mouse up must aim UP => pitch decreases
    cameraState.pitch += event.movementY * sens;

    cameraState.pitch = Math.max(
      cameraState.minPitch,
      Math.min(cameraState.maxPitch, cameraState.pitch)
    );

    cameraState.lastMouseMove = performance.now();
  });

  // GTA wheel zoom - Blender tilt used to dolly slowly, this is snapper
  window.addEventListener(
    "wheel",
    (event) => {
      // only when pointer locked or hovering canvas
      const locked = document.pointerLockElement === document.body;
      const overCanvas =
        event.target instanceof HTMLCanvasElement ||
        event.target === document.body;
      if (!locked && !overCanvas) return;
      if (isInteractiveTarget(event.target)) return;

      const delta = Math.sign(event.deltaY) * 0.5;
      cameraState.distance = Math.max(
        cameraState.minDistance,
        Math.min(cameraState.maxDistance, cameraState.distance + delta)
      );
    },
    { passive: true }
  );
}
