// src/config/animationConfig.js
//
// Animation configuration for the full Blender workflow. Keeps model,
// world, and camera animation settings in one place so you can tune
// without touching system code.
//
// - character : player + NPC agents (from player.glb / mixers)
// - world     : glTF animations baked into the world GLB (e.g. fans, doors)
// - camera    : optional camera path / monitor transitions

export const animationConfig = {
  character: {
    // Fallback when a clip is missing (see PlayerAnimations.js)
    fallback: "idle",
    crossfadeDuration: 0.22,
  },
  world: {
    // Auto-play all glTF clips found in the world GLB
    autoplay: true,
    loop: true,
    timeScale: 1.0,
  },
  camera: {
    // How fast the view lerps when switching monitors / first/third
    transitionDuration: 0.9,
    ease: "easeInOutCubic",
  },
};

// Per-world overrides can be added in registry.js WORLDS[].animations
// and merged here if needed.
export function getWorldAnimationConfig(worldDef) {
  return {
    ...animationConfig.world,
    ...(worldDef?.animations ?? {}),
  };
}
