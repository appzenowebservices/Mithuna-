// src/entities/Player/PlayerPhysics.js

export function computeMovementDirection(
  intent,
  cameraForward,
  cameraRight,
  moveSpeed
) {
  let x = 0;
  let z = 0;

  if (intent.forward) {
    x += cameraForward.x;
    z += cameraForward.z;
  }

  if (intent.backward) {
    x -= cameraForward.x;
    z -= cameraForward.z;
  }

  if (intent.left) {
    x -= cameraRight.x;
    z -= cameraRight.z;
  }

  if (intent.right) {
    x += cameraRight.x;
    z += cameraRight.z;
  }

  const length = Math.hypot(x, z);

  if (length > 0.0001) {
    x = (x / length) * moveSpeed;
    z = (z / length) * moveSpeed;
  } else {
    x = 0;
    z = 0;
  }

  return { x, z };
}

export function applyMovementVelocity(body, direction) {
  const velocity = body.linvel();

  body.setLinvel(
    {
      x: direction.x,
      y: velocity.y,
      z: direction.z,
    },
    true
  );
}

export function applyJumpImpulse(body, impulse) {
  body.applyImpulse(
    {
      x: 0,
      y: impulse,
      z: 0,
    },
    true
  );
}