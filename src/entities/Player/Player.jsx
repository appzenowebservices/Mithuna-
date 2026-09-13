// src/entities/Player/Player.jsx

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import * as THREE from "three";

import { updatePlayer } from "./PlayerController";
import { playerState } from "./playerState";
import { PLAYER_CONFIG } from "./PlayerConfig";
import { PlayerModel } from "./PlayerModel";

const FORWARD_OFFSET = 0;
const DEFAULT_SPAWN = [0, 3, 2];

export function Player({ spawn = DEFAULT_SPAWN }) {
  const bodyRef = useRef();
  const modelRef = useRef();
  const rapierWorld = useRapier();

  const camera = useThree((state) => state.camera);

  useEffect(() => {
    playerState.bodyRef = bodyRef.current;
    playerState.rapierWorld = rapierWorld.world;
    playerState.rapier = rapierWorld.rapier;
  }, []);

  // TPV-empty is captured in PlayerModel onRef below

  useFrame((_, delta) => {
    if (!bodyRef.current || !modelRef.current) return;

    updatePlayer(bodyRef.current, camera, rapierWorld);

    // Sitting lowers hips via bones, so use smaller offset to keep feet on chair seat
    const offset = playerState.isSitting ? 1.15 : PLAYER_CONFIG.CAPSULE.MODEL_OFFSET_Y;
    modelRef.current.position.set(
      0,
      -offset,
      0
    );
    // Ensure model never culled when sitting
    modelRef.current.visible = true;
    modelRef.current.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });

    const direction = playerState.moveDirection;

    const speed = Math.hypot(direction.x, direction.z);

    if (speed > 0.01) {
      const targetRotation =
        Math.atan2(direction.x, direction.z) + FORWARD_OFFSET;

      modelRef.current.rotation.y = THREE.MathUtils.lerp(
        modelRef.current.rotation.y,
        targetRotation,
        delta * 12
      );
    }

    modelRef.current.rotation.x = 0;
    modelRef.current.rotation.z = 0;
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={spawn}
      mass={PLAYER_CONFIG.MASS}
      lockRotations
      colliders={false}
      canSleep={false}
      linearDamping={6}
      angularDamping={10}
    >
      <CapsuleCollider
        args={[
          PLAYER_CONFIG.CAPSULE.COLLIDER_HALF_HEIGHT,
          PLAYER_CONFIG.CAPSULE.COLLIDER_RADIUS,
        ]}
      />

      <PlayerModel
        onRef={(group) => {
          modelRef.current = group;
          if (group) {
            const tpv = group.getObjectByName("TPV-empty");
            const fpv = group.getObjectByName("FPV-empty");
            if (tpv) playerState.tpvEmpty = tpv;
            if (fpv) playerState.fpvEmpty = fpv;
          }
        }}
      />
    </RigidBody>
  );
}