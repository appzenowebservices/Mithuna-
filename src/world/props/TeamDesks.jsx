// src/world/props/TeamDesks.jsx
//
// Team sit-targets for anchored rooms. Visual chairs are now hard-placed
// in Blender (office.glb), so no chair.glb is loaded. This just keeps the
// invisible sit anchors for agents (desks[] from registry) so they know
// where to walk/sit. Clicking is handled via the baked chair meshes
// themselves (no auto chairs needed).

import { useMemo } from "react";
import { getActiveWorld } from "../registry";
import { getAgentRuntime, setAgentTarget } from "../../entities/NPC/AgentController";
import { paperclipStore } from "../../networking/sync/paperclipStore";

function handleChairClick(x, z, facing) {
  const agents = paperclipStore.getState().agents ?? [];
  if (agents.length === 0) return;
  let bestId = agents[0].id;
  for (const a of agents) {
    const rt = getAgentRuntime(a.id);
    const fsmState = rt.fsm?.getState?.();
    if (fsmState === "idle" || fsmState === "walk") {
      bestId = a.id;
      break;
    }
  }
  const rt = getAgentRuntime(bestId);
  rt.deskFacing = facing;
  rt.autoWander = false;
  rt.viaPoint = null;
  setAgentTarget(rt, x, z, "sit_idle");
}

export function TeamDesks() {
  const world = getActiveWorld();
  const desks = useMemo(() => {
    const anchors = world?.teamAnchors;
    if (!anchors) return [];
    const out = [];
    for (const [key, anchor] of Object.entries(anchors)) {
      if (!anchor || anchor.desksVisible === false) continue;
      (anchor.desks ?? []).forEach(([x, z], i) => {
        if (!Number.isFinite(x) || !Number.isFinite(z)) return;
        out.push({ key: `${key}:${i}`, x, z, facing: anchor.facing ?? 0 });
      });
    }
    return out;
  }, [world]);

  if (desks.length === 0) return null;

  // Invisible sit anchors only — visual chairs are baked in office.glb
  return (
    <group>
      {desks.map((d) => (
        <group
          key={d.key}
          position={[d.x, 0, d.z]}
          onClick={(e) => {
            e.stopPropagation();
            handleChairClick(d.x, d.z, d.facing);
          }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = ""; }}
        >
          {/* invisible hitbox for click-to-sit */}
          <mesh visible={false}>
            <boxGeometry args={[0.8, 0.6, 0.8]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
