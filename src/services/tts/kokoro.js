// src/services/tts/kokoro.js
//
// In-browser TTS powered by kokoro-js (Kokoro-82M, transformers.js WASM).
// The model is loaded lazily on first use (single ~300MB download from the
// Hugging Face Hub, then cached), and speech is played through the Web Audio
// API. Everything runs locally in the browser — no TTS server required.
//
// Degrades gracefully: if the model can't be fetched/loaded, `available`
// stays false and the app falls back to text-only chat.

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_DTYPE = "q8";
const DEFAULT_DEVICE = "wasm";
const DEFAULT_VOICE = "af_heart";
const SAMPLE_RATE = 24000;

let tts = null;
let voice = DEFAULT_VOICE;
let muted = false;
let initPromise = null;
let initError = null;
let audioCtx = null;
let activeSource = null;
let currentToken = 0;

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export function onTtsChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTtsState() {
  return {
    available: !!tts,
    loading: !!initPromise,
    error: initError,
    voice,
    muted,
    speaking: !!activeSource,
  };
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = !!next;
  if (muted) stop();
  emit();
}

/** Create (or reuse) the shared AudioContext. Must be triggered by user input. */
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Warm up the Web Audio graph. Call from a user-gesture handler (pointerdown /
 * keydown) so the AudioContext is guaranteed to be running before the agents
 * start speaking.
 */
export function warmupAudio() {
  try {
    getAudioContext();
  } catch {
    // audio not available in this environment
  }
}

async function loadTts() {
  if (tts) return tts;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { KokoroTTS, env } = await import("kokoro-js");
    // Persist the downloaded model in the browser HTTP cache across reloads.
    // NOTE: allowLocalModels stays FALSE (the browser default) — enabling it
    // makes transformers probe ./models/<repo>/… which Vite answers with the
    // SPA fallback (index.html, 200) and JSON.parse then throws.
    env.useBrowserCache = true;

    const instance = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: DEFAULT_DTYPE,
      device: DEFAULT_DEVICE,
    });
    tts = instance;
    initError = null;
    return instance;
  })().catch((err) => {
    initError = err instanceof Error ? err.message : String(err);
    initPromise = null;
    throw initError;
  });

  return initPromise;
}

/** Warm up the model (e.g. after the first user interaction) without speaking. */
export async function ensureTts() {
  try {
    await loadTts();
  } catch {
    // available stays false; caller can check getTtsState()
  }
  emit();
}

/**
 * Shared KokoroTTS instance. The LIVE pipeline reuses the same lazy-loaded
 * model as ambient speech, so opening a call never double-downloads weights.
 */
export async function getKokoroInstance() {
  return loadTts();
}

/** Full or partial synthesis → RawAudio buffer, or null when unavailable. */
async function synthesize(text, { voice: v = voice, speed = 1 } = {}) {
  const instance = await loadTts();
  const clean = text.replace(/[#*_`~]/g, "").trim();
  if (!clean) return null;
  return instance.generate(clean, { voice: v, speed });
}

/**
 * Speak `text` out loud. Resolves when playback finishes (or is interrupted).
 * Calling again cancels the previous utterance.
 */
export async function speak(text, { onStart = () => {}, onEnd = () => {} } = {}) {
  if (muted) {
    emit();
    onEnd();
    return false;
  }

  const token = ++currentToken;

  let rawAudio;
  try {
    rawAudio = await synthesize(text);
  } catch {
    emit();
    onEnd();
    return false;
  }
  if (token !== currentToken) return false;
  if (!rawAudio) {
    emit();
    onEnd();
    return false;
  }

  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(1, rawAudio.audio.length, rawAudio.sample_rate || SAMPLE_RATE);
  buffer.copyToChannel(rawAudio.audio, 0);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  activeSource?.stop();

  source.onended = () => {
    if (activeSource === source) activeSource = null;
    emit();
    onEnd();
  };

  activeSource = source;
  source.start();
  emit();
  onStart();

  return true;
}

/** Stop the currently playing utterance. */
export function stop() {
  currentToken += 1;
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
      // already stopped
    }
    activeSource = null;
  }
  emit();
}

export function setVoice(next) {
  voice = next;
  emit();
}

export const KOKORO_VOICES = [
  "af_heart",
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa",
  "bf_alice",
  "bf_emma",
  "bf_isabella",
  "bf_lily",
  "bm_daniel",
  "bm_fable",
  "bm_george",
  "bm_lewis",
  "ef_dora",
  "em_alex",
  "em_santa",
  "ff_siwis",
  "hf_alpha",
  "hf_beta",
  "hm_omega",
  "hm_psi",
  "if_sara",
  "im_nicola",
  "jf_alpha",
  "jf_gongitsune",
  "jf_nezumi",
  "jf_tebukuro",
  "jm_kumo",
  "pf_dora",
  "pm_alex",
  "pm_santa",
  "zf_xiaobei",
  "zf_xiaoni",
  "zf_xiaoxiao",
  "zf_xiaoyi",
  "zm_yunjian",
  "zm_yunxi",
  "zm_yunxia",
  "zm_yunyang",
];
