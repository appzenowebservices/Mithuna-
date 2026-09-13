import { usePaperclipStore } from "../../networking/sync/paperclipStore";

const STATUS_DOT = {
  idle: "#22c55e",
  paused: "#f59e0b",
  error: "#ef4444",
  terminated: "#6b7280",
  pending_approval: "#3b82f6",
};

function AgentRow({ agent }) {
  const color =
    typeof agent.adapterConfig?.color === "string"
      ? agent.adapterConfig.color
      : "#7c3aed";
  const dot = STATUS_DOT[agent.status] || STATUS_DOT.idle;

  return (
    <div className="agent-row">
      <span className="agent-avatar" style={{ background: color }}>
        {agent.name.charAt(0).toUpperCase()}
      </span>
      <div className="agent-meta">
        <span className="agent-name">{agent.name}</span>
        <span className="agent-role">
          {agent.role} · {agent.title}
        </span>
      </div>
      <span className="agent-status" style={{ color: dot }} title={agent.status}>
        ●
      </span>
    </div>
  );
}

export function AgentsPanel() {
  const connected = usePaperclipStore((s) => s.connected);
  const company = usePaperclipStore((s) => s.company);
  const agents = usePaperclipStore((s) => s.agents);
  const project = usePaperclipStore((s) => s.project);
  const issues = usePaperclipStore((s) => s.issues);

  return (
    <section className="panel">
      <div className="panel-title">
        <span>Paperclip // Agents</span>
        <span className="title-dot" style={{ color: connected ? "var(--accent-green)" : "var(--status-err)" }}>
          {connected ? "LINKED" : "OFFLINE"}
        </span>
      </div>

      <div className="vital">
        <span>COMPANY</span>
        <b className={connected ? "ok" : ""}>{company ? company.name : "—"}</b>
      </div>
      <div className="vital">
        <span>PROJECT</span>
        <b>{project ? project.name : "—"}</b>
      </div>
      <div className="vital">
        <span>AGENTS</span>
        <b>{agents.length}</b>
      </div>
      <div className="vital">
        <span>ISSUES</span>
        <b>{issues.length}</b>
      </div>

      <div className="agent-list">
        {agents.length === 0 && (
          <div className="panel-empty">no agents linked</div>
        )}
        {agents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
