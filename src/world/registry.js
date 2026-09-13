// src/world/registry.js
//
// World catalog: every playable 3D scene lives in public/models/worlds/.
// Switching the active Paperclip company resolves a stable world here, so
// each company feels like its own place.
//
// Resolution order:
//   1. explicit entry in COMPANY_WORLDS (by exact company name)
//   2. deterministic pick by hashing the company id (stable across reloads)
//   3. DEFAULT_WORLD when no company / unknown id
//
// Team rooms: worlds may declare `teamAnchors` — hand-authored X/Z seat
// coordinates inside buildings you baked into the world GLB (Blender).
// Keys are exact Paperclip team names; "zone_N" acts as a per-world fallback
// for the Nth team when no name matches. See flow.md for the authoring guide.
//
// Add a new world: drop the .glb under public/models/worlds/, add an entry to
// WORLDS below, optionally pin companies to it in COMPANY_WORLDS. Everything
// degrades gracefully — a missing GLB falls back to the default stage.

export const WORLDS = {
  lko_openworld: {
    id: "lko_openworld",
    name: "Office",
    glb: "/models/worlds/office.glb",
    spawn: [-2, 1.5, 2.7],
    theme: "neon_night",

    // Team rooms: agents sit at seats near each table.
    // Each [x, z] = where the AGENT stands/sits (behind the table in glTF coords).
    teamAnchors: {
      zone_0: {
        desks: [
          [-3.09, 3.63],   // behind table
          [-3.79, 2.83],   // left of table
          [-1.03, 2.58],   // behind table.001
          [-0.33, 1.88],   // right of table.001
        ],
        facing: 0,
      },
    },
    cameras: {
      monitors: [],
    },
    animations: {
      autoplay: true,
      loop: true,
      timeScale: 1.0,
    },
  },
  // Add future worlds here as you drop them into public/models/worlds/
  // e.g. tokyo: { id: "tokyo", glb: "/models/worlds/tokyo.glb", spawn: [...], theme: "neon_night" },
};

export const DEFAULT_WORLD_KEY = "lko_openworld";

/** Optional hand-pinned mapping (exact company names as they appear in Paperclip). */
const COMPANY_WORLDS = {
  // "AppZeno": "tokyo",
  // "Astrologics": "lucknow_imambara",
};

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const KEYS = Object.keys(WORLDS);

// ── Active world state ──────────────────────────────────
// CompanyWorld sets this when a stage mounts; layout code (poiLayout) reads
// it lazily so POI resolution always matches the scene that's on screen.
// Module-level by design (same pattern as playerState / agentRuntime) — the
// simulation has exactly one active stage.

let activeWorld = WORLDS[DEFAULT_WORLD_KEY];

export function setActiveWorld(def) {
  if (def && WORLDS[def.id]) {
    activeWorld = def;
  }
}

export function getActiveWorld() {
  return activeWorld;
}

/**
 * Resolve a team's room anchor in the active world.
 * Lookup: exact team name → "zone_N" ordinal → null.
 */
export function getTeamAnchor(zoneIndex, teamName) {
  const anchors = activeWorld?.teamAnchors;
  if (!anchors) return null;
  if (teamName && anchors[teamName]) return anchors[teamName];
  if (Number.isFinite(zoneIndex)) {
    const zoneKey = `zone_${zoneIndex}`;
    if (anchors[zoneKey]) return anchors[zoneKey];
  }
  return null;
}

/** Resolve which world a company should render. Never throws. */
export function resolveWorldForCompany(company) {
  if (!company) return WORLDS[DEFAULT_WORLD_KEY];
  const pinned = COMPANY_WORLDS[company.name];
  if (pinned && WORLDS[pinned]) return WORLDS[pinned];
  const key = KEYS[hashString(String(company.id ?? company.name)) % KEYS.length];
  return WORLDS[key] ?? WORLDS[DEFAULT_WORLD_KEY];
}

/** Atmosphere presets per theme key (used by WorldAtmosphere). */
export const THEMES = {
  sunset_bazaar: {
    background: "#3a1b2e",
    fog: ["#f6c8a4", 40, 160],
    envPreset: "sunset",
    sky: { sunPosition: [80, 12, 60], turbidity: 10, rayleigh: 3 },
    hemi: ["#ff9a5c", "#5b3a63", 1.1],
    ambient: { intensity: 0.4, color: "#b0554d" },
    sun: { intensity: 3, color: "#ffb377", position: [60, 18, 40] },
    rim: { intensity: 0.6, color: "#7a8cff", position: [-60, 10, -40] },
  },
  golden_dusk: {
    background: "#2b1d10",
    fog: ["#e8b36a", 30, 140],
    envPreset: "dawn",
    sky: { sunPosition: [60, 8, -40], turbidity: 12, rayleigh: 4 },
    hemi: ["#ffd28a", "#4a2f18", 1.15],
    ambient: { intensity: 0.42, color: "#c98a4b" },
    sun: { intensity: 3.2, color: "#ffd9a0", position: [40, 16, -50] },
    rim: { intensity: 0.55, color: "#9fb4ff", position: [-50, 12, 40] },
  },
  neon_night: {
    background: "#07080f",
    fog: ["#101528", 24, 120],
    envPreset: "night",
    sky: { sunPosition: [-40, -6, -60], turbidity: 4, rayleigh: 0.4 },
    hemi: ["#3d4bff", "#0b0d1a", 0.35],
    ambient: { intensity: 0.18, color: "#2a2d4a" },
    sun: { intensity: 0.8, color: "#8a9bff", position: [-30, 26, -20] },
    rim: { intensity: 0.6, color: "#ff4fd8", position: [45, 10, 35] },
    hdri: "/hdri/wrestling_gym_2k.hdr",
  },
};
