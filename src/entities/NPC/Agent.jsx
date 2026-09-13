// src/entities/NPC/Agent.jsx
//
// An NPC agent rendered from Mithuna's own player.glb (cloned per agent),
// driven by the deterministic CharacterStateMachine + Animation/Expression
// drivers. Capabilities are probed from the model and degrade gracefully.

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

import { getAgentRuntime, updateAgent, applyIntent, enterChatFocus, exitChatFocus } from "./AgentController";
import { AnimationDriver } from "../../simulation/character/AnimationDriver";
import { ExpressionDriver } from "../../simulation/character/ExpressionDriver";
import { inspectCharacter } from "../../simulation/character/capabilities";
import { usePaperclipStore } from "../../networking/sync/paperclipStore";
import { paperclipClient } from "../../networking/api/paperclipClient";
import { playerState } from "../Player/playerState";
import { speakForAgent, stopForAgent, RETRY_MS } from "../../services/tts/speech";
import { chatStore, useChatStore } from "../../ui/Panels/chatStore";
import { uiActionStore } from "../../ui/Panels/uiActionStore";
import { useLiveStore } from "../../services/live/liveStore";
import { startLiveCall } from "../../services/live/liveSession";
import { getTeamIdleSpot } from "../../world/layout/poiLayout";

const MODEL_PATH = "/models/character/player.glb";

const STATUS_COLOR = {
  idle: "#22c55e",
  paused: "#f59e0b",
  error: "#ef4444",
  terminated: "#6b7280",
  pending_approval: "#3b82f6",
  active: "#22c55e",
  running: "#3b82f6",
};

function spawnPosition(node) {
  // Team rooms first: when the active world anchors this agent's team to a
  // building, spawn at that room's idle spot / first desk so new hires
  // materialize where they work.
  if (node.teamIndex != null || node.teamName) {
    const spot = getTeamIdleSpot(node.teamIndex, node.teamName);
    if (spot) return [spot.x, 0, spot.z];
  }
  // Otherwise ring them 14-26m out around the player spawn (x=0, z=2).
  // Simulated players must NOT spawn next to the user's character (same
  // player.glb made it impossible to tell who the camera was following).
  const angle = node.index * 2.399963229728653;
  const radius = 14 + (node.index % 5) * 3;
  return [
    Math.cos(angle) * radius,
    0,
    2 + Math.sin(angle) * radius,
  ];
}

export function Agent({ node }) {
  const group = useRef();
  const runtimeRef = useRef(getAgentRuntime(node.id));
  const [micOpen, setMicOpen] = useState(false);
  const [waking, setWaking] = useState(false);
  const prevPresenceActive = useRef(false);

  const { scene, animations } = useGLTF(MODEL_PATH);
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  const capabilities = useMemo(
    () => inspectCharacter({ scene, animations }),
    [scene, animations]
  );

  const status = node.status || "idle";
  const statusColor = STATUS_COLOR[status] || STATUS_COLOR.idle;
  const initial = spawnPosition(node);

  const intentKind = usePaperclipStore((s) => s.intents?.[node.id]);
  const presence = usePaperclipStore((s) => s.presence?.[node.id]);
  const issues = usePaperclipStore((s) => s.issues);
  const runProgress = usePaperclipStore((s) => s.runProgress?.[node.id]);
  const chatAgentId = useChatStore((s) => s.activeAgentId);
  const isChatting = chatAgentId === node.id;
  const livePhase = useLiveStore((s) => (s.active && s.agentId === node.id ? s.phase : null));
  const inCall = livePhase !== null;
  const isOffline = presence === "offline";
  const effectiveColor = isOffline ? "#64748b" : statusColor;

  const speechContext = useMemo(() => {
    const assigned = (issues ?? []).filter((i) => i.assigneeAgentId === node.id);
    const active =
      assigned.find((i) =>
        ["in_progress", "in_review", "blocked"].includes(i.status)
      ) ?? assigned[0];
    return {
      name: node.name,
      role: node.description,
      issueTitle: active?.title ?? null,
      issueCount: assigned.length,
    };
  }, [issues, node.id, node.name, node.description]);

  useEffect(() => {
    applyIntent(runtimeRef.current, intentKind, node.index, {
      teamIndex: node.teamIndex ?? null,
      teamName: node.teamName ?? null,
    });
  }, [intentKind, node.index, node.id, node.teamIndex, node.teamName]);

  useFrame((_, delta) => {
    if (!actions || !mixer) return;

    const rt = runtimeRef.current;
    if (!rt.animDriver) {
      rt.animDriver = new AnimationDriver(actions, mixer);
      rt.expressionDriver = new ExpressionDriver(capabilities);
      rt.driver = {
        setAnimation: (name, loop) => rt.animDriver.play(name, loop),
        setUpperAnimation: (name, loop) => rt.animDriver.playUpper(name, loop),
        clearUpper: () => rt.animDriver.clearUpper(),
        setExpression: (name) => rt.expressionDriver?.setExpression(name),
        getAnimationDuration: (name) => rt.animDriver.getDuration(name),
      };
    }

    // Chat focus: freeze the agent's autonomous flow (no walking/speaking)
    // while the user is talking to it, and point it at the player.
    if (isChatting !== !!rt.chatFocus) {
      if (isChatting) {
        rt.speechActive = false;
        stopForAgent(node.id);
        enterChatFocus(rt);
      } else {
        exitChatFocus(rt);
      }
    }

    // LIVE call: silence ambient speech and drive the character's body from the
    // call phase — talk while the agent's voice plays, listen while the user
    // speaks. The talk/listen states also disable free wander (see
    // AgentController.update), so the character holds still during a call.
    if (inCall) {
      rt.speechActive = false;
      stopForAgent(node.id);
    }

    // Presence reflex: when an agent flips to active/online, play a short happy
    // reaction (one-shot, auto-returns to idle) so arrivals feel alive.
    const presenceActive = !!presence && presence !== "offline";
    if (
      presenceActive &&
      !prevPresenceActive.current &&
      !inCall &&
      !isChatting
    ) {
      const st = rt.fsm.getState();
      const seated =
        rt.arrivalState === "sit_work" || rt.arrivalState === "sit_idle";
      if (st !== "walk" && st !== "happy" && !seated) {
        rt.fsm.transition("happy", rt.driver);
      }
    }
    prevPresenceActive.current = presenceActive;

    // Visual reflex (SceneManager port): show speaking while running at a desk,
    // listening while waiting in the boardroom. Deterministic, fire-and-forget.
    const seated =
      rt.arrived &&
      (rt.arrivalState === "sit_work" || rt.arrivalState === "sit_idle");
    if (inCall) {
      rt.speakRequested = livePhase === "speaking";
      rt.listenRequested = livePhase === "listening" || livePhase === "thinking";
    } else {
      rt.speakRequested = isChatting
        ? false
        : rt.kind === "WORK_TALK" || (status === "running" && seated);
      rt.listenRequested = isChatting
        ? false
        : rt.kind === "WAIT_BOARDROOM" || rt.kind === "GO_TO_BOARDROOM";
    }

    // Voice: speak on entering a talk state, then periodically while the agent
    // keeps talking; stop the moment it stops. Fire-and-forget, degrades to
    // silent when the TTS model is still warming up.
    if (!isChatting && !inCall) {
      const talkContext = { kind: rt.kind || "WORK_TALK", ...speechContext };
      if (rt.speakRequested && !rt.speechActive) {
        rt.speechActive = true;
        rt.lastSpeechAttempt = 0;
        speakForAgent(node.id, talkContext, { force: true });
      } else if (rt.speakRequested && rt.speechActive) {
        if (performance.now() - rt.lastSpeechAttempt >= RETRY_MS) {
          rt.lastSpeechAttempt = performance.now();
          speakForAgent(node.id, talkContext);
        }
      } else if (!rt.speakRequested && rt.speechActive) {
        rt.speechActive = false;
        stopForAgent(node.id);
      }
    }

    const body = playerState.bodyRef;
    const faceTarget = (isChatting || inCall) && body
      ? { x: body.translation().x, z: body.translation().z }
      : null;

    updateAgent(group.current, node.id, delta, rt.driver, faceTarget);
    rt.expressionDriver?.update(delta);
    rt.animDriver.update(delta);
  });

  return (
    <group ref={group} position={initial}>
      <primitive object={clonedScene} />

      {/* Status ring */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 24]} />
        <meshBasicMaterial color={effectiveColor} />
      </mesh>

      <Html
        position={[0, 2.75, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: "auto" }}
      >        <div
          className="agent-tag ui-interactive"
          style={{ borderColor: effectiveColor }}
          onClick={(e) => {
            e.stopPropagation();
            setMicOpen((v) => !v);
          }}
        >
          {node.teamIndex != null && (
            <span className="agent-tag-team" style={{ background: node.teamColor ?? node.color }} />
          )}
          <span className="agent-tag-name">
            {node.name}
            {isOffline ? " (offline)" : ""}
          </span>
          {inCall && <span className="agent-tag-live">LIVE</span>}
          {micOpen && (
            <>
              <button
                type="button"
                className="agent-tag-mic"
                title={`Talk to ${node.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  chatStore.openChat(node.id, node.name);
                  setMicOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="agent-tag-live-btn"
                title={`LIVE call with ${node.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMicOpen(false);
                  void startLiveCall(node.id, node.name, node.description);
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.6 21 3 12.4 3 2c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="agent-tag-mic agent-tag-task"
                title={`Assign a task to ${node.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  uiActionStore.requestAssignTask(node.id, node.name);
                  setMicOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19 3h-4.18A3 3 0 0 0 12 1a3 3 0 0 0-2.82 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm1 14H8v-2h5v2zm3-4H8v-2h8v2zm0-4H8V7h8v2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="agent-tag-live-btn agent-tag-wake"
                title={waking ? `Waking ${node.name}…` : `Wake ${node.name} up`}
                disabled={waking}
                onClick={async (e) => {
                  e.stopPropagation();
                  setWaking(true);
                  try {
                    await paperclipClient.wakeAgent(node.id, `Poked by the board in Mithuna`);
                  } catch {
                    // wake is best-effort; scheduler may be holding
                  } finally {
                    setWaking(false);
                    setMicOpen(false);
                  }
                }}
              >
                ⚡
              </button>
              {runProgress && (
                <button
                  type="button"
                  className="agent-tag-mic agent-tag-task"
                  title={`Watch ${node.name}'s live run transcript`}
                  onClick={(e) => {
                    e.stopPropagation();
                    uiActionStore.openTranscript(node.id, node.name);
                    setMicOpen(false);
                  }}
                >
                  ▶
                </button>
              )}
            </>
          )}
        </div>
      </Html>

      {/* Live work bubble: current run phase/message straight from the WS */}
      {runProgress && !inCall && (
        <Html position={[0, 3.4, 0]} center distanceFactor={16} style={{ pointerEvents: "none" }}>
          <div
            className="agent-bubble"
            title={runProgress.message ?? ""}
            onClick={() => uiActionStore.openTranscript(node.id, node.name)}
          >
            {runProgress.message || runProgress.phase || "working…"}
          </div>
        </Html>
      )}
    </group>
  );
}
