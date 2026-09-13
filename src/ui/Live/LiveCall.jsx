// src/ui/Live/LiveCall.jsx
//
// Full-screen LIVE dialer (Gemini-Live-style caller screen) shown over the 3D
// simulation while a call is active. Ported UX from OpenLive's InCall: an orb
// that reacts to the live voice, phase + captions, camera preview (PiP),
// device-switch menus (mic/cam), push-to-talk, keyboard shortcuts, a
// collapsible transcript sidebar bound to the shared Comms thread, and
// mic/camera/end controls. Everything is driven by the liveStore; the heavy
// lifting lives in src/services/live/liveSession.js.

import { useEffect, useRef, useState } from "react";
import { useLiveStore } from "../../services/live/liveStore";
import { getLiveSession, stopLiveCall } from "../../services/live/liveSession";
import { useChatStore } from "../Panels/chatStore";
import { Orb } from "./Orb";

const PHASE_LABEL = {
  connecting: "CONNECTING",
  ready: "READY · TALK TO",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
};

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"
      />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm3-7h-3.17L12 3H9L7.17 5H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3zm0 12H6V8h12v9z"
      />
    </svg>
  );
}

function EndIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 9c-2.6 0-5 .7-6.9 1.9-.8.5-1 1.6-.4 2.4l1.5 1.9c.4.5 1.1.7 1.7.4l2.3-1.2c.5-.3.8-.8.8-1.4V11c1-.3 2.1-.5 3.4-.5s2.4.2 3.4.5v2c0 .6.3 1.1.8 1.4l2.3 1.2c.6.3 1.3.1 1.7-.4l1.5-1.9c.6-.8.4-1.9-.4-2.4C17 9.7 14.6 9 12 9z"
      />
    </svg>
  );
}

function PttIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 11a5 5 0 0 1 10 0v1h-1.5v-1a3.5 3.5 0 0 0-7 0v1H7v-1zm-1 1h1.5v1H6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1h-1.5v-1H18a5 5 0 0 0-2.2-4.1l1.4-1.4A6.5 6.5 0 0 1 19.5 12v5a2.5 2.5 0 0 1-2.5 2.5h-2A4.5 4.5 0 0 1 10.5 15h-1A4.5 4.5 0 0 1 5 10.5V12z"
      />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm7 3H4v13h6V7zm2 0v13h8V7h-8z"
      />
    </svg>
  );
}

function CameraPiP() {
  const ref = useRef(null);
  const cameraOn = useLiveStore((s) => s.cameraOn);

  useEffect(() => {
    const stream = getLiveSession()?.camera?.getStream?.();
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [cameraOn]);

  if (!cameraOn) return null;
  return (
    <div className="live-cam-pip">
      <video ref={ref} autoPlay muted playsInline />
    </div>
  );
}

function LiveTranscript({ agentId, agentName, open }) {
  const messages = useChatStore((s) => (agentId ? s.conversations?.[agentId] ?? [] : []));
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, agentId]);

  if (!open) return null;
  return (
    <aside className="live-transcript">
      <div className="live-transcript-title">
        <span>Comms // {agentName}</span>
        <span className="live-transcript-live">● LIVE</span>
      </div>
      <div className="live-transcript-log" ref={listRef}>
        {messages.length === 0 && (
          <div className="live-transcript-empty">link established with {agentName}</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`live-transcript-line ${m.role === "user" ? "u" : "a"} ${m.kind === "live" ? "live" : ""} ${m.streaming ? "streaming" : ""}`}
          >
            <span className="live-transcript-role">{m.role === "user" ? "YOU" : agentName}</span>
            <span className="live-transcript-text">
              {m.text}
              {m.streaming && <span className="chat-caret" />}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function DeviceMenu({ label, devices, activeId, onPick, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="live-device" ref={ref}>
      {children}
      {devices.length > 0 && (
        <button
          type="button"
          className={`live-device-menu-btn ${open ? "on" : ""}`}
          title={`Choose ${label}`}
          onClick={() => setOpen((v) => !v)}
        >
          ⌃
        </button>
      )}
      {open && (
        <div className="live-device-menu">
          <div className="live-device-menu-title">{label}</div>
          {devices.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`live-device-opt ${d.id === activeId ? "on" : ""}`}
              onClick={() => {
                onPick(d.id);
                setOpen(false);
              }}
            >
              {d.id === activeId ? "✓ " : ""}
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveCall() {
  const {
    active,
    agentId,
    agentName,
    role,
    phase,
    userCaption,
    agentCaption,
    error,
    micOn,
    cameraOn,
    pttActive,
    mics,
    cams,
    micId,
    camId,
  } = useLiveStore((s) => s);
  const session = getLiveSession();
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [pttEnabled, setPttEnabled] = useState(false);

  useEffect(() => {
    if (!active) return;
    const sessionId = session?.agentId;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        void stopLiveCall();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space" && pttEnabled) {
        e.preventDefault();
        if (e.type === "keydown" && !e.repeat) session?.pttDown();
        return;
      }
      if (e.type === "keyup") {
        if (e.code === "Space" && pttEnabled) session?.pttUp();
        return;
      }
      switch (e.key.toLowerCase()) {
        case "m":
          e.preventDefault();
          session?.toggleMic();
          break;
        case "c":
          e.preventDefault();
          void session?.toggleCamera();
          break;
        case "t":
          e.preventDefault();
          setTranscriptOpen((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [active, pttEnabled, session]);

  if (!active) return null;

  const phaseText = error
    ? "LINK ERROR"
    : phase === "ready"
      ? `${PHASE_LABEL[phase] ?? phase} ${agentName}`.toUpperCase()
      : (PHASE_LABEL[phase] ?? phase).toUpperCase();

  const onMic = () => session?.toggleMic();
  const onCam = () => void session?.toggleCamera();
  const onEnd = () => void stopLiveCall();
  const onTogglePtt = () => {
    if (pttEnabled && pttActive) session?.pttUp();
    setPttEnabled((v) => !v);
  };

  return (
    <div className="live-overlay">
      <div className="live-topbar">
        <span className="live-brand">LIVE LINK // {agentName}</span>
        <span className="live-role">{role}</span>
      </div>

      <div className="live-body">
        <div className="live-stage">
          <Orb size={190} phase={phase} />
          <div className={`live-phase live-phase-${phase}`}>{phaseText}</div>

          <div className="live-captions">
            {userCaption && (
              <div className="live-caption live-caption-user">
                <span className="live-caption-role">YOU</span>
                <span className="live-caption-text">{userCaption}</span>
              </div>
            )}
            {agentCaption && (
              <div className="live-caption live-caption-agent">
                <span className="live-caption-role">{agentName.toUpperCase()}</span>
                <span className="live-caption-text">{agentCaption}</span>
              </div>
            )}
          </div>

          <div className="live-hints">
            <span className={`live-hint-key ${pttEnabled ? "on" : ""}`}>
              {pttEnabled ? "SPACE" : "P"} to talk
            </span>
            <span className="live-hint-key">M mic · C cam · T comms</span>
            <span className="live-hint-key">⌘/Ctrl E end</span>
          </div>
        </div>

        <LiveTranscript agentId={agentId} agentName={agentName} open={transcriptOpen} />
      </div>

      <CameraPiP />

      <div className="live-controls">
        <DeviceMenu
          label="MICROPHONE"
          devices={mics}
          activeId={micId}
          onPick={(id) => void session?.setMic(id)}
        >
          <button
            type="button"
            className={`live-btn ${micOn ? "live-btn-on" : ""}`}
            title={micOn ? "Mute mic (M)" : "Unmute mic (M)"}
            onClick={onMic}
          >
            <MicIcon />
          </button>
        </DeviceMenu>

        <DeviceMenu
          label="CAMERA"
          devices={cams}
          activeId={camId}
          onPick={(id) => void session?.setCam(id)}
        >
          <button
            type="button"
            className={`live-btn ${cameraOn ? "live-btn-on" : ""}`}
            title={cameraOn ? "Turn camera off (C)" : "Turn camera on (C)"}
            onClick={onCam}
          >
            <CamIcon />
          </button>
        </DeviceMenu>

        <button
          type="button"
          className={`live-btn ${pttEnabled ? "live-btn-on" : ""} ${pttActive ? "live-btn-pressed" : ""}`}
          title={pttEnabled ? "Push-to-talk on — Space drives talking" : "Enable push-to-talk (Space)"}
          onClick={onTogglePtt}
        >
          <PttIcon />
        </button>

        <button
          type="button"
          className={`live-btn ${transcriptOpen ? "live-btn-on" : ""}`}
          title="Show / hide transcript (T)"
          onClick={() => setTranscriptOpen((v) => !v)}
        >
          <PanelIcon />
        </button>

        <button type="button" className="live-btn live-end" title="End call (⌘/Ctrl E)" onClick={onEnd}>
          <EndIcon />
        </button>
      </div>
    </div>
  );
}
