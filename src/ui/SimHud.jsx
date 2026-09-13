import { useEffect, useState } from "react";
import "./simhud.css";
import { onTtsChange, getTtsState } from "../services/tts/kokoro";
import {
  onSpeechChange,
  getSpeechState,
  setSpeechMuted,
} from "../services/tts/speech";
import { useLiveStore } from "../services/live/liveStore";
import { CameraDock } from "./CameraDock";

function voiceStatus(tts, speech) {
  if (speech.muted) return { label: "VOICE OFF", tone: "dim" };
  if (tts.error) return { label: "VOICE ERR", tone: "err" };
  if (tts.loading) return { label: "VOICE WARMUP", tone: "warn" };
  if (speech.speakingAgentId) return { label: "VOICE LIVE", tone: "ok" };
  return { label: "VOICE READY", tone: "ok" };
}

export function SimHud() {
  const [tts, setTts] = useState(getTtsState);
  const [speech, setSpeech] = useState(getSpeechState);
  const liveActive = useLiveStore((s) => s.active);
  const [bootVisible, setBootVisible] = useState(true);

  useEffect(() => onTtsChange(() => setTts(getTtsState())), []);
  useEffect(() => onSpeechChange(() => setSpeech(getSpeechState())), []);
  useEffect(() => {
    const t = setTimeout(() => setBootVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const voice = voiceStatus(tts, speech);
  const speaking = !!speech.speakingAgentId;

  return (
    <>
      <div className="scanlines" />
      <div className="vignette" />

      <div className="hud-status">
        <span className="hud-brand">
          AVATAR.SYS <span className="hud-ver">v0.1.0</span>
        </span>
        <span className="hud-meta">
          <span className="hud-pulse">● SIM LOCK</span>
          <span className={`hud-voice ${voice.tone}`}>{voice.label}</span>
          <span className="hud-bars">▂▄▆█</span>
        </span>
      </div>

      <div className="hud-stats">
        <span className="stat">SYNC <b>99.7%</b></span>
        <span className="stat">CONTAINMENT <b>STABLE</b></span>
        <span className="stat">MEM <b>87%</b></span>
      </div>

      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <div className={`hud-float cam-float ${liveActive ? "live" : ""}`}>
        <CameraDock />
      </div>

      <div className={`hud-caption ${speaking || liveActive ? "active" : "idle"}`}>
        <button
          type="button"
          className="hud-mute"
          onClick={() => setSpeechMuted(!speech.muted)}
        >
          {speech.muted ? "VOICE OFF" : "VOICE ON"}
        </button>
        {speaking ? (
          <span className="hud-caption-line">
            <b>{speech.agentName}</b>
            <span className="hud-caption-sep">·</span>
            <span>{speech.caption}</span>
          </span>
        ) : (
          <span className="hud-caption-idle">/// awaiting voice lines</span>
        )}
      </div>

      {bootVisible && (
        <div className="hud-boot">/// unit-042 · signal locked · stay inside the frame</div>
      )}
    </>
  );
}
