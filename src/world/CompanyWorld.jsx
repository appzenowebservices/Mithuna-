// src/world/CompanyWorld.jsx
//
// Renders the world scene for the active Paperclip company. Every company
// resolves (stably) to a scene from public/models/worlds/ via
// src/world/registry.js — switching companies swaps the whole stage:
// atmosphere + GLB + physics colliders, and respawns the player at that
// world's spawn point.

import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { usePaperclipStore } from "../networking/sync/paperclipStore";
import { GLTFWorldLoader } from "./loader/GLTFWorldLoader";
import { GLTFCollider } from "./loader/GLTFCollider";
import { WorldErrorBoundary } from "./loader/WorldErrorBoundary";
import { resolveWorldForCompany, setActiveWorld, WORLDS, DEFAULT_WORLD_KEY } from "./registry";
import { WorldAtmosphere } from "../rendering/WorldAtmosphere";
import { TeamDesks } from "./props/TeamDesks";
import { OfficeLights } from "./props/OfficeLights";
import { BlenderCameras } from "./props/BlenderCameras";
import { WorldAnimations } from "./props/WorldAnimations";
import { PhotoFrame } from "./props/PhotoFrame";
import { Player } from "../entities/Player/Player";
import { Agents } from "../entities/NPC/Agents";

useGLTF.preload(WORLDS[DEFAULT_WORLD_KEY].glb);

function WorldStage({ def }) {
  return (
    <>
      <GLTFWorldLoader path={def.glb} />
      <GLTFCollider path={def.glb} />
    </>
  );
}

export function CompanyWorld() {
  const company = usePaperclipStore((s) => s.company);
  const def = resolveWorldForCompany(company);
  setActiveWorld(def);

  return (
    <group key={def.id}>
      <WorldAtmosphere themeKey={def.theme} />

      <WorldErrorBoundary
        worldPath={def.glb}
        fallback={
          <Suspense fallback={null}>
            <WorldStage def={resolveWorldForCompany(null)} />
          </Suspense>
        }
      >
        <Suspense fallback={null}>
          <WorldStage def={def} />
        </Suspense>
      </WorldErrorBoundary>

      <Suspense fallback={null}>
        <TeamDesks />
      </Suspense>

      <Suspense fallback={null}>
        <BlenderCameras />
        <WorldAnimations />
      </Suspense>

      <Suspense fallback={null}>
        <OfficeLights />
      </Suspense>

      <Suspense fallback={null}>
        <PhotoFrame />
      </Suspense>

      <Player spawn={def.spawn} />
      <Agents />
    </group>
  );
}
