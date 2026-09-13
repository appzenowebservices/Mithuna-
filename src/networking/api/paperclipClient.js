const PAPERCLIP_API_BASE = "/api";

class PaperclipHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "PaperclipHttpError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const url = `${PAPERCLIP_API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PaperclipHttpError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

export class PaperclipClient {
  constructor() {
    this.companyId = null;
  }

  setCompanyId(id) {
    this.companyId = id;
  }

  // ── Companies ──────────────────────────────────────────
  listCompanies() {
    return request("/companies");
  }

  createCompany(name) {
    return request("/companies", { method: "POST", body: JSON.stringify({ name }) });
  }

  getCompany(id) {
    return request(`/companies/${id}`);
  }

  // ── Agents ─────────────────────────────────────────────
  async listAgents(companyId) {
    const cid = companyId ?? this.companyId;
    if (!cid) throw new Error("No company ID set");
    return request(`/companies/${cid}/agents`);
  }

  listAgentsByTeam(companyId, teamId) {
    return request(`/companies/${companyId}/teams/${teamId}/agents`);
  }

  hireAgent(companyId, data) {
    return request(`/companies/${companyId}/agents`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  fireAgent(companyId, agentId) {
    return request(`/companies/${companyId}/agents/${agentId}`, { method: "DELETE" });
  }

  // ── Teams ──────────────────────────────────────────────
  async listTeams(companyId) {
    const cid = companyId ?? this.companyId;
    if (!cid) throw new Error("No company ID set");
    return request(`/companies/${cid}/teams`);
  }

  createTeam(companyId, data) {
    return request(`/companies/${companyId}/teams`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateTeam(companyId, teamId, data) {
    return request(`/companies/${companyId}/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteTeam(companyId, teamId) {
    return request(`/companies/${companyId}/teams/${teamId}`, { method: "DELETE" });
  }

  // ── Projects ───────────────────────────────────────────
  async listProjects(companyId) {
    const cid = companyId ?? this.companyId;
    if (!cid) throw new Error("No company ID set");
    return request(`/companies/${cid}/projects`);
  }

  createProject(companyId, data) {
    return request(`/companies/${companyId}/projects`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getProject(companyId, projectId) {
    return request(`/companies/${companyId}/projects/${projectId}`);
  }

  updateProject(companyId, projectId, data) {
    return request(`/companies/${companyId}/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ── Goals ──────────────────────────────────────────────
  async listGoals(companyId) {
    const cid = companyId ?? this.companyId;
    if (!cid) throw new Error("No company ID set");
    return request(`/companies/${cid}/goals`);
  }

  createGoal(companyId, data) {
    return request(`/companies/${companyId}/goals`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ── Issues (Kanban) ────────────────────────────────────
  async listIssues(companyId, projectId) {
    const params = projectId ? `?projectId=${projectId}` : "";
    return request(`/companies/${companyId}/issues${params}`);
  }

  createIssue(companyId, data) {
    return request(`/companies/${companyId}/issues`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateIssueStatus(companyId, issueId, status) {
    return request(`/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  deleteIssue(companyId, issueId) {
    return request(`/issues/${issueId}`, { method: "DELETE" });
  }

  // ── Issue comments ─────────────────────────────────────
  listIssueComments(issueId, params = {}) {
    const qs = new URLSearchParams();
    if (params.order) qs.set("order", params.order);
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/issues/${issueId}/comments${suffix}`);
  }

  postIssueComment(issueId, body) {
    return request(`/issues/${issueId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  // ── Issue thread interactions (agent questions → board) ─
  listIssueInteractions(issueId) {
    return request(`/issues/${issueId}/interactions`);
  }

  respondIssueInteraction(issueId, interactionId, answers, summaryMarkdown) {
    return request(`/issues/${issueId}/interactions/${interactionId}/respond`, {
      method: "POST",
      body: JSON.stringify({ answers, summaryMarkdown: summaryMarkdown ?? null }),
    });
  }

  rejectIssueInteraction(issueId, interactionId, reason) {
    return request(`/issues/${issueId}/interactions/${interactionId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // ── Approvals (hire / strategy / budget requests) ──────
  listApprovals(companyId) {
    return request(`/companies/${companyId}/approvals`);
  }

  approveApproval(approvalId, decisionNote) {
    return request(`/approvals/${approvalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  }

  rejectApproval(approvalId, decisionNote) {
    return request(`/approvals/${approvalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  }

  requestApprovalRevision(approvalId, decisionNote) {
    return request(`/approvals/${approvalId}/request-revision`, {
      method: "POST",
      body: JSON.stringify({ decisionNote }),
    });
  }

  // ── Heartbeat runs (transcripts / live work) ───────────
  listRuns(companyId, params = {}) {
    const qs = new URLSearchParams();
    if (params.agentId) qs.set("agentId", params.agentId);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.summary) qs.set("summary", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/companies/${companyId}/heartbeat-runs${suffix}`);
  }

  getRun(runId) {
    return request(`/heartbeat-runs/${runId}`);
  }

  getRunLog(runId, offset = 0, limitBytes) {
    const qs = new URLSearchParams({ offset: String(offset) });
    if (limitBytes) qs.set("limitBytes", String(limitBytes));
    return request(`/heartbeat-runs/${runId}/log?${qs.toString()}`);
  }

  cancelRun(runId) {
    return request(`/heartbeat-runs/${runId}/cancel`, { method: "POST" });
  }

  // ── Activity feed ──────────────────────────────────────
  listActivity(companyId, params = {}) {
    const qs = new URLSearchParams();
    if (params.agentId) qs.set("agentId", params.agentId);
    if (params.entityType) qs.set("entityType", params.entityType);
    if (params.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/companies/${companyId}/activity${suffix}`);
  }

  // ── Budgets / costs ────────────────────────────────────
  getBudgetOverview(companyId) {
    return request(`/companies/${companyId}/budgets/overview`);
  }

  getCostSummary(companyId, params = {}) {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/companies/${companyId}/costs/summary${suffix}`);
  }

  // ── Board inbox badges + dismissals ────────────────────
  getSidebarBadges(companyId) {
    return request(`/companies/${companyId}/sidebar-badges`);
  }

  listInboxDismissals(companyId) {
    return request(`/companies/${companyId}/inbox-dismissals`);
  }

  createInboxDismissal(companyId, itemKey) {
    return request(`/companies/${companyId}/inbox-dismissals`, {
      method: "POST",
      body: JSON.stringify({ itemKey }),
    });
  }

  // ── Agent actions ──────────────────────────────────────
  wakeAgent(agentId, reason) {
    return request(`/agents/${agentId}/wakeup`, {
      method: "POST",
      body: JSON.stringify({
        source: "on_demand",
        triggerDetail: "manual",
        reason: reason ?? "Woken from the Mithuna board",
      }),
    });
  }

  // ── Health ─────────────────────────────────────────────
  async healthCheck() {
    try {
      await request("/health");
      return true;
    } catch {
      return false;
    }
  }
}

export const paperclipClient = new PaperclipClient();
