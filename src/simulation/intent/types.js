// src/simulation/intent/types.js
//
// The deterministic character intents produced from paperclip domain state.
// The character state machine + movement controllers consume these.

export const INTENT_KINDS = [
  "GO_TO_DESK",        // issue in_progress  -> walk to desk, sit_work
  "GO_TO_BOARDROOM",   // issue in_review    -> walk to boardroom, sit/listen
  "RETURN_TO_SPAWN",   // issue done         -> walk back to spawn, idle
  "WAIT_BOARDROOM",    // agent pending_approval -> wait at boardroom
  "HOLD",              // issue blocked      -> stop, sad
  "ERROR",             // agent error        -> stop, sad
  "PAUSED",            // agent paused       -> stop
  "WORK_TALK",         // agent running / run progress -> keep working, speaking
  "REMOVED",           // agent terminated   -> fade out
  "IDLE",              // no constraints     -> free wander
];

/** Issue status priority: highest wins as an agent's "active" issue. */
export const ISSUE_STATUS_PRIORITY = {
  in_progress: 5,
  in_review: 4,
  blocked: 3,
  todo: 2,
  done: 1,
  backlog: 0,
  cancelled: -1,
};
