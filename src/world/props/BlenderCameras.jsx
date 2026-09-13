// src/world/props/BlenderCameras.jsx
//
// Discovers monitoring cameras placed in Blender and registers them into
// cameraStore. Supports two Blender workflows:
//
// 1) Real Camera objects (Add > Camera) named CAM_*, e.g. CAM_Monitor_01
//    -> exported as glTF cameras (KHR), appear as THREE.PerspectiveCamera
// 2) Empties named CAM_* / monitor_* whose transform encodes the view
//
// Both are auto-found by traversing the world GLB scene graph. No manual
// registry editing required — just place, name, export.
//
// Usage: mount once inside CompanyWorld (Suspense friendly). It preloads
// nothing extra; it reuses the same GLB already loaded for the world stage.

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getActiveWorld } from "../registry";
import { cameraStore } from "../../systems/Camera/cameraStore";

const CAM_NAME_RE = /^(CAM_|monitor_)/i;

function isMonitorCandidate(obj) {
  if (!obj || !obj.name) return false;
  if (obj.isCamera) return true;
  return CAM_NAME_RE.test(obj.name);
}

function extractMonitor(entry) {
  const { object } = entry;
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  object.matrixWorld.decompose(pos, quat, scale);

  const isPersp = object.isPerspectiveCamera;
  return {
    id: object.name || `monitor_${object.uuid.slice(0, 6)}`,
    name: (object.name || "Monitor").replace(/^CAM_/i, "").replace(/_/g, " "),
    position: [pos.x, pos.y, pos.z],
    quaternion: [quat.x, quat.y, quat.z, quat.w],
    fov: isPersp ? object.fov : 50,
    near: isPersp ? object.near : 0.1,
    far: isPersp ? object.far : 100,
    source: isPersp ? "blender-camera" : "empty-anchor",
  };
}

export function BlenderCameras() {
  const world = getActiveWorld();
  const glb = world?.glb;
  // Hooks must be unconditional; use a sentinel path when no world yet
  const { scene } = useGLTF(glb ?? "/models/worlds/office.glb");

  useEffect(() => {
    if (!scene || !glb) return;

    // Ensure world matrices are up to date before reading
    scene.updateMatrixWorld(true);

    const found = [];
    scene.traverse((obj) => {
      if (isMonitorCandidate(obj)) {
        found.push({ object: obj });
      }
    });

    const monitors = found.map(extractMonitor);

    // Deduplicate by id (Blender duplication can create .001 suffixes)
    const seen = new Set();
    const deduped = monitors.filter((m) => {
      const base = m.id.replace(/\.\d+$/, "");
      if (seen.has(base)) return false;
      seen.add(base);
      m.id = base;
      return true;
    });

    cameraStore.setMonitors(deduped);

    // Cleanup when world swaps
    return () => {
      // Only clear if we're still on the same world that registered these
      const cur = getActiveWorld();
      if (cur?.glb === glb) {
        // Don't wipe on fast world switches — next mount will overwrite
      }
    };
  }, [scene, glb]);

  return null;
}
