// src/simulation/character/AnimationDriver.js
//
// Resolves a logical state-machine animation name to an actual clip available
// on the loaded model, with a fallback chain. Missing clips degrade to the
// nearest available clip (or stop, leaving the model posed) — never breaks.

import * as THREE from "three";

import { STATE_CLIP, FALLBACK_CHAIN, isUpperClip } from "../../config/clipRegistry.js";
import { animationConfig } from "../../config/animationConfig.js";

export class AnimationDriver {
  constructor(actions = {}, mixer = null) {
    this.actions = actions;
    this.mixer = mixer;
    this.current = null; // base layer
    this.currentUpper = null; // upper-body layer ( LIFE )
    this.crossfade = animationConfig.character.crossfadeDuration ?? 0.15;
  }

  /** Return the actual clip name for a logical animation, or null. */
  resolve(logicalName) {
    const preferred = STATE_CLIP[logicalName];
    if (preferred && this.actions[preferred]) return preferred;
    const chain = FALLBACK_CHAIN[logicalName] ?? [];
    for (const alt of chain) {
      if (this.actions[alt]) return alt;
    }
    return null;
  }

  /** Play on the base (locomotion) layer. */
  play(logicalName, loop = true) {
    return this._playLayer(logicalName, loop, false);
  }

  /** Play on the upper-body layer — composes over base (type while sit_work). */
  playUpper(logicalName, loop = true) {
    return this._playLayer(logicalName, loop, true);
  }

  clearUpper() {
    if (this.currentUpper) {
      this.currentUpper.fadeOut(this.crossfade);
      this.currentUpper = null;
    }
  }

  _playLayer(logicalName, loop, isUpper) {
    const clipName = this.resolve(logicalName);
    const next = clipName ? this.actions[clipName] : null;
    const curKey = isUpper ? "currentUpper" : "current";

    if (!next) {
      if (this[curKey]) {
        this[curKey].fadeOut(this.crossfade);
        this[curKey] = null;
      }
      return null;
    }

    if (this[curKey] === next) return next;

    this[curKey]?.fadeOut(this.crossfade);
    next.reset().fadeIn(this.crossfade).play();
    // Upper layer blended slightly lower so legs still read through
    if (isUpper) next.setEffectiveWeight(0.85);

    if (this.actions[clipName]?.clip) {
      this.actions[clipName].clip.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    }

    this[curKey] = next;
    return next;
  }

  getDuration(logicalName) {
    const clipName = this.resolve(logicalName);
    const action = clipName ? this.actions[clipName] : null;
    const duration = action?.getClip?.().duration;
    return typeof duration === "number" && duration > 0 ? duration : 1.0;
  }

  update(delta) {
    this.mixer?.update(delta);
  }
}
