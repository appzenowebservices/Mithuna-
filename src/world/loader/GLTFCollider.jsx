// src/world/loader/GLTFCollider.jsx
// Fixed collider: trimesh per mesh, handles 60-mesh monolith correctly.
// Blender Z-up -> glTF Y-up already baked, so Y is up. Ground top at y=0.

import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

export function GLTFCollider({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const { scene } = useGLTF(path);

  return (
    <RigidBody
      type="fixed"
      colliders="trimesh"
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <primitive object={scene.clone()} />
    </RigidBody>
  );
}