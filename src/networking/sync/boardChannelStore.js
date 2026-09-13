// src/networking/sync/boardChannelStore.js
//
// The Board Channel: a per-company action feed where everything the agents
// say / ask / request surfaces for the player (the Board) to see and act on.
//
// Aggregates from Paperclip REST:
//   - pending approvals        (hire_agent / ceo_strategy / budget overrides)
//   - pending issue-thread interactions (agent questions mid-task)
//   - recent activity          (ticker lines)
//   - sidebar badges           (inbox counter)
//   - budget overview          (money HUD)
//
// All reads are board-actor REST; every action maps 1:1 to an existing
// Paperclip endpoint. Refresh is driven by paperclipStore's live-event
// handler plus a slow polling fallback.

import { useEffect, useReducer } from "react";
import { paperclipClient } from "../api/paperclipClient";

const ACTIVE_ISSUE_STATUSES = ["in_progress", "in_review", "blocked"];
const INTERACTION_SCAN_LIMIT = 12;
const ACTIVITY_LIMIT = 30;
const POLL_MS = 60000;

const initialState = {
  companyId: null,
  loading: false,
  error: null,
  approvals: [],
  interactions: [], // [{key, issueId, issueTitle, interaction}]
  activity: [],
  badges: null,
  budget: null,
  costs: null,
  lastUpdated: null,
};

let state = { ...initialState };
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function setState(partial) {
  state = { ...state, ...partial };
  emit();
}

async function safe(promise) {
  try {
    return await promise;
  } catch {
    return null;
  }
}

function summarizeApprovalPayload(type, payload) {
  if (!payload || typeof payload !== "object") return "";
  if (type === "hire_agent") {
    const bits = [payload.name, payload.role ?? payload.title].filter(Boolean);
    return bits.join(" · ");
  }
  if (typeof payload.summary === "string") return payload.summary.slice(0, 200);
  if (typeof payload.reason === "string") return payload.reason.slice(0, 200);
  return "";
}

/** Fetch pending interactions for the most recently-updated active issues. */
async function fetchPendingInteractions(companyId, issues) {
  const candidates = (issues ?? [])
    .filter((i) => ACTIVE_ISSUE_STATUSES.includes(i.status))
    .sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0))
    .slice(0, INTERACTION_SCAN_LIMIT);

  const found = await Promise.all(
    candidates.map(async (issue) => {
      const interactions = await safe(
        paperclipClient.listIssueInteractions(issue.id)
      );
      const pending = (interactions ?? []).filter(
        (it) => it.status === "pending"
      );
      return pending.map((interaction) => ({
        key: `${issue.id}:${interaction.id}`,
        issueId: issue.id,
        issueIdentifier: issue.identifier ?? null,
        issueTitle: issue.title,
        interaction,
      }));
    })
  );
  return found.flat();
}

export async function refreshBoardChannel() {
  const companyId = state.companyId;
  if (!companyId) return;

  setState({ loading: state.lastUpdated === null });

  const [approvals, badges, budget, costs] = await Promise.all([
    safe(paperclipClient.listApprovals(companyId)),
    safe(paperclipClient.getSidebarBadges(companyId)),
    safe(paperclipClient.getBudgetOverview(companyId)),
    safe(paperclipClient.getCostSummary(companyId)),
  ]);

  // Interactions need issue context; fall back to a direct fetch when the
  // caller didn't pass the store's snapshot.
  let issues = null;
  try {
    issues = await paperclipClient.listIssues(companyId);
  } catch {
    issues = [];
  }

  const interactions = await fetchPendingInteractions(
    companyId,
    Array.isArray(issues) ? issues : []
  );

  const activity = await safe(
    paperclipClient.listActivity(companyId, { limit: ACTIVITY_LIMIT })
  );

  const actionable = (approvals ?? []).filter((a) =>
    ["pending", "revision_requested"].includes(a.status)
  );

  setState({
    loading: false,
    error: approvals === null && badges === null ? "board channel offline" : null,
    approvals: actionable.map((a) => ({
      ...a,
      summary: summarizeApprovalPayload(a.type, a.payload),
    })),
    interactions,
    activity: Array.isArray(activity) ? activity : [],
    badges: badges ?? null,
    budget: budget ?? null,
    costs: costs ?? null,
    lastUpdated: Date.now(),
  });
}

// Debounced refresh so WS event storms don't hammer the API.
let refreshTimer = null;
export function scheduleBoardChannelRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshBoardChannel();
  }, 1200);
}

// Slow polling fallback for anything the WS doesn't announce.
let pollTimer = null;
function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    void refreshBoardChannel();
  }, POLL_MS);
}
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Called by paperclipStore whenever the active company changes. */
export function setBoardChannelCompany(companyId) {
  if (state.companyId === companyId && pollTimer) return;
  setState({ ...initialState, companyId });
  stopPolling();
  if (companyId) {
    startPolling();
    void refreshBoardChannel();
  }
}

// ── Board actions ────────────────────────────────────────

async function decideApproval(approvalId, decision, note) {
  const fn =
    decision === "approve"
      ? paperclipClient.approveApproval
      : decision === "reject"
        ? paperclipClient.rejectApproval
        : paperclipClient.requestApprovalRevision;
  const result = await fn(approvalId, note || undefined);
  await refreshBoardChannel();
  return result;
}

async function respondToInteraction(issueId, interactionId, answers, summaryMarkdown) {
  const result = await paperclipClient.respondIssueInteraction(
    issueId,
    interactionId,
    answers,
    summaryMarkdown
  );
  await refreshBoardChannel();
  return result;
}

async function rejectInteraction(issueId, interactionId, reason) {
  const result = await paperclipClient.rejectIssueInteraction(
    issueId,
    interactionId,
    reason
  );
  await refreshBoardChannel();
  return result;
}

async function dismissInboxItem(itemKey) {
  const { companyId } = state;
  if (!companyId) return;
  await safe(paperclipClient.createInboxDismissal(companyId, itemKey));
  await refreshBoardChannel();
}

// ── Public store ─────────────────────────────────────────

const actions = {
  refresh: refreshBoardChannel,
  decideApproval,
  respondToInteraction,
  rejectInteraction,
  dismissInboxItem,
};

export const boardChannelStore = {
  getState: () => ({ ...state }),
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setCompany: setBoardChannelCompany,
  ...actions,
};

export function useBoardChannelStore(selector) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => boardChannelStore.subscribe(force), []);
  return selector(boardChannelStore.getState());
}
