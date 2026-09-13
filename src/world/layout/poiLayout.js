// src/world/layout/poiLayout.js
//
// Default office floor layout for the active world. Coordinates are world
// space for the current Ground plane; revisit when a full office world is
// swapped in.
//
// Team zones: companies read as companies — each Paperclip team gets its own
// desk cluster arranged in a ring around the spawn plaza. The boardroom stays
// shared; spawn keeps its radial ring.
//
// Team rooms: when the active world declares `teamAnchors` (buildings baked
// into its GLB, seats measured in Blender), anchor coordinates win over the
// procedural grid. Everything falls back gracefully — worlds without anchors
// behave exactly as before.

import { getTeamAnchor } from "../registry";

const LAYOUT = {
  spawnCenter: { x: 0, z: 0 },
  boardroom: { x: 0, z: -26 },
  deskCols: 4,
  deskSpacing: 4.5,
  deskOrigin: { x: -7, z: 6 },
  teamZones: {
    radius: 32,
    maxZones: 8,
    cols: 3,
    spacing: 4.2,
  },
};

export function getSpawnPosition(index) {
  const angle = index * 2.399963229728653;
  const radius = 8 + (index % 5) * 5;
  return {
    x: LAYOUT.spawnCenter.x + Math.cos(angle) * radius,
    z: LAYOUT.spawnCenter.z + Math.sin(angle) * radius,
  };
}

export function getDeskPosition(index) {
  const col = index % LAYOUT.deskCols;
  const row = Math.floor(index / LAYOUT.deskCols);
  return {
    x: LAYOUT.deskOrigin.x + col * LAYOUT.deskSpacing,
    z: LAYOUT.deskOrigin.z + row * LAYOUT.deskSpacing,
  };
}

export function getBoardroomPosition() {
  return { ...LAYOUT.boardroom };
}

/** Center of team zone N (zones ring the spawn plaza clockwise from north). */
export function getTeamZoneCenter(zoneIndex) {
  const count = LAYOUT.teamZones.maxZones;
  const angle = (zoneIndex % count) * ((Math.PI * 2) / count) - Math.PI / 2;
  return {
    x: Math.cos(angle) * LAYOUT.teamZones.radius,
    z: Math.sin(angle) * LAYOUT.teamZones.radius,
  };
}

/**
 * Desk slot for a team member. Anchor rooms win when present: seat N cycles
 * through the authored desk list so overflow agents share seats rather than
 * spill outside the room.
 */
export function getTeamDeskPosition(zoneIndex, deskIndex, teamName = null) {
  const anchor = getTeamAnchor(zoneIndex, teamName);
  if (anchor && Array.isArray(anchor.desks) && anchor.desks.length > 0) {
    const [x, z] = anchor.desks[deskIndex % anchor.desks.length];
    return { x, z };
  }
  // No anchor and no zone identity → legacy flat desk grid.
  if (!Number.isFinite(zoneIndex)) return getDeskPosition(deskIndex);
  const center = getTeamZoneCenter(zoneIndex);
  const { cols, spacing } = LAYOUT.teamZones;
  const col = deskIndex % cols;
  const row = Math.floor(deskIndex / cols);
  // Face the cluster inward-ish: offset the grid so it straddles the center.
  return {
    x: center.x + (col - (cols - 1) / 2) * spacing,
    z: center.z + row * spacing - spacing,
  };
}

/** Entry waypoint of a team's room, or null when unauthored/procedural. */
export function getTeamDoorway(zoneIndex, teamName = null) {
  const anchor = getTeamAnchor(zoneIndex, teamName);
  if (!anchor || !Array.isArray(anchor.doorway)) return null;
  const [x, z] = anchor.doorway;
  return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null;
}

/**
 * Where a team idles / initially spawns: their room's idle spot, else their
 * first desk, else null (caller falls back to the procedural ring).
 */
export function getTeamIdleSpot(zoneIndex, teamName = null) {
  const anchor = getTeamAnchor(zoneIndex, teamName);
  if (!anchor) return null;
  if (Array.isArray(anchor.idle) && Number.isFinite(anchor.idle[0])) {
    return { x: anchor.idle[0], z: anchor.idle[1] };
  }
  if (Array.isArray(anchor.desks) && anchor.desks.length > 0) {
    const [x, z] = anchor.desks[0];
    return { x, z };
  }
  return null;
}

/**
 * Y-rotation (radians) an agent should face while seated at this team's
 * desks — matches the auto desk props' orientation. Null when unauthored.
 */
export function getTeamDeskFacing(zoneIndex, teamName = null) {
  const anchor = getTeamAnchor(zoneIndex, teamName);
  if (!anchor || typeof anchor.facing !== "number") return null;
  return anchor.facing;
}
