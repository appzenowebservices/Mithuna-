// src/ui/Panels/BoardChannelPanel.jsx
//
// The Board Channel — per-company action feed. Everything agents say / ask /
// request lands here for the player (the Board) to read and act on:
//   · approvals (hires, CEO strategy, budget overrides)  → decide inline
//   · agent questions mid-task (thread interactions)     → answer / reject
//   · recent activity                                     → ticker
// Backed by boardChannelStore (see networking/sync).

import { useState } from "react";
import { useBoardChannelStore, boardChannelStore } from "../../networking/sync/boardChannelStore";
import { usePaperclipStore } from "../../networking/sync/paperclipStore";

const APPROVAL_META = {
  hire_agent: { label: "HIRE", color: "#3b82f6" },
  approve_ceo_strategy: { label: "STRATEGY", color: "#a855f7" },
  budget_override_required: { label: "BUDGET", color: "#f59e0b" },
  request_board_approval: { label: "REVIEW", color: "#22c55e" },
};

const INTERACTION_LABEL = {
  ask_user_questions: "QUESTION",
  request_confirmation: "CONFIRM",
};

function requesterName(approval) {
  return approval.requestedByAgent?.name ?? approval.requestedByAgentName ?? null;
}

function ApprovalCard({ approval }) {
  const [busy, setBusy] = useState(false);
  const meta = APPROVAL_META[approval.type] ?? { label: approval.type, color: "#64748b" };

  const decide = async (decision) => {
    setBusy(true);
    try {
      await boardChannelStore.decideApproval(approval.id, decision);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bc-card">
      <div className="bc-card-head">
        <span className="bc-kind" style={{ background: meta.color }}>
          {meta.label}
        </span>
        <span className="bc-title" title={approval.summary}>
          {approval.summary || approval.type}
        </span>
      </div>
      <div className="bc-foot">
        <span className="bc-sub">
          {requesterName(approval) ? `from ${requesterName(approval)} · ` : ""}
          {approval.status === "revision_requested" ? "revision requested" : "needs decision"}
        </span>
        <span className="bc-actions">
          <button type="button" className="bc-btn bc-approve" disabled={busy} onClick={() => void decide("approve")}>
            ✓
          </button>
          <button type="button" className="bc-btn bc-revise" disabled={busy} onClick={() => void decide("revise")}>
            ↩
          </button>
          <button type="button" className="bc-btn bc-reject" disabled={busy} onClick={() => void decide("reject")}>
            ✕
          </button>
        </span>
      </div>
    </div>
  );
}

function InteractionCard({ item }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const interaction = item.interaction;
  const payload = interaction.payload ?? {};
  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  const toggleOption = (questionId, optionId, selectionMode) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { optionIds: [], otherText: "" };
      let optionIds;
      if (current.optionIds.includes(optionId)) {
        optionIds = current.optionIds.filter((id) => id !== optionId);
      } else if (selectionMode === "single") {
        optionIds = [optionId];
      } else {
        optionIds = [...current.optionIds, optionId];
      }
      return { ...prev, [questionId]: { ...current, optionIds } };
    });
  };

  const setOtherText = (questionId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? { optionIds: [] }), otherText: text },
    }));
  };

  const respond = async () => {
    setBusy(true);
    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        optionIds: answers[q.id]?.optionIds ?? [],
        otherText: answers[q.id]?.otherText || null,
      }));
      await boardChannelStore.respondToInteraction(
        item.issueId,
        interaction.id,
        payloadAnswers,
        "Answered from the Mithuna board"
      );
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await boardChannelStore.rejectInteraction(
        item.issueId,
        interaction.id,
        "Declined from the Mithuna board"
      );
    } finally {
      setBusy(false);
    }
  };

  const label =
    INTERACTION_LABEL[interaction.kind] ?? String(interaction.kind ?? "ASK").toUpperCase();

  return (
    <div className="bc-card bc-interaction">
      <div className="bc-card-head">
        <span className="bc-kind bc-kind-ask">{label}</span>
        <span className="bc-title">
          {item.issueIdentifier ? `${item.issueIdentifier} · ` : ""}
          {payload.title || item.issueTitle}
        </span>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="bc-question">
          <div className="bc-question-prompt">{q.prompt}</div>
          <div className="bc-options">
            {(q.options ?? []).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`bc-opt ${answers[q.id]?.optionIds.includes(opt.id) ? "bc-opt-on" : ""}`}
                onClick={() => toggleOption(q.id, opt.id, q.selectionMode)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            className="bc-other"
            placeholder="or type your own answer…"
            value={answers[q.id]?.otherText ?? ""}
            onChange={(e) => setOtherText(q.id, e.target.value)}
          />
        </div>
      ))}

      {questions.length === 0 && (
        <div className="bc-question-prompt">{payload.message ?? "The agent needs your input."}</div>
      )}

      <div className="bc-foot">
        <span className="bc-sub">{item.interaction.kind.replaceAll("_", " ")}</span>
        <span className="bc-actions">
          <button type="button" className="bc-btn bc-send" disabled={busy} onClick={() => void respond()}>
            RESPOND
          </button>
          <button type="button" className="bc-btn bc-reject" disabled={busy} onClick={() => void reject()}>
            DECLINE
          </button>
        </span>
      </div>
    </div>
  );
}

function formatCents(cents) {
  if (!Number.isFinite(cents)) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function actorLine(entry) {
  const who = entry.agentName ?? entry.actorType ?? "system";
  const what = String(entry.action ?? "").replaceAll("_", " ");
  return `${who} · ${what}`;
}

export function BoardChannelPanel() {
  const connected = usePaperclipStore((s) => s.connected);
  const { loading, approvals, interactions, activity, badges, costs } = useBoardChannelStore(
    (s) => s
  );

  if (!connected) return null;

  const inboxCount =
    (badges?.inbox ?? 0) > 0
      ? badges.inbox
      : approvals.length + interactions.length;

  return (
    <section className="panel board-channel-panel">
      <div className="panel-title">
        <span>Board Channel</span>
        <span className="title-dot">
          {inboxCount > 0 ? (
            <span className="bc-badge">{inboxCount}</span>
          ) : (
            "CLEAR"
          )}
        </span>
      </div>

      {costs && (
        <div className="bc-money">
          <span>SPEND</span>
          <b>{formatCents(costs.spendCents)}</b>
          <span className="bc-money-sep">/</span>
          <span>BUDGET {formatCents(costs.budgetCents)}</span>
          <span className={`bc-util ${costs.utilizationPercent >= 80 ? "hot" : ""}`}>
            {costs.utilizationPercent}%
          </span>
        </div>
      )}

      <div className="bc-feed">
        {!loading &&
          approvals.length === 0 &&
          interactions.length === 0 && (
            <div className="panel-empty">nothing waiting on the board</div>
          )}

        {approvals.map((a) => (
          <ApprovalCard key={a.id} approval={a} />
        ))}

        {interactions.map((item) => (
          <InteractionCard key={item.key} item={item} />
        ))}

        {activity.slice(0, 8).map((entry) => (
          <div key={entry.id} className="bc-ticker-line">
            {actorLine(entry)}
          </div>
        ))}
      </div>
    </section>
  );
}
