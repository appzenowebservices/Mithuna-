import { useEffect, useReducer } from "react";
import { paperclipClient } from "../api/paperclipClient";
import { paperclipEvents } from "../websocket/paperclipEvents";
import { resolveIntents, pickActiveIssueStatus } from "../../simulation/intent/IntentResolver";
import {
  setBoardChannelCompany,
  scheduleBoardChannelRefresh,
} from "./boardChannelStore";

const initialState = {
  connected: false,
  companies: [],
  company: null,
  agents: [],
  teamAgents: [],
  projects: [],
  goals: [],
  teams: [],
  project: null,
  currentProjectId: null,
  issues: [],
  agentStatus: {},
  issueStatusByAgent: {},
  intents: {},
  presence: {},
  runProgress: {},
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

/**
 * Rebuild the deterministic domain snapshot (per-agent status + active issue
 * status) from the fetched lists, then resolve character intents from it.
 */
function recomputeSnapshot() {
  const agentStatus = {};
  for (const a of state.agents) {
    if (a?.id) agentStatus[a.id] = a.status ?? "idle";
  }

  const statusesByAgent = {};
  for (const issue of state.issues) {
    const assignee = issue.assigneeAgentId;
    if (!assignee || !issue.status) continue;
    (statusesByAgent[assignee] ??= []).push(issue.status);
  }

  const issueStatusByAgent = {};
  for (const id in statusesByAgent) {
    issueStatusByAgent[id] = pickActiveIssueStatus(statusesByAgent[id]);
  }

  const intents = resolveIntents(state.agents, { agentStatus, issueStatusByAgent });
  setState({ agentStatus, issueStatusByAgent, intents });
}

async function fetchAgents() {
  const { company } = state;
  if (!company) return;
  try {
    const agents = await paperclipClient.listAgents(company.id);
    setState({ agents });
    recomputeSnapshot();
  } catch {
    // keep existing
  }
}

async function fetchTeamAgents(teamId) {
  const { company } = state;
  if (!company) return;
  try {
    const teamAgents = await paperclipClient.listAgentsByTeam(company.id, teamId);
    setState({ teamAgents });
  } catch {
    // keep existing
  }
}

async function fetchTeams() {
  const { company } = state;
  if (!company) return;
  try {
    const teams = await paperclipClient.listTeams(company.id);
    setState({ teams });
  } catch {
    // keep existing
  }
}

async function fetchProjects() {
  const { company, currentProjectId } = state;
  if (!company) return;
  try {
    const projects = await paperclipClient.listProjects(company.id);
    const nextProjectId =
      currentProjectId && projects.some((p) => p.id === currentProjectId)
        ? currentProjectId
        : projects[0]?.id ?? null;
    const activeProject = nextProjectId
      ? projects.find((p) => p.id === nextProjectId) ?? projects[0] ?? null
      : null;
    setState({ projects, project: activeProject, currentProjectId: nextProjectId });
    if (activeProject) await fetchIssues();
  } catch {
    // keep existing
  }
}

async function fetchGoals() {
  const { company } = state;
  if (!company) return;
  try {
    const goals = await paperclipClient.listGoals(company.id);
    setState({ goals });
  } catch {
    // keep existing
  }
}

async function fetchIssues() {
  const { company, project } = state;
  if (!company) return;
  try {
    const issues = await paperclipClient.listIssues(company.id, project?.id);
    setState({ issues });
    recomputeSnapshot();
  } catch {
    // keep existing
  }
}

async function connect(companyName) {
  try {
    const ok = await paperclipClient.healthCheck();
    if (!ok) {
      setState({ connected: false });
      return;
    }

    const companies = await paperclipClient.listCompanies();
    let company =
      companies.find((c) => c.name === companyName) ?? companies[0] ?? null;

    if (!company) {
      company = await paperclipClient.createCompany(companyName ?? "Mithuna");
    }

    paperclipClient.setCompanyId(company.id);
    setState({ companies, company, connected: true });

    paperclipEvents.connect(company.id);
    setBoardChannelCompany(company.id);
    await Promise.all([fetchTeams(), fetchProjects(), fetchAgents(), fetchGoals()]);
  } catch {
    setState({ connected: false });
  }
}

async function fetchCompanies() {
  try {
    const companies = await paperclipClient.listCompanies();
    const current = state.company;
    const next =
      current && companies.some((c) => c.id === current.id)
        ? current
        : companies[0] ?? null;
    setState({ companies, company: next });
    if (next && next.id !== current?.id) {
      paperclipClient.setCompanyId(next.id);
      setBoardChannelCompany(next.id);
      await Promise.all([fetchAgents(), fetchProjects(), fetchGoals(), fetchIssues(), fetchTeams()]);
    }
  } catch {
    setState({ companies: [] });
  }
}

async function setActiveCompany(companyId) {
  const { companies } = state;
  const company = companies.find((c) => c.id === companyId) ?? null;
  if (!company) return;

  paperclipClient.setCompanyId(company.id);
  setState({
    company,
    project: null,
    currentProjectId: null,
    agents: [],
    projects: [],
    goals: [],
    issues: [],
    teams: [],
    agentStatus: {},
    issueStatusByAgent: {},
    intents: {},
    presence: {},
    runProgress: {},
  });
  paperclipEvents.connect(company.id);
  setBoardChannelCompany(company.id);
  await Promise.all([fetchAgents(), fetchProjects(), fetchGoals(), fetchIssues(), fetchTeams()]);
}

async function setActiveProject(projectId) {
  const { projects } = state;
  const project = projects.find((p) => p.id === projectId) ?? null;
  if (!project) return;
  setState({ project, currentProjectId: project.id });
  await fetchIssues();
}

async function createIssue(title, description, assigneeAgentId, priority) {
  const { company, project } = state;
  if (!company) return null;
  try {
    const issue = await paperclipClient.createIssue(company.id, {
      title,
      description: description ?? "",
      projectId: project?.id ?? null,
      assigneeAgentId: assigneeAgentId ?? null,
      status: "todo",
      ...(priority ? { priority } : {}),
    });
    await fetchIssues();
    scheduleBoardChannelRefresh();
    return issue;
  } catch {
    return null;
  }
}

async function updateIssueStatus(issueId, status) {
  const { company } = state;
  if (!company) return;
  try {
    await paperclipClient.updateIssueStatus(company.id, issueId, status);
    await fetchIssues();
    scheduleBoardChannelRefresh();
  } catch {
    // keep existing
  }
}

async function deleteIssue(issueId) {
  const { company } = state;
  if (!company) return;
  try {
    await paperclipClient.deleteIssue(company.id, issueId);
    await fetchIssues();
  } catch {
    // keep existing
  }
}

async function startProject(name) {
  const { company } = state;
  if (!company) return;
  try {
    const project = await paperclipClient.createProject(company.id, {
      name,
      metadata: {
        color: "#7c3aed",
        outputType: "text",
        positions: {},
      },
    });

    const leadAgent = await paperclipClient.hireAgent(company.id, {
      name: `${name} Lead`,
      role: "lead",
      title: "Lead Agent",
      adapterType: "hermes_http",
      adapterConfig: { color: "#7c3aed", index: 1 },
    });

    const updatedProject = await paperclipClient.updateProject(company.id, project.id, {
      leadAgentId: leadAgent.id,
      metadata: { color: "#7c3aed", positions: { [leadAgent.id]: { x: 0, y: 130 } } },
    });

    setState({
      project: updatedProject,
      currentProjectId: updatedProject.id,
      projects: [updatedProject, ...state.projects.filter((p) => p.id !== updatedProject.id)],
    });
    await Promise.all([fetchAgents(), fetchProjects(), fetchIssues()]);
  } catch {
    // keep existing
  }
}

const TERMINAL_RUN_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "skipped",
  "timeout",
]);

function applyRunEvent(type, payload) {
  if (!payload?.agentId) return;
  const runProgress = { ...state.runProgress };

  if (type === "heartbeat.run.progress") {
    runProgress[payload.agentId] = {
      runId: payload.runId,
      issueId: payload.issueId ?? null,
      phase: payload.phase ?? null,
      message: payload.message ?? null,
      updatedAt: payload.updatedAt ?? null,
    };
  } else if (type === "heartbeat.run.status") {
    if (!payload.agentId) return;
    if (payload.status === "running") {
      runProgress[payload.agentId] = {
        runId: payload.runId,
        issueId: null,
        phase: null,
        message: null,
        updatedAt: payload.startedAt ?? null,
      };
    } else if (TERMINAL_RUN_STATUSES.has(payload.status)) {
      delete runProgress[payload.agentId];
    }
  } else {
    return;
  }
  setState({ runProgress });
}

function subscribeToEvents() {
  const { company } = state;
  if (!company) return () => {};

  paperclipEvents.connect(company.id);

  const refetchByEvent = (event) => {
    const type = event.type;
    const payload = event.data ?? event.payload ?? {};
    if (type.startsWith("heartbeat.run.")) {
      applyRunEvent(type, payload);
    }
    if (type === "agent.presence") {
      const { agentId, state } = payload;
      if (agentId && state) {
        setState({ presence: { ...state.presence, [agentId]: state } });
      }
    } else if (type === "agent.status") {
      const { agentId, status } = payload;
      if (agentId && status) {
        setState({ agentStatus: { ...state.agentStatus, [agentId]: status } });
        const intents = resolveIntents(state.agents, {
          agentStatus: { ...state.agentStatus, [agentId]: status },
          issueStatusByAgent: state.issueStatusByAgent,
        });
        setState({ intents });
        if (status !== "running" && state.runProgress[agentId]) {
          const runProgress = { ...state.runProgress };
          delete runProgress[agentId];
          setState({ runProgress });
        }
      }
      fetchAgents();
    } else if (type.startsWith("issue.") || type === "activity.logged") {
      fetchIssues();
      scheduleBoardChannelRefresh();
    } else if (type.startsWith("agent.")) {
      fetchAgents();
      scheduleBoardChannelRefresh();
    } else if (type.startsWith("heartbeat.run.")) {
      fetchAgents();
      fetchIssues();
      scheduleBoardChannelRefresh();
    }
  };

  return paperclipEvents.on("*", refetchByEvent);
}

function reset() {
  setState({ ...initialState });
}

const actions = {
  connect,
  fetchCompanies,
  setActiveCompany,
  setActiveProject,
  fetchAgents,
  fetchTeamAgents,
  fetchTeams,
  fetchProjects,
  fetchGoals,
  fetchIssues,
  createIssue,
  updateIssueStatus,
  deleteIssue,
  startProject,
  subscribeToEvents,
  reset,
};

export const paperclipStore = {
  getState: () => ({ ...state, ...actions }),
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  ...actions,
};

export function usePaperclipStore(selector) {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => paperclipStore.subscribe(force), []);
  return selector(paperclipStore.getState());
}
