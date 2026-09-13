// src/services/live/liveAudio.js
//
// Gap-free playback of the agent's LIVE voice, with barge-in.
//
// Playback is scheduled on a running clock through a MediaStreamDestination
// into a hidden <audio> element — NOT AudioContext.destination. Chrome's echo
// canceller (AEC3) is blind to Web-Audio output, so routing through the <audio>
// element lets the agent's own voice be cancelled from the mic input, which is
// what makes barge-in work on speakers.
//
// TTS comes from the shared kokoro instance (src/services/tts/kokoro.js) — the
// same lazy-loaded model the ambient sim speech uses.
//
// Adapted from OpenLive's AudioPlayer (apps/web/src/lib/live/audioPlayback.ts).

import { getKokoroInstance } from "../tts/kokoro";

export class LiveSpeech {
  constructor() {
    this.ctx = null;
    this.sink = null;
    this.el = null;
    this.analyser = null;
    this.tap = null;
    this.nextAt = 0;
    this.minEpoch = 0;
    this.sources = new Set();
    this.timers = new Set();
    this.rms = 0;
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.sink = this.ctx.createMediaStreamDestination();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      this.tap = new Float32Array(this.analyser.fftSize);
      const el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "");
      el.srcObject = this.sink.stream;
      el.style.display = "none";
      document.body.appendChild(el);
      void el.play().catch(() => {});
      this.el = el;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  resume() {
    this.ensure();
  }

  /** Speak one sentence: synthesize with kokoro, then play on the clock. */
  async speakSentence(text) {
    const clean = String(text || "").replace(/[#*_`~]/g, "").trim();
    if (!clean) return;
    try {
      const instance = await getKokoroInstance();
      const raw = await instance.generate(clean, { voice: "af_heart", speed: 1 });
      this.play(raw.audio, raw.sample_rate || 24000);
    } catch {
      // TTS unavailable/warming — skip gracefully
    }
  }

  play(f32, sampleRate = 24000, onStart) {
    if (!f32 || f32.length === 0) return;
    if (this.minEpoch > 0) {
      // stale chunk from a pre-barge-in turn: drop it
      return;
    }
    const ctx = this.ensure();
    let sum = 0;
    for (let i = 0; i < f32.length; i += 1) {
      const v = f32[i];
      sum += v * v;
    }
    this.rms = Math.sqrt(sum / f32.length);
    const buf = ctx.createBuffer(1, f32.length, sampleRate);
    buf.getChannelData(0).set(f32);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sink);
    if (this.analyser) src.connect(this.analyser);
    const startAt = Math.max(ctx.currentTime + 0.02, this.nextAt);
    src.start(startAt);
    this.nextAt = startAt + buf.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.rms = 0;
    };
    if (onStart) {
      const t = setTimeout(() => {
        this.timers.delete(t);
        onStart();
      }, Math.max(0, (startAt - ctx.currentTime) * 1000));
      this.timers.add(t);
    }
  }

  /** Barge-in: bump the epoch, stop everything scheduled. */
  bargeIn() {
    this.minEpoch += 1;
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    this.sources.clear();
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.nextAt = 0;
    this.rms = 0;
  }

  reset() {
    this.minEpoch = 0;
    this.nextAt = 0;
    this.sources.clear();
    this.timers.clear();
    this.rms = 0;
  }

  /** Live output amplitude (0..~1) — drives the orb while the agent speaks. */
  level() {
    if (this.analyser && this.tap && this.sources.size > 0) {
      this.analyser.getFloatTimeDomainData(this.tap);
      let sum = 0;
      for (let i = 0; i < this.tap.length; i += 1) sum += this.tap[i] * this.tap[i];
      return Math.sqrt(sum / this.tap.length);
    }
    return this.sources.size > 0 ? this.rms : 0;
  }

  close() {
    this.bargeIn();
    try {
      this.el?.pause();
      this.el?.remove();
    } catch {
      // already gone
    }
    try {
      void this.ctx?.close();
    } catch {
      // already closed
    }
    this.el = null;
    this.sink = null;
    this.ctx = null;
    this.analyser = null;
    this.tap = null;
  }
}
