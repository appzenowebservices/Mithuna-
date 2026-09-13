// src/systems/Camera/CameraSystem.js

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { playerState } from "../../entities/Player/playerState";

import { initializeMouseLook } from "./MouseLook";
import { cameraState } from "./cameraState";
import { cameraStore, CameraMode } from "./cameraStore";
import { computeCameraTransform, resolveCameraCollision } from "./ThirdPersonCamera";

initializeMouseLook();

const desiredPosition = new THREE.Vector3();
const smoothedPosition = new THREE.Vector3();
const playerVel = new THREE.Vector3();
const lookaheadOffset = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const _followDelta = new THREE.Vector3();

export function CameraSystem() {
  const camera = useThree((state) => state.camera);

  const prevPlayerPos = useRef(new THREE.Vector3());
  const velAccumulator = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const previousCameraMode = useRef(null);

  useEffect(() => {
    smoothedPosition.copy(camera.position);
    const body = playerState.bodyRef;
    if (body) {
      const pos = body.translation();
      smoothedPosition.set(pos.x, pos.y, pos.z);
    }
  }, []);

  // Temp vectors for monitor/first-person modes
  const monitorQuat = new THREE.Quaternion();
  const monitorForward = new THREE.Vector3();

  useFrame((_, delta) => {
    if (!camera) return;

    // --- Blender monitoring cams & TPV/first-person: bypass chase rig ---
    const camMode = cameraStore.getState().mode;
    const enteredTpv = previousCameraMode.current !== CameraMode.TPV;
    previousCameraMode.current = camMode;
    if (camMode === CameraMode.MONITOR) {
      const mon = cameraStore.getActiveMonitor();
      if (mon) {
        const targetPos = new THREE.Vector3().fromArray(mon.position);
        const targetQuat = new THREE.Quaternion().fromArray(mon.quaternion);
        // Smooth lerp position + slerp rotation
        const t = 1 - Math.pow(0.001, delta * 2.2);
        camera.position.lerp(targetPos, t);
        camera.quaternion.slerp(targetQuat, t);
        if (camera.isPerspectiveCamera && Number.isFinite(mon.fov)) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, mon.fov, t);
          camera.updateProjectionMatrix();
        }
        return;
      }
    }
    if (camMode === CameraMode.FIRST_PERSON) {
      const fpv = playerState.fpvEmpty;
      if (fpv) {
        fpv.updateMatrixWorld(true);
        const basePos = new THREE.Vector3();
        const baseQuat = new THREE.Quaternion();
        fpv.getWorldPosition(basePos);
        fpv.getWorldQuaternion(baseQuat);

        const baseEuler = new THREE.Euler().setFromQuaternion(baseQuat, "YXZ");
        const yaw = baseEuler.y + cameraState.yaw;
        const pitch = THREE.MathUtils.clamp(baseEuler.x + cameraState.pitch, cameraState.minPitch, cameraState.maxPitch);

        const lookDir = new THREE.Vector3(
          -Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          -Math.cos(yaw) * Math.cos(pitch)
        );

        const lookAt = basePos.clone().add(lookDir);
        camera.position.copy(basePos);
        camera.lookAt(lookAt);
        return;
      }

      if (!playerState.bodyRef) return;
      const body = playerState.bodyRef;
      const p = body.translation();
      const head = new THREE.Vector3(p.x, p.y + 1.65, p.z);
      const yaw = cameraState.yaw;
      const pitch = cameraState.pitch;
      monitorForward.set(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );
      const lookAt = head.clone().add(monitorForward);
      camera.position.copy(head);
      camera.lookAt(lookAt);
      return;
    }
    if (camMode === CameraMode.TPV) {
      const tpv = playerState.tpvEmpty;
      if (tpv) {
        tpv.updateMatrixWorld(true);

        const body = playerState.bodyRef;
        const basePos = new THREE.Vector3();
        const baseQuat = new THREE.Quaternion();
        tpv.getWorldPosition(basePos);
        tpv.getWorldQuaternion(baseQuat);

        const target = body
          ? new THREE.Vector3(
              body.translation().x,
              body.translation().y + 1.5,
              body.translation().z
            )
          : basePos.clone();

        const baseEuler = new THREE.Euler().setFromQuaternion(baseQuat, "YXZ");
        const yaw = baseEuler.y + cameraState.yaw;
        const pitch = THREE.MathUtils.clamp(baseEuler.x + cameraState.pitch, cameraState.minPitch, cameraState.maxPitch);
        const offset = new THREE.Vector3(
          -Math.sin(yaw) * Math.cos(pitch) * cameraState.distance,
          Math.sin(pitch) * cameraState.distance + cameraState.height,
          -Math.cos(yaw) * Math.cos(pitch) * cameraState.distance
        );

        const desired = target.clone().add(offset);
        const t = 1 - Math.pow(0.001, delta * 3.2);
        camera.position.lerp(desired, t);
        camera.lookAt(target.clone().add(new THREE.Vector3(0, 1.5, 0)));
        camera.updateMatrixWorld();
        return;
      }
    }

    if (!playerState.bodyRef) {
      camera.lookAt(0, 0, 0);
      return;
    }
    const body = playerState.bodyRef;

    const position = body.translation();
    const playerPosition = new THREE.Vector3(
      position.x,
      position.y,
      position.z
    );

    // --- Velocity-based predictive lookahead ---
    if (body.linvel) {
      const lv = body.linvel();
      playerVel.set(lv.x, lv.y, lv.z);
    } else {
      const dt = Math.max(delta, 0.001);
      playerVel.subVectors(playerPosition, prevPlayerPos.current).multiplyScalar(1 / dt);
    }
    prevPlayerPos.current.copy(playerPosition);

    // Only horizontal movement for lookahead
    playerVel.y = 0;

    // Smooth the velocity to avoid jitter from physics stepping
    velAccumulator.current.lerp(playerVel, 0.1);
    const speed = velAccumulator.current.length();

    // Apply predictive lookahead only when moving meaningfully
    lookaheadOffset.set(0, 0, 0);
    if (speed > 0.1 && speed < 12) {
      const lookDir = new THREE.Vector3().copy(velAccumulator.current).normalize();
      const lookaheadDist = Math.min(speed * cameraState.lookaheadFactor, cameraState.lookaheadMax);
      lookaheadOffset.copy(lookDir).multiplyScalar(lookaheadDist);
    }

    const playerPosWithLookahead = playerPosition.clone().add(lookaheadOffset);

    // --- Compute ideal camera position ---
    const transform = computeCameraTransform(playerPosWithLookahead, cameraState);

    desiredPosition.copy(transform.position);

    // --- Collision detection (uses physics world from playerState) ---
    const collisionAdjusted = resolveCameraCollision(
      { world: playerState.rapierWorld, rapier: playerState.rapier },
      playerPosWithLookahead,
      desiredPosition,
      cameraState,
      body
    );

    if (collisionAdjusted) {
      desiredPosition.copy(collisionAdjusted);
    }

    // Ground safety: never dip below the player's feet
    if (desiredPosition.y < playerPosition.y + cameraState.groundClearance) {
      desiredPosition.y = playerPosition.y + cameraState.groundClearance;
    }

    // First valid frame: snap instead of swooping in from the world origin
    if (!initialized.current) {
      initialized.current = true;
      smoothedPosition.copy(desiredPosition);
      lookTarget.copy(transform.target);
    }

    // --- GTA auto-center yaw behind velocity when mouse idle ---
    const timeSinceMouse = performance.now() - (cameraState.lastMouseMove || 0);
    if (timeSinceMouse > cameraState.autoCenterDelay && speed > 1.2) {
      // camera forward is (-sin(yaw), -cos(yaw)); negate so yaw trails BEHIND velocity
      const velYaw = Math.atan2(
        -velAccumulator.current.x,
        -velAccumulator.current.z
      );
      // shortest angle lerp
      let yawDiff = velYaw - cameraState.yaw;
      // normalize to -PI..PI
      yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      if (Math.abs(yawDiff) > 0.005) {
        cameraState.yaw += yawDiff * cameraState.autoCenterSpeed * delta * 60;
      }
    }

    // --- Momentum-based smoothing (GTA snappier, not Blender float) ---
    const smoothFactor = 1 - Math.pow(1 - cameraState.momentum, delta * 60);
    smoothedPosition.lerp(desiredPosition, smoothFactor);

    // Follow guarantee: never let the player leave the frame — clamp lag
    _followDelta.subVectors(smoothedPosition, desiredPosition);
    if (
      _followDelta.lengthSq() >
      cameraState.maxFollowLag * cameraState.maxFollowLag
    ) {
      smoothedPosition
        .copy(desiredPosition)
        .addScaledVector(_followDelta.normalize(), cameraState.maxFollowLag);
    }

    camera.position.copy(smoothedPosition);

    // --- Smooth look-at target (faster than position, delta-scaled) ---
    const lookFactor = 1 - Math.pow(1 - 0.22, delta * 60);
    lookTarget.lerp(transform.target, lookFactor);

    camera.lookAt(lookTarget);
  });

  return null;
}
