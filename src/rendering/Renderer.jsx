// src/rendering/Renderer.jsx

import { Scene } from "./Scene";
import { CameraSystem } from "../systems/Camera/CameraSystem";

export function Renderer() {
  return (
    <>
      {/* Controls the active Three.js camera */}
      <CameraSystem />
      {/* Everything visible in the world — atmosphere + stage come from the
          active company's world (see src/world/CompanyWorld.jsx) */}
      <Scene />
    </>
  );
}
