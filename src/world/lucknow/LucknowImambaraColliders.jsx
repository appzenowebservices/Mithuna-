// src/world/lucknow/LucknowImambaraColliders.jsx
// Physics mesh for Bara Imambara greybox. Same GLB as visual, but wrapped in Rapier trimesh.
// See src/world/loader/GLTFCollider.jsx for implementation (RigidBody type="fixed" + MeshCollider trimesh)

import { GLTFCollider } from "../loader/GLTFCollider";

export function LucknowImambaraColliders({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  return (
    <GLTFCollider
      path="/models/worlds/lucknow_imambara_grey.glb"
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
