// src/rendering/WorldAtmosphere.jsx
//
// Baking mode: keep baked baseColor visible without dynamic lights.
// A soft ambient lets the baked lightmap show; no directional/spot needed.

import { Environment } from "@react-three/drei";
import { THEMES } from "../world/registry";

export function WorldAtmosphere({ themeKey = "sunset_bazaar" }) {
  const t = THEMES[themeKey] ?? THEMES.sunset_bazaar;
  return (
    <>
      <color attach="background" args={[t.background]} />
      <Environment
        preset={false}
        files="/hdri/IndoorOffice.exr"
        background={true}
        backgroundBlurriness={0.8}
        backgroundIntensity={.80}
        environmentIntensity={2.2}
        blur={0.07}
        resolution={120}
        near={100}
        far={100}
        frames={10}
      />      <ambientLight intensity={1.1} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#444444", 0.35]} />
    </>
  );
}
