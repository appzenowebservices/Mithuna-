import * as THREE from "three";

const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

// Never let collision pull the camera closer than this to the pivot
const MIN_BOOM_LENGTH = 0.9;

export function getCameraDirection(camera, playerPosition) {
  const forward = new THREE.Vector3();
  if (playerPosition) {
    forward.set(
      playerPosition.x - camera.position.x,
      0,
      playerPosition.z - camera.position.z
    );
  } else {
    camera.getWorldDirection(forward);
    forward.y = 0;
  }
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  return { forward, right };
}

export function computeCameraTransform(playerPosition, state) {
  const { yaw, pitch, distance, height } = state;

  const offset = new THREE.Vector3();

  offset.x = (Math.sin(yaw) * Math.cos(pitch) * distance);

  offset.z = Math.cos(yaw) * Math.cos(pitch) * distance;

  offset.y = Math.sin(pitch) * distance + height;

  const position = playerPosition.clone().add(offset);

  const target = playerPosition.clone();
  target.y += 1.5;

  return {
    position,
    target,
  };
}

/**
 * Shorten the camera boom if a wall/obstacle sits between the player and the
 * ideal camera position (GTA-style pull-in).
 * Returns the adjusted position, or null when no adjustment is needed.
 */
export function resolveCameraCollision(
  { world, rapier },
  playerPosition,
  idealPosition,
  state,
  excludeBody
) {
  if (!world || !rapier) return null;

  // Cast from chest height so obstacles between player and camera are caught
  _rayOrigin.set(playerPosition.x, playerPosition.y + 1.2, playerPosition.z);
  _rayDir.subVectors(idealPosition, _rayOrigin);

  const dist = _rayDir.length();
  if (dist < 0.01) return null;

  _rayDir.normalize();

  const ray = new rapier.Ray(_rayOrigin, _rayDir);
  // timeOfImpact is distance along the (normalized) dir: hit = origin + dir * toi
  const hit = world.castRay(
    ray,
    dist,
    true,
    undefined,
    undefined,
    undefined,
    excludeBody
  );

  if (!hit || hit.timeOfImpact == null) return null;

  const safeDist = Math.max(
    hit.timeOfImpact - state.collisionRadius,
    MIN_BOOM_LENGTH
  );

  if (safeDist >= dist) return null;

  return new THREE.Vector3()
    .copy(_rayOrigin)
    .addScaledVector(_rayDir, safeDist);
}

export function computeTargetCameraPosition(playerPosition, offsetHeight, followDistance) {
  return new THREE.Vector3(
    playerPosition.x,
    playerPosition.y + offsetHeight,
    playerPosition.z + followDistance
  );
}

export function computeCameraLookTarget(playerPosition, lookHeight) {
  return new THREE.Vector3(
    playerPosition.x,
    playerPosition.y + lookHeight,
    playerPosition.z
  );
}