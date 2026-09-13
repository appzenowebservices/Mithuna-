// src/services/live/models.js
//
// On-device Moonshine speech-to-text for the LIVE "ear", powered by
// @huggingface/transformers (WASM). The model is downloaded once and cached by
// the browser Cache API; the pipeline is kept warm for the whole tab so a
// second call reuses it with zero download. Degrades to returning "" if the
// model can't load (the call then continues without transcription).

const STT_MODEL = "onnxcommunity/moonshine-tiny-ONNX";

let transcriber = null;
let sttPromise = null;

export async function ensureStt() {
  if (transcriber) return transcriber;
  if (sttPromise) return sttPromise;
  sttPromise = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    // In browsers allowLocalModels defaults to FALSE — keep it that way. Enabling
    // it made transformers probe ./models/<repo>/… locally; Vite's SPA fallback
    // answers those probes with index.html (200), which then fails JSON.parse.
    env.useBrowserCache = true;
    env.backends?.onnx?.wasm?.proxy !== undefined && (env.backends.onnx.wasm.proxy = false);
    transcriber = await pipeline("automatic-speech-recognition", STT_MODEL, {
      dtype: "q8",
    });
    return transcriber;
  })().catch((err) => {
    sttPromise = null;
    throw err;
  });
  return sttPromise;
}

/** Transcribe a 16 kHz mono Float32 utterance -> trimmed text ("" on failure). */
export async function stt(audio) {
  try {
    const t = await ensureStt();
    const out = await t(audio, { return_timestamps: false });
    const text = (typeof out === "string" ? out : out?.text ?? "").trim();
    console.log("[live:stt]", JSON.stringify(text) || "(empty)");
    return text;
  } catch (err) {
    console.error("[live:stt] transcription failed:", err);
    return "";
  }
}
