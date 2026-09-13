// src/entities/Player/PlayerModel.jsx

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

import { playerState } from "./playerState";
import { updatePlayerAnimations } from "./PlayerAnimations";

const MODEL_PATH = "/models/character/player.glb";

export function PlayerModel({ onRef }) {
  const group = useRef();

  const { scene, animations } = useGLTF(MODEL_PATH);

  const clonedScene = useMemo(
    () => SkeletonUtils.clone(scene),
    [scene]
  );

  const { actions, mixer } = useAnimations(
    animations,
    group
  );

  useEffect(() => {
    if (!actions || !mixer) return;

    playerState.actions = actions;
    playerState.mixer = mixer;

    console.log("Animations:", Object.keys(actions));

    if (onRef) {
      onRef(group.current);
    }
  }, [actions, mixer, onRef]);

  useFrame((_, delta) => {
    if (!actions || !mixer) return;

    updatePlayerAnimations(
      actions,
      playerState.animationState
    );

    mixer.update(delta);
  });

  return (
    <group ref={group}
      // scale={[0.5, 0.5, 0.5]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);