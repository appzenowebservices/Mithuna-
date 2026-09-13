export const playerState = {
  bodyRef: null,
  actions: null,
  mixer: null,

  animationState: "idle",

  moveDirection: {
    x: 0,
    z: 0,
  },

  // Sitting test (Quick Actions SIT)
  isSitting: false,

  // Camera empties from player.glb authored in Blender
  tpvEmpty: null,
  fpvEmpty: null,

  // Physics context for camera collision
  rapierWorld: null,
  rapier: null,
};