// src/simulation/intent/IntentResolver.js
//
// Maps paperclip domain state (agent status + active issue status) to a
// deterministic character intent. Pure functions, no side effects.

import { ISSUE_STATUS_PRIORITY } from "./types";

/** Highest-priority issue status among the ones assigned to an agent. */
export function pickActiveIssueStatus(statuses = []) {
  let best = null;
  let bestP = -Infinity;
  for (const s of statuses) {
    const p = ISSUE_STATUS_PRIORITY[s];
    if (p === undefined) continue;
    if (p > bestP) {
      bestP = p;
      best = s;
    }
  }
  return best;
}

/** Deterministic intent for a single agent. */
export function resolveAgentIntent(agentStatus, issueStatus) {
  if (agentStatus === "terminated") return "REMOVED";
  if (agentStatus === "error") return "ERROR";
  if (agentStatus === "pending_approval") return "WAIT_BOARDROOM";
  if (agentStatus === "paused") return "PAUSED";
  if (issueStatus === "in_review") return "GO_TO_BOARDROOM";
  if (issueStatus === "in_progress") return "GO_TO_DESK";
  if (issueStatus === "blocked") return "HOLD";
  if (issueStatus === "done") return "RETURN_TO_SPAWN";
  if (agentStatus === "running") return "WORK_TALK";
  return "IDLE";
}

/**
 * Build the intent map for every agent.
 * @param {Array<{id:string}>} agents
 * @param {{agentStatus:Object, issueStatusByAgent:Object}} snapshot
 * @returns {{[agentId]: string}}
 */
export function resolveIntents(agents, snapshot) {
  const map = {};
  for (const a of agents) {
    map[a.id] = resolveAgentIntent(
      snapshot.agentStatus[a.id],
      snapshot.issueStatusByAgent[a.id]
    );
  }
  return map;
}
