// src/systems/Camera/cameraState.js

export const cameraState = {
  // GTA: chase behind, higher than Blender orbit
  yaw: 0,
  // pitch>0 = camera above player looking down (mouse up aims up)
  pitch: 0.22,

  sensitivity: 0.0026,

  // GTA chase: tight over-the-shoulder (wheel still zooms 2.2 - 11.0)
  distance: 3.6,
  height: 1.55,
  minDistance: 2.2,
  maxDistance: 11.0,

  // -0.5 keeps the low-angle camera just above ground, 1.15 is near bird's-eye
  minPitch: -0.5,
  maxPitch: 1.15,

  // GTA feels snappier than Blender; higher momentum = less lag
  momentum: 0.16,
  collisionRadius: 0.45,
  collisionSmoothTime: 0.06,

  // camera never dips below this above the player's feet (ground safety)
  groundClearance: 0.35,

  // follow guarantee: camera is never allowed to lag further than this
  maxFollowLag: 3.0,

  // less predictive slide than before
  lookaheadFactor: 0.55,
  lookaheadMax: 1.6,
  lookaheadSmoothing: 0.15,

  mouseSmoothing: 0.12,

  // GTA auto-center behind velocity
  autoCenterDelay: 1100, // ms after mouse stops
  autoCenterSpeed: 0.025, // lerp per frame @60fps
  lastMouseMove: 0,
};
