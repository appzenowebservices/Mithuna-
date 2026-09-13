// src/rendering/Scene.jsx

import { PhysicsWorld } from "../physics/PhysicsWorld";
import { CompanyWorld } from "../world/CompanyWorld";

export function Scene() {
  return (
    <PhysicsWorld>
      {/* Active world resolved from the selected Paperclip company
          (public/models/worlds/ via src/world/registry.js) */}
      <CompanyWorld />
    </PhysicsWorld>
  );
}
