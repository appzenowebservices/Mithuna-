// src/config/clipRegistry.js
//
// Single source of truth for all character animations. Blender NLA track
// name must match the `clip` field here; `layer` controls LIFE layering
// (base = legs/locomotion, upper = torso/arms) so `sit_work + type` can
// play together without combinatorial state explosion.

export const CLIP_DEFS = {
  // Locomotion / base
  idle: { clip: "idle", layer: "base" },
  walk: { clip: "walk", layer: "base" },
  run: { clip: "run", layer: "base" },
  jump: { clip: "jump", layer: "base" },
  fall: { clip: "fall", layer: "base" },
  sit_down: { clip: "sit", layer: "base" },
  sit_idle: { clip: "sit", layer: "base" },
  sit_work: { clip: "sit", layer: "base" },

  // Social / attention (base but can be upper when seated)
  talk: { clip: "talk", layer: "upper" },
  listen: { clip: "listen", layer: "upper" },
  pay_attention: { clip: "pay_attention", layer: "upper" },
  look_around: { clip: "look_around", layer: "upper" },
  happy: { clip: "happy", layer: "upper" },
  sad: { clip: "sad", layer: "upper" },
  wave: { clip: "wave", layer: "upper" },
  pick: { clip: "pick", layer: "upper" },

  // Office LIFE — all upper so they compose over sit_work/walk
  type: { clip: "type", layer: "upper" },
  carry_coffee: { clip: "carry_coffee", layer: "upper" },
  whiteboard: { clip: "whiteboard", layer: "upper" },
  phone_call: { clip: "phone_call", layer: "upper" },
  stand_up: { clip: "stand_up", layer: "base" },
};

// Logical state -> clip key (keys of CLIP_DEFS)
export const STATE_CLIP = Object.fromEntries(
  Object.keys(CLIP_DEFS).map((k) => [k, CLIP_DEFS[k].clip])
);

// Fallbacks degraded gracefully when a clip is missing (only walk exists today)
export const FALLBACK_CHAIN = {
  idle: [],
  walk: [],
  run: ["walk"],
  jump: ["walk"],
  fall: ["walk"],
  talk: ["type", "walk"],
  listen: ["idle"],
  pay_attention: ["idle", "look_around"],
  sit_down: ["idle"],
  sit_idle: ["idle"],
  sit_work: ["idle"],
  look_around: ["idle"],
  happy: ["idle"],
  sad: ["idle"],
  pick: ["idle"],
  wave: ["idle"],
  type: ["sit_work", "idle"],
  carry_coffee: ["walk"],
  whiteboard: ["talk", "idle"],
  phone_call: ["talk", "idle"],
  stand_up: ["walk", "idle"],
};

// Upper-body set for layering
export const UPPER_CLIPS = new Set(
  Object.entries(CLIP_DEFS)
    .filter(([, v]) => v.layer === "upper")
    .map(([k]) => k)
);

export function isUpperClip(logicalName) {
  return UPPER_CLIPS.has(logicalName);
}
