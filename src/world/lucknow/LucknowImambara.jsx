// src/world/lucknow/LucknowImambara.jsx
// Greybox monolith built in Blender 5.2 -> exported as GLB for dual use (THREE + Godot)
// Source: blender/lucknow_imambara/lucknow_grey.blend
// Exports: public/models/worlds/lucknow_imambara_grey.glb (69KB) + godot_game/assets/models/arena/lucknow/
// Collections: Ground, Perimeter, Courtyard, Labyrinth, Gateways (48 meshes total)
// Markers_Spawns_Pickups excluded from export (Blender helper only)

import { GLTFWorldLoader } from "../loader/GLTFWorldLoader";

export function LucknowImambara({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return (
    <GLTFWorldLoader
      path="/models/worlds/lucknow_imambara_grey.glb"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

// Preload for faster first paint (drei useGLTF cache)
import { useGLTF } from "@react-three/drei";
useGLTF.preload("/models/worlds/lucknow_imambara_grey.glb");
