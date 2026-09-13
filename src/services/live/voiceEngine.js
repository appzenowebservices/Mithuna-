// src/services/live/voiceEngine.js
//
// Browser microphone -> VAD -> end-of-turn detection for the LIVE "ear". Uses
// @ricky0123/vad-web (Silero VAD) — detects when the user starts and stops
// speaking, and hands the captured 16 kHz mono audio to a callback. The
// callback transcribes it (Whisper) and sends the text to the brain.
//
// Behavior ported from OpenLive's voiceEngine (apps/web/src/lib/live/
// voiceEngine.ts), simplified to the VAD core (no Smart-Turn model).

const DEFAULT_VAD_CONFIG = {
  // v0.0.29 uses ms-based timing (older VAD.init used frame counts).
  preSpeechPadMs: 320,
  positiveSpeechThreshold: 0.6,
  redemptionMs: 256,
};

export class VoiceEngine {
  /**
   * @param {object} opts
   * @param {(audio: Float32Array) => void} [opts.onSpeechEnd]  final utterance audio
   * @param {() => void} [opts.onSpeechStart]                   user began speaking (barge-in cue)
   */
  constructor({ onSpeechEnd, onSpeechStart } = {}) {
    this.onSpeechEnd = onSpeechEnd;
    this.onSpeechStart = onSpeechStart;
    this.vad = null;
    this.started = false;
  }

  async start(config = {}) {
    const { MicVAD } = await import("@ricky0123/vad-web");
    const cfg = { ...DEFAULT_VAD_CONFIG, ...config };
    this.vad = await MicVAD.new({
      // 0.0.29's DEFAULT_MODEL is "legacy" — pin v5 (the model we vendor).
      model: "v5",
      onSpeechStart: () => this.onSpeechStart?.(),
      onSpeechEnd: (audio) => this.onSpeechEnd?.(audio),
      onVADMisfire: () => {},
      preSpeechPadMs: cfg.preSpeechPadMs,
      positiveSpeechThreshold: cfg.positiveSpeechThreshold,
      redemptionMs: cfg.redemptionMs,
      // v0.0.29 ignores a bare `stream` option — override the stream providers
      // so a chosen mic/stream is actually used (MicVAD.new calls getStream on
      // start and resumeStream on resume).
      ...(cfg.stream
        ? {
            getStream: async () => cfg.stream,
            resumeStream: async () => cfg.stream,
          }
        : {}),
      // vendored by scripts/copy-voice-assets.mjs into public/vad/ so the
      // onnx/worklet runtime loads same-origin instead of from "/" (SPA fallback).
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
    });
    this.vad.start();
    this.started = true;
    return this.vad;
  }

  /** Pause listening (mic toggled off) without tearing down the engine. */
  pause() {
    try {
      this.vad?.pause?.();
    } catch {
      // already stopped
    }
  }

  resume() {
    try {
      this.vad?.start?.();
    } catch {
      // already started
    }
  }

  async stop() {
    this.started = false;
    try {
      this.vad?.pause?.();
    } catch {
      // already stopped
    }
    try {
      this.vad?.destroy?.();
    } catch {
      // already destroyed
    }
    this.vad = null;
  }
}
