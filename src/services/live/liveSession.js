// src/services/live/liveSession.js
//
// Orchestrates one LIVE call: VAD -> Whisper STT -> hermes /live WS -> kokoro
// sentence TTS, with camera frames on the side. Owns the singletons (client,
// camera, voice engine, speech player) for the single active call.
//
// Wire contract: docs/live-protocol.md (mirrors OpenLive's /live protocol).

import { liveStore } from "./liveStore";
import { LiveClient } from "./liveClient";
import { CameraCapture } from "./cameraCapture";
import { VoiceEngine } from "./voiceEngine";
import { LiveSpeech } from "./liveAudio";
import { stt, ensureStt } from "./models";
import { warmupAudio } from "../tts/kokoro";
import { chatStore } from "../../ui/Panels/chatStore";

let session = null;
let frameTimer = null;

export function getLiveSession() {
  return session;
}

export function isInLiveCall(agentId) {
  const s = liveStore.getState();
  return s.active && s.agentId === agentId;
}

class LiveSession {
  constructor(agentId, agentName, role) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.role = role;
    this.client = null;
    this.camera = null;
    this.voice = null;
    this.speech = new LiveSpeech();
    this.agentBuffer = "";
    this.turnQueued = false;
    this.userSpeaking = false;
    this.sentFirstFrame = false;
  }

  async start() {
    // Create the AudioContext inside the user gesture (autoplay policy).
    warmupAudio();
    this.speech.resume();

    // Release any pointer lock so the dialer's cursor is usable during the call.
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // ignore — nothing to exit
      }
    }

    this.client = new LiveClient({
      onOpen: () => this.client.bind(this.agentId, this.agentName, this.role, ""),
      onReady: () => liveStore.setPhase("ready"),
      onReconnecting: () => liveStore.setPhase("connecting"),
      onDelta: (delta) => this.onDelta(delta),
      onTurnEnd: () => this.onTurnEnd(),
      onError: (message) => this.fail(message),
      onSessionClosed: () => void stopLiveCall(),
      onClose: () => {},
    });
    this.client.connect();

    this.camera = new CameraCapture();

    this.voice = new VoiceEngine({
      onSpeechStart: () => this.onUserSpeechStart(),
      onSpeechEnd: (audio) => void this.onUserSpeechEnd(audio),
    });
    try {
      await this.voice.start();
      liveStore.set({ micOn: true });
    } catch (err) {
      // The ear failed (VAD assets, mic permission, …). Keep the call up so it
      // doesn't flash-and-die — the user can retry via PTT / mic toggle.
      console.error("voice engine failed to start:", err);
      liveStore.set({ micOn: false });
      liveStore.setError("Mic unavailable — LIVE is up but not listening.");
    }
    // Warm the on-device Whisper model in the background so the first utterance
    // doesn't cold-start (multi-MB download + compile) mid-call.
    void ensureStt().catch((err) => console.error("[live:stt] warmup failed:", err));
    void this.refreshDevices();
  }

  // ------------------------------------------------------------- user speech

  onUserSpeechStart() {
    this.userSpeaking = true;
    // Stop the agent's voice immediately (barge-in).
    this.speech.bargeIn();
    // Barge-in interrupts the streaming reply — finalize it in the transcript.
    chatStore.streamAgentEnd(this.agentId);
    liveStore.setPhase("listening");
    liveStore.setUserCaption("");
  }

  async onUserSpeechEnd(audio) {
    if (!liveStore.getState().micOn) {
      this.userSpeaking = false;
      return;
    }
    this.userSpeaking = false;
    liveStore.setPhase("thinking");
    const text = await stt(audio);
    if (!text) {
      liveStore.setError("Couldn't hear you — try again.");
      return;
    }
    liveStore.setUserCaption(text);
    liveStore.setAgentCaption("");
    chatStore.appendLiveUser(this.agentId, text);

    const frames = [];
    if (liveStore.getState().cameraOn) {
      const freshest = await this.camera.captureFreshest();
      if (freshest) frames.push({ data: freshest, mime: "image/jpeg", source: "camera" });
    }

    this.agentBuffer = "";
    // A user turn only "queues" when it barged into an in-flight agent reply:
    // the tail deltas still streaming from the old turn are shown but not
    // spoken. On a normal turn this is false, so the reply streams + speaks.
    this.turnQueued = liveStore.getState().phase === "speaking";
    console.log("[live] user turn:", text);
    this.client.userTurn(text, frames);
  }

  // ---------------------------------------------------------- agent reply

  onDelta(delta) {
    if (!delta) return;
    if (this.turnQueued) {
      // Straggler deltas from the pre-barge-in turn: show, don't speak.
      liveStore.setAgentCaption(delta);
      return;
    }
    liveStore.setPhase("speaking");
    this.agentBuffer += delta;
    liveStore.setAgentCaption(this.agentBuffer);
    chatStore.streamAgentDelta(this.agentId, delta);
    this.flushCompleteSentences();
  }

  onTurnEnd() {
    if (this.turnQueued) {
      // The interrupted turn finally ended; its buffer was stragglers. The
      // user's own turn is queued on the server and will stream next.
      this.turnQueued = false;
      this.agentBuffer = "";
      liveStore.setAgentCaption("");
      chatStore.streamAgentEnd(this.agentId);
      liveStore.setPhase("ready");
      return;
    }
    const rest = this.agentBuffer.trim();
    this.agentBuffer = "";
    if (rest) void this.speech.speakSentence(rest);
    chatStore.streamAgentEnd(this.agentId);
    liveStore.setPhase("ready");
  }

  flushCompleteSentences() {
    let buf = this.agentBuffer;
    // Take everything up to and including the last sentence terminator.
    let cut = -1;
    for (let i = 0; i < buf.length; i += 1) {
      const ch = buf[i];
      if (ch === "." || ch === "!" || ch === "?" || ch === "。") cut = i + 1;
    }
    if (cut > 0) {
      const sentence = buf.slice(0, cut).trim();
      buf = buf.slice(cut);
      this.agentBuffer = buf;
      if (sentence) void this.speech.speakSentence(sentence);
    }
  }

  // ------------------------------------------------------------- controls

  async toggleCamera() {
    const on = !liveStore.getState().cameraOn;
    if (on) {
      try {
        await this.camera.start();
        this.client.control("camera_on");
        frameTimer = setInterval(() => void this.pushFrame(), 2000);
        void this.pushFrame();
      } catch {
        liveStore.toggleCamera(); // revert
        return;
      }
      liveStore.toggleCamera();
    } else {
      clearInterval(frameTimer);
      frameTimer = null;
      this.camera.stop();
      this.client.control("camera_off");
      liveStore.toggleCamera();
    }
  }

  async pushFrame() {
    if (!this.client?.ready) return;
    const buf = await this.camera.captureFreshestBuffer();
    if (buf) this.client.sendFrame(buf);
  }

  toggleMic() {
    const next = !liveStore.getState().micOn;
    liveStore.toggleMic();
    if (next) this.voice?.resume();
    else this.voice?.pause();
  }

  // ------------------------------------------------------------- devices

  /** Enumerate mics/cams into the store so the dialer menus can render them. */
  async refreshDevices() {
    const { enumerateDevices } = await import("./devices");
    const { mics, cams } = await enumerateDevices();
    liveStore.setDevices({ mics, cams });
  }

  /** Switch the active microphone (rebuilds the VAD on the chosen device). */
  async setMic(deviceId) {
    liveStore.setMicId(deviceId || null);
    if (!liveStore.getState().active) return;
    const { micConstraints } = await import("./devices");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints(deviceId) });
      await this.voice?.stop();
      const wasOn = liveStore.getState().micOn;
      this.voice = new VoiceEngine({
        onSpeechStart: () => this.onUserSpeechStart(),
        onSpeechEnd: (audio) => void this.onUserSpeechEnd(audio),
      });
      await this.voice.start({ stream });
      if (wasOn) this.voice.resume();
    } catch {
      liveStore.setError("Couldn't switch microphone.");
    }
  }

  /** Switch the active camera (rebuilds capture on the chosen device). */
  async setCam(deviceId) {
    liveStore.setCamId(deviceId || null);
    if (!liveStore.getState().cameraOn) return;
    try {
      this.camera.stop();
      this.camera = new CameraCapture();
      await this.camera.start(deviceId || undefined);
    } catch {
      liveStore.setError("Couldn't switch camera.");
    }
  }

  // ------------------------------------------------------- push-to-talk

  /** Hold-to-listen: force the mic open even if it was muted. */
  pttDown() {
    this.pttHeld = true;
    this.voice?.resume();
    liveStore.set({ pttActive: true });
  }

  /** Release push-to-talk: return the mic to its toggle state. */
  pttUp() {
    this.pttHeld = false;
    if (!liveStore.getState().micOn) this.voice?.pause();
    liveStore.set({ pttActive: false });
  }

  fail(message) {
    liveStore.setError(message);
    void stopLiveCall();
  }

  async stop() {
    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
    chatStore.streamAgentEnd(this.agentId);
    try {
      await this.voice?.stop();
    } catch {
      // ignore
    }
    try {
      this.camera?.stop();
    } catch {
      // ignore
    }
    try {
      this.client?.close();
    } catch {
      // ignore
    }
    try {
      this.speech?.close();
    } catch {
      // ignore
    }
  }
}

export async function startLiveCall(agentId, agentName, role = "") {
  if (session) return;
  // The LIVE call is the Comms panel's voice mode — open the thread it writes to.
  chatStore.openChat(agentId, agentName);
  liveStore.startCall(agentId, agentName, role);
  session = new LiveSession(agentId, agentName, role);
  try {
    await session.start();
  } catch (err) {
    session.fail(err instanceof Error ? err.message : String(err));
  }
}

export async function stopLiveCall() {
  const current = session;
  session = null;
  if (current) {
    await current.stop();
  }
  liveStore.endCall();
}
