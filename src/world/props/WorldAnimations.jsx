// src/world/props/WorldAnimations.jsx
//
// Plays glTF animations baked into the world GLB (Blender NLA tracks).
// Auto-discovers clips from the active world's GLB and respects
// config/animationConfig.js (autoplay/loop/timeScale). When no clips
// exist it renders nothing.

import { useEffect, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { getActiveWorld } from "../registry";
import { getWorldAnimationConfig } from "../../config/animationConfig";

export function WorldAnimations() {
  const world = getActiveWorld();
  const glb = world?.glb;
  const cfg = useMemo(() => getWorldAnimationConfig(world), [world]);

  // Keep hook order stable
  const { animations, scene } = useGLTF(glb ?? "/models/worlds/office.glb");
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    if (!cfg.autoplay || !actions) return;
    for (const clipName of Object.keys(actions)) {
      const action = actions[clipName];
      if (!action) continue;
      action.reset();
      action.timeScale = cfg.timeScale;
      action.setLoop(cfg.loop ? 2201 : 2200, Infinity); // LoopRepeat : Once
      action.clampWhenFinished = !cfg.loop;
      action.play();
    }
    return () => {
      for (const a of Object.values(actions ?? {})) a?.stop();
    };
  }, [actions, cfg.autoplay, cfg.loop, cfg.timeScale]);

  return null;
}
