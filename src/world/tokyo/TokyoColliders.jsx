// src/world/tokyo/TokyoColliders.jsx

import { GLTFCollider } from "../loader/GLTFCollider";

export function TokyoColliders() {
  return (
    <GLTFCollider
      path="/models/worlds/tokyo/city_scene_tokyo.glb"
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={1}
    />
  );
}