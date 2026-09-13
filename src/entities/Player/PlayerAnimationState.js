// src/entities/Player/PlayerAnimationState.js

import { PlayerStates } from "./PlayerStates";

const MOVEMENT_THRESHOLD = 0.2;
const RUN_THRESHOLD = 1.5;

export function computePlayerState({
  grounded,
  speed,
  jumping,
  isSitting,
}) {
  if (isSitting) {
    return PlayerStates.SIT;
  }

  if (jumping) {
    return PlayerStates.JUMP;
  }

  if (!grounded) {
    return PlayerStates.FALL;
  }

  if (speed < MOVEMENT_THRESHOLD) {
    return PlayerStates.IDLE;
  }

  if (speed < RUN_THRESHOLD) {
    return PlayerStates.WALK;
  }

  return PlayerStates.RUN;
}