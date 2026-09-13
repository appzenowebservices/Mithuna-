// src/simulation/Engine.jsx

import { useFrame } from "@react-three/fiber";
import { simulation } from "./Simulation";
import { Renderer } from "../rendering/Renderer";

export function Engine() {
  useFrame((_, delta) => {
    simulation.update(delta);
  });

  return <Renderer />;
}