// src/simulation/character/capabilities.js
//
// Probes a loaded character GLTF and reports what the model can actually do.
// Everything downstream degrades gracefully when a capability is missing
// (e.g. no idle clip, no morph targets, no facial bones) — nothing breaks.

export function inspectCharacter({ scene, animations = [] }) {
  const clips = animations.map((a) => a.name);
  const clipSet = new Set(clips);

  const morphs = new Set();
  const facialBones = new Set();

  scene?.traverse?.((obj) => {
    if (obj.isMesh && obj.morphTargetDictionary) {
      for (const name of Object.keys(obj.morphTargetDictionary)) morphs.add(name);
    }
    if (obj.isBone && /^(head|jaw|eye|brow|mouth|lips|smile|face|cheek)/i.test(obj.name)) {
      facialBones.add(obj.name);
    }
  });

  return {
    clips,
    hasClip: (name) => clipSet.has(name),
    morphs: [...morphs],
    hasMorph: (name) => morphs.has(name),
    facialBones: [...facialBones],
    hasFace: morphs.size > 0 || facialBones.size > 0,
  };
}
