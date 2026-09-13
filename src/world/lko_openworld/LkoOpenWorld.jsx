// src/world/lko_openworld/LkoOpenWorld.jsx
// Greybox recreation of reference image `blender/lko-openworld.png`
// Central Husainabad Clock Tower @ (0,0,0), Rumi Gate @ (0,0,88), shop rows L/R
// Source blend: blender/lko_openworld/lko_openworld_grey.blend (88 objects, 60 main + 26 props)
// Exports: public/models/worlds/lko_openworld_grey.glb (96KB) + godot_game/assets/models/arena/lko_openworld/

import { GLTFWorldLoader } from "../loader/GLTFWorldLoader";

export function LkoOpenWorld({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return (
    <GLTFWorldLoader
      path="/models/worlds/lko_openworld_grey.glb"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

// Full variant with grey cars/barriers/humans (for scene population test)
export function LkoOpenWorldFull({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return (
    <GLTFWorldLoader
      path="/models/worlds/lko_openworld_full_props.glb"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

import { useGLTF } from "@react-three/drei";
useGLTF.preload("/models/worlds/lko_openworld_grey.glb");
useGLTF.preload("/models/worlds/lko_openworld_full_props.glb");
