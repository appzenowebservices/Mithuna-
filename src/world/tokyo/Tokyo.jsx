// src/world/tokyo/Tokyo.jsx

import { GLTFWorldLoader } from "../loader/GLTFWorldLoader";
import { TokyoColliders } from "./TokyoColliders";

export function Tokyo() {
  return (
    <>
      <GLTFWorldLoader
        path="/models/worlds/tokyo/city_scene_tokyo.glb"
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={1}
      />

      <TokyoColliders />
    </>
  );
}