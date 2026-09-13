// src/entities/Player/PlayerController.js

import { getMovementIntent } from "../../input/Keyboard";
import { getCameraDirection } from "../../systems/Camera/ThirdPersonCamera";

import {
  computeMovementDirection,
  applyMovementVelocity,
  applyJumpImpulse,
} from "./PlayerPhysics";

import { isGrounded } from "../../physics/GroundDetector";
import { computePlayerState } from "./PlayerAnimationState";
import { playerState } from "./playerState";
import { PLAYER_CONFIG } from "./PlayerConfig";

export function updatePlayer(body, camera, rapierWorld) {
  if (!body) return;

  // Sitting locks movement and forces sit animation
  if (playerState.isSitting) {
    playerState.moveDirection = { x: 0, z: 0 };
    applyMovementVelocity(body, { x: 0, z: 0 });
    // Damp any residual velocity
    const vel = body.linvel();
    body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    playerState.animationState = computePlayerState({
      grounded: true,
      speed: 0,
      jumping: false,
      isSitting: true,
    });
    return;
  }

  const intent = getMovementIntent();

  const position = body.translation();
  const { forward, right } = getCameraDirection(camera, position);

  const moveSpeed = intent.sprint
    ? PLAYER_CONFIG.RUN_SPEED
    : PLAYER_CONFIG.WALK_SPEED;

  const direction = computeMovementDirection(
    intent,
    forward,
    right,
    moveSpeed
  );
  playerState.moveDirection = direction;

  applyMovementVelocity(body, direction);

  const grounded = isGrounded(body, rapierWorld);

  if (intent.jump && grounded) {
    applyJumpImpulse(
      body,
      PLAYER_CONFIG.JUMP_IMPULSE
    );
  }

  const speed = Math.hypot(direction.x, direction.z);

  playerState.animationState = computePlayerState({
    grounded,
    speed,
    jumping: intent.jump && grounded,
    isSitting: false,
  });
}