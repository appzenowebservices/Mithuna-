// src/entities/Player/PlayerConfig.js

export const PLAYER_CONFIG = {
  WALK_SPEED: 1,
  RUN_SPEED: 2,

  JUMP_IMPULSE: 0.14,

  GROUND_TOLERANCE: .8,

  MASS: 80,

  CAPSULE: {
    // Visual size
    HEIGHT: 1.8,
    RADIUS: 0.35,

    // Rapier capsule collider
    COLLIDER_HALF_HEIGHT: 0.55,
    COLLIDER_RADIUS: 0.35,

    // Model pivot offset
    MODEL_OFFSET_Y: 1.8 / 2,
  },
};