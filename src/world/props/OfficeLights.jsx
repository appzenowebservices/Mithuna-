// src/world/props/OfficeLights.jsx
//
// Single sun at the Blender empty "light-empty". No other lights — keeps
// the gym interior clean and avoids the blue wash / blown spot.

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Vector3 } from "three";
import { getActiveWorld } from "../registry";

const FALLBACK_POS = [10.109, 1.8, -1.86]; // above chair, center of rust office

export function OfficeLights() {
  const world = getActiveWorld();
  const { scene } = useGLTF(world.glb);
  const pos = useMemo(() => {
    const obj = scene.getObjectByName("light-empty");
    if (obj) {
      const v = new Vector3();
      obj.getWorldPosition(v);
      return [v.x, v.y, v.z];
    }
    return FALLBACK_POS;
  }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    });
  }, [scene]);

  if (world.id !== "lko_openworld") return null;

  return (
    <pointLight
      position={pos}
      intensity={900}
      color="#fff4d6"
      distance={200}
      decay={2}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.001}
    />
  );
}

useGLTF.preload("/models/worlds/office.glb");
