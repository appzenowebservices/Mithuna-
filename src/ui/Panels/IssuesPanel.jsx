// src/ui/Panels/IssuesPanel.jsx
//
// The boss board: create tasks, steer statuses, sign off reviews.
// Every action hits the real Paperclip API through paperclipStore.

import { useEffect, useState } from "react";
import { usePaperclipStore } from "../../networking/sync/paperclipStore";
import { useUiActionStore, uiActionStore } from "./uiActionStore";

const STATUS_BADGE = {
  backlog: "#64748b",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#a855f7",
  blocked: "#ef4444",
  done: "#22c55e",
  cancelled: "#6b7280",
};

const PRIORITIES = ["low", "medium", "high", "urgent"];

function IssueRow({ issue }) {
  const agents = usePaperclipStore((s) => s.agents);
  const updateIssueStatus = usePaperclipStore((s) => s.updateIssueStatus);
  const deleteIssue = usePaperclipStore((s) => s.deleteIssue);
  const assignee = issue.assigneeAgentId
    ? agents.find((a) => a.id === issue.assigneeAgentId)?.name
    : null;
  const badge = STATUS_BADGE[issue.status] || STATUS_BADGE.backlog;
  const [busy, setBusy] = useState(false);

  const move = async (status) => {
    setBusy(true);
    try {
      await updateIssueStatus(issue.id, status);
    } finally {
      setBusy(false);
    }
  };

  const terminal = issue.status === "done" || issue.status === "cancelled";

  return (
    <div className="issue-row">
      <span className="issue-title" title={issue.description || issue.title}>
        {issue.title}
      </span>
      <div className="issue-foot">
        <span className="status-badge" style={{ background: badge }}>
          {issue.status}
        </span>
        {assignee && <span className="issue-assignee">→ {assignee}</span>}
        <span className="issue-actions">
          {!terminal && issue.status !== "in_review" && (
            <button
              type="button"
              className="bc-btn bc-approve"
              disabled={busy}
              title="Move to in_progress"
              onClick={() => void move("in_progress")}
            >
              ▶
            </button>
          )}
          {issue.status === "in_review" && (
            <>
              <button
                type="button"
                className="bc-btn bc-approve"
                disabled={busy}
                title="Approve review — mark done"
                onClick={() => void move("done")}
              >
                ✓ SHIP
              </button>
              <button
                type="button"
                className="bc-btn bc-revise"
                disabled={busy}
                title="Request changes — back to work"
                onClick={() => void move("in_progress")}
              >
                ↩
              </button>
            </>
          )}
          {issue.status === "blocked" && (
            <button
              type="button"
              className="bc-btn bc-send"
              disabled={busy}
              title="Unblock — back to todo"
              onClick={() => void move("todo")}
            >
              ⨯⛔
            </button>
          )}
          {!terminal && (
            <button
              type="button"
              className="bc-btn bc-reject"
              disabled={busy}
              title="Delete task"
              onClick={() => void move("cancelled")}
            >
              🗑
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

function NewTaskForm({ initialAssignee, onDone }) {
  const agents = usePaperclipStore((s) => s.agents);
  const createIssue = usePaperclipStore((s) => s.createIssue);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeAgentId, setAssigneeAgentId] = useState(initialAssignee?.id ?? "");
  const [priority, setPriority] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await createIssue(
        title.trim(),
        description.trim(),
        assigneeAgentId || null,
        priority || null
      );
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="new-task-form">
      <input
        className="nt-title"
        placeholder="what needs to happen?"
        value={title}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
      />
      <textarea
        className="nt-desc"
        placeholder="context / acceptance criteria (optional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="nt-row">
        <select
          className="nt-select"
          value={assigneeAgentId}
          onChange={(e) => setAssigneeAgentId(e.target.value)}
        >
          <option value="">auto-assign (team lead)</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.role}
            </option>
          ))}
        </select>
        <select
          className="nt-select nt-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">priority…</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="nt-row">
        <button type="button" className="chat-send" onClick={() => void submit()} disabled={busy || !title.trim()}>
          ASSIGN
        </button>
        <button type="button" className="bc-btn" onClick={onDone}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

export function IssuesPanel() {
  const connected = usePaperclipStore((s) => s.connected);
  const issues = usePaperclipStore((s) => s.issues);
  const assignRequest = useUiActionStore((s) => s.assignToAgent);
  const [creating, setCreating] = useState(false);
  const [initialAssignee, setInitialAssignee] = useState(null);

  useEffect(() => {
    if (assignRequest) {
      setInitialAssignee(uiActionStore.consumeAssignTask());
      setCreating(true);
    }
  }, [assignRequest]);

  return (
    <section className="panel">
      <div className="panel-title">
        <span>Issues // Board</span>
        <span className="title-dot">
          {creating ? (
            "NEW"
          ) : (
            <button type="button" className="bc-btn bc-send" onClick={() => setCreating(true)}>
              + TASK
            </button>
          )}
        </span>
      </div>

      {creating && (
        <NewTaskForm
          initialAssignee={initialAssignee}
          onDone={() => {
            setCreating(false);
            setInitialAssignee(null);
          }}
        />
      )}

      <div className="issue-list">
        {!connected && <div className="panel-empty">paperclip offline</div>}
        {connected && issues.length === 0 && !creating && (
          <div className="panel-empty">no issues</div>
        )}
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}
