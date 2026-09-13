# LIVE Wire Protocol (Mithuna Engine ↔ hermes)

Audio + vision live calls between the Engine (browser) and the hermes brain
(`ws://localhost:8765/api/v1/live`). This protocol is the shared contract
between the Mithuna Engine client (`src/services/live/liveClient.js`) and
hermes (`hermes-agent/live_service.py`).

The browser runs speech-to-text (Whisper) and text-to-speech (Kokoro) on-device,
so **no audio crosses the wire**. The client sends final user text plus camera
JPEG frames; the server streams the model's reply text back.

## Connection

```
ws://<hermes-host>:8765/api/v1/live
```

Optional query params (`model`, `provider`, `session_id`, `system_prompt`,
`toolsets` as comma-separated, `max_turns`) configure the underlying AIAgent.

## Client → server

### JSON

```jsonc
// Bind: identifies which company agent the caller is talking to. Sent once,
// immediately after the socket opens.
{ "t": "bind", "agentId": "ceo", "name": "Aanya", "role": "CEO", "systemPrompt": "<optional base persona>" }

// A finished user utterance, ready for the brain.
// `frames` are base64 JPEGs captured around this turn (0..2).
{ "t": "user_turn", "text": "…", "frames": [ { "data": "<base64>", "mime": "image/jpeg", "source": "camera" } ] }

// Camera toggles.
{ "t": "control", "action": "camera_on" }
{ "t": "control", "action": "camera_off" }

// Hanging up.
{ "t": "control", "action": "end" }
```

### Binary

Single-byte tag followed by a JPEG frame body:

```
0x02 <jpeg bytes>
```

The server treats a binary frame as a "camera is on" signal and stores the
freshest frame for the next user turn.

## Server → client (all JSON)

```jsonc
{ "t": "ready", "sessionId": "…" }                       // session is warm
{ "t": "assistant_delta", "delta": "…" }                 // streamed reply text
{ "t": "turn_end" }                                       // current turn finished
{ "t": "error", "message": "…" }
{ "t": "session_closed" }                                 // server closed (end)
```

## Turn semantics

- **One active turn at a time.** A `user_turn` received while a turn is
  running triggers barge-in: the running turn is interrupted and the new
  utterance is queued and run immediately after.
- **Frames are kept on the 2 most recent turns only** (cost/latency guard).
- Vision: frames are attached to the user message as `image_url` content parts.
  Hermes feeds them to the active model — vision models see them natively;
  non-vision models get an automatic `vision_analyze` description.
