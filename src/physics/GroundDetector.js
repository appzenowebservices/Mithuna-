import { PLAYER_CONFIG } from "../entities/Player/PlayerConfig";

const GROUND_RAYCAST_DISTANCE = 0.1;
const GROUND_RAY_EXTRA_LENGTH = PLAYER_CONFIG.GROUND_TOLERANCE + 0.1;

export function isGrounded(body, rapierWorld) {
  if (!body || !rapierWorld) return false;

  const position = body.translation();
  const halfHeight = PLAYER_CONFIG.CAPSULE.COLLIDER_HALF_HEIGHT;

  const Ray = rapierWorld.rapier.Ray;
  const ray = new Ray(
    { x: position.x, y: position.y - halfHeight - GROUND_RAYCAST_DISTANCE, z: position.z },
    { x: 0, y: -1, z: 0 }
  );

  const hit = rapierWorld.world.castRay(ray, GROUND_RAY_EXTRA_LENGTH, true);

  return hit !== null;
}