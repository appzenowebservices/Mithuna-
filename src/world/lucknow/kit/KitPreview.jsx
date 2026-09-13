// src/world/lucknow/kit/KitPreview.jsx
// Modular kit pieces exported from Blender for granular detail workflow
// Source: blender/lucknow_imambara/exports/kit/*.glb (10 archetypes, ~2KB each)
// Public: public/models/kit/*.glb
// Godot: godot_game/assets/models/arena/lucknow/kit/

import { GLTFWorldLoader } from "../../loader/GLTFWorldLoader";

// Kit registry - matches blender exports
export const KIT = {
  wallOuter: "/models/kit/wall_outer_3x6x44.glb",
  wallInner: "/models/kit/wall_inner_3x6x30.glb",
  wallCross: "/models/kit/wall_cross_20x6x3.glb",
  wallStubA: "/models/kit/wall_stub_14x6x3.glb",
  wallStubB: "/models/kit/wall_stub_3x6x16.glb",
  wallNiche: "/models/kit/wall_niche_10x6x3.glb",
  perimeter: "/models/kit/perimeter_wall.glb",
  gatewayPillar: "/models/kit/gateway_pillar_4x8x4.glb",
  gatewayLintel: "/models/kit/gateway_lintel_16x1.2x4.glb",
  pavilionPillar: "/models/kit/pavilion_pillar_1.6x6x1.6.glb",
};

// Example: render a single kit piece at given transform
export function KitPiece({ kit = KIT.wallOuter, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return <GLTFWorldLoader path={kit} position={position} rotation={rotation} scale={scale} />;
}

// Example: kit-assembled courtyard fragment (for testing scale/orientation before full replacement)
export function KitCourtyardFragment() {
  return (
    <>
      <KitPiece kit={KIT.pavilionPillar} position={[-6, 0, -6]} />
      <KitPiece kit={KIT.pavilionPillar} position={[6, 0, -6]} />
      <KitPiece kit={KIT.pavilionPillar} position={[-6, 0, 6]} />
      <KitPiece kit={KIT.pavilionPillar} position={[6, 0, 6]} />
      <KitPiece kit={KIT.gatewayPillar} position={[0, 0, -18]} />
    </>
  );
}
