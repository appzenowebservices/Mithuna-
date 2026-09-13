// src/world/loader/GLTFWorldLoader.jsx

import { useGLTF } from "@react-three/drei";

export function GLTFWorldLoader({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const { scene } = useGLTF(path);

  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}