// src/services/tts/speech.js
//
// Turns agent state (intents/issues) into spoken voice lines and drives the
// shared kokoro TTS playback, so the NPC agents in the sim actually talk.
//
// Only one agent speaks at a time: if another agent is mid-sentence the new
// utterance is skipped, and the next periodic attempt may get a turn.

import { speak, stop, getTtsState, setMuted } from "./kokoro";

const SPEECH_INTERVAL_MS = 14000;
const RETRY_MS = 6000;

const LINES = {
  WORK_TALK: [
    "On it. {task}, steady progress.",
    "Working through {task} now.",
    "Focused on {task}, will sync when it's done.",
    "Executing {task}, everything looks good.",
  ],
  GO_TO_BOARDROOM: [
    "Heading to the boardroom to review my latest work.",
    "Taking this one in for review.",
  ],
  WAIT_BOARDROOM: [
    "Waiting on approval before I proceed.",
    "Handing off for review, standing by.",
  ],
  HOLD: [
    "This one is blocked, I could use a hand.",
    "Hit a blocker on {task}.",
  ],
  ERROR: [
    "I've hit an error state, please check my status.",
    "Something went wrong, need to recover.",
  ],
  PAUSED: [
    "Paused, waiting for instructions.",
  ],
  REMOVED: [
    "Signing off.",
  ],
  IDLE: [
    "Looking for my next task.",
    "Idle and ready. What's next?",
  ],
};

let speechState = { speakingAgentId: null, agentName: "", caption: "" };
const lastLineByAgent = new Map();
let lastSpokenAt = 0;

const speechListeners = new Set();

function emitSpeech() {
  for (const listener of speechListeners) listener();
}

export function onSpeechChange(listener) {
  speechListeners.add(listener);
  return () => speechListeners.delete(listener);
}

export function getSpeechState() {
  return { ...speechState, muted: getTtsState().muted };
}

export function setSpeechMuted(next) {
  setMuted(next);
  emitSpeech();
}

function pick(pool, exclude) {
  const candidates = pool.filter((line) => line !== exclude);
  const source = candidates.length ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)];
}

/**
 * Compose a voice line for the given intent kind.
 * @param {string} kind  one of the INTENT_KINDS in src/simulation/intent/types.js
 * @param {{name:string, role:string, issueTitle:string}} ctx
 */
export function buildAgentLine(kind, { name = "", role = "", issueTitle = "" } = {}) {
  const task = issueTitle ? `the task “${issueTitle}”` : "my current task";
  const pool = LINES[kind] || LINES.IDLE;
  return pick(pool).replaceAll("{task}", task).replaceAll("{name}", name).replaceAll("{role}", role);
}

/**
 * Speak a line for an agent, gated so only one agent talks at a time and a
 * persistently-talking agent only gets a new line every SPEECH_INTERVAL_MS.
 * @param {string} agentId
 * @param {{kind:string, name:string, role:string, issueTitle:string}} context
 * @param {{force?:boolean}} options
 */
export async function speakForAgent(agentId, context, { force = false } = {}) {
  if (getTtsState().muted) return false;

  if (speechState.speakingAgentId && speechState.speakingAgentId !== agentId) {
    return false;
  }

  const now = Date.now();
  if (!force && speechState.speakingAgentId === agentId && now - lastSpokenAt < SPEECH_INTERVAL_MS) {
    return false;
  }

  const line = buildAgentLine(context.kind, context);
  const last = lastLineByAgent.get(agentId);
  if (!force && line === last) return false;
  lastLineByAgent.set(agentId, line);

  const ok = await speak(line, {
    onStart: () => {
      speechState = { speakingAgentId: agentId, agentName: context.name, caption: line };
      emitSpeech();
    },
    onEnd: () => {
      if (speechState.speakingAgentId === agentId) {
        speechState = { speakingAgentId: null, agentName: "", caption: "" };
        emitSpeech();
      }
    },
  });

  if (ok) lastSpokenAt = now;
  return ok;
}

/** Stop audio if the given agent is the current speaker. */
export function stopForAgent(agentId) {
  if (speechState.speakingAgentId && speechState.speakingAgentId !== agentId) return;
  stop();
  speechState = { speakingAgentId: null, agentName: "", caption: "" };
  emitSpeech();
}

/**
 * Speak an arbitrary line verbatim for an agent (used by the chat panel so the
 * agent literally voices its reply). Same one-speaker-at-a-time gating.
 */
export async function speakText(agentId, text, agentName = "") {
  if (getTtsState().muted) return false;
  if (speechState.speakingAgentId && speechState.speakingAgentId !== agentId) {
    return false;
  }
  if (!text) return false;

  const ok = await speak(text, {
    onStart: () => {
      speechState = { speakingAgentId: agentId, agentName, caption: text };
      emitSpeech();
    },
    onEnd: () => {
      if (speechState.speakingAgentId === agentId) {
        speechState = { speakingAgentId: null, agentName: "", caption: "" };
        emitSpeech();
      }
    },
  });
  return ok;
}

export { RETRY_MS };
