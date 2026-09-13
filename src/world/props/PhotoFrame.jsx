// src/world/props/PhotoFrame.jsx
//
// Displays an image on the photo-frame's T_Picture mesh inside office.glb.
// Starts with /images/trade-chart.png, then can be swapped at runtime for
// LLM-generated images via window.setPhotoFrameImage(url).

import { useEffect, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { getActiveWorld } from "../registry";

let setImageFn = null;
export function setPhotoFrameImage(url) {
  if (setImageFn) setImageFn(url);
  if (typeof window !== "undefined") window.setPhotoFrameImage = setImageFn;
}

export function PhotoFrame() {
  const world = getActiveWorld();
  const { scene } = useGLTF(world.glb);
  const [url, setUrl] = useState("/images/trade-chart.png");

  useEffect(() => {
    setImageFn = setUrl;
    window.setPhotoFrameImage = setUrl;
    return () => {
      if (setImageFn === setUrl) setImageFn = null;
    };
  }, [setUrl]);

  if (world.id !== "lko_openworld") return null;

  return <PhotoFrameInner scene={scene} url={url} />;
}

function PhotoFrameInner({ scene, url }) {
  const texture = useTexture(url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    let found = 0;
    scene.traverse((o) => {
      if (o.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m.name === "T_Picture") {
            found++;
            m.map = texture;
            m.emissiveMap = texture;
            m.emissive = new THREE.Color(0xffffff);
            m.emissiveIntensity = 0.9;
            m.side = THREE.DoubleSide;
            m.needsUpdate = true;
          }
        });
      }
    });
    if (found === 0) {
      console.warn("[PhotoFrame] T_Picture not found in scene");
    } else {
      console.log(`[PhotoFrame] applied texture to ${found} T_Picture mesh(es)`);
    }
  }, [scene, texture]);

  return null;
}

useGLTF.preload("/models/worlds/office.glb");
