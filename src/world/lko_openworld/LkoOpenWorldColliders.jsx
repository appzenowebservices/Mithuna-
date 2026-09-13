// src/world/lko_openworld/LkoOpenWorldColliders.jsx
// Physics for LKO open world street. Same GLB as visual, trimesh collider.

import { GLTFCollider } from "../loader/GLTFCollider";

export function LkoOpenWorldColliders({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return (
    <GLTFCollider
      path="/models/worlds/lko_openworld_grey.glb"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

export function LkoOpenWorldFullColliders({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return (
    <GLTFCollider
      path="/models/worlds/lko_openworld_full_props.glb"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
