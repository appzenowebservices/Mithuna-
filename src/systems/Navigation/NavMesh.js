// src/systems/Navigation/NavMesh.js
//
// Lightweight nav helper for office LIFE. If a baked nav mesh exists
// (public/models/worlds/nav.glb) it would be queried here; today we
// derive a soft office bounds from the active world's teamAnchors so
// wander never sends agents through walls or far outside the building.
// Falls back to the original ring wander when no office bounds exist.

import { getActiveWorld } from "../../world/registry";

function getOfficeBounds() {
  const world = getActiveWorld();
  const anchors = world?.teamAnchors;
  if (!anchors) return null;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let count = 0;
  for (const anchor of Object.values(anchors)) {
    for (const [x, z] of anchor.desks ?? []) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      count++;
    }
    if (anchor.idle) {
      minX = Math.min(minX, anchor.idle[0]); maxX = Math.max(maxX, anchor.idle[0]);
      minZ = Math.min(minZ, anchor.idle[1]); maxZ = Math.max(maxZ, anchor.idle[1]);
    }
    if (anchor.doorway) {
      minX = Math.min(minX, anchor.doorway[0]); maxX = Math.max(maxX, anchor.doorway[0]);
      minZ = Math.min(minZ, anchor.doorway[1]); maxZ = Math.max(maxZ, anchor.doorway[1]);
    }
  }
  if (count === 0) return null;
  // Pad 4m around desks so agents can wander inside the room
  const pad = 4;
  return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}

export function sampleOfficeWanderTarget() {
  const bounds = getOfficeBounds();
  if (!bounds) return null;
  // Rejection sampling inside office AABB
  const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
  const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
  return { x, z };
}

// Future: load nav.glb tri-mesh and use three-pathfinding
// export async function loadNavMesh(url) { ... }
