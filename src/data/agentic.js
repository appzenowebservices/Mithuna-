export const USER_ID = "user";
export const USER_NAME = "User";
export const DEFAULT_AGENTIC_SET_ID = "single-agent";

export const DEFAULT_MODELS = {
  text: "poolside/laguna-xs.2:free",
  image: "google/gemini-2.5-flash-image-preview",
  music: "lyria",
  video: "veo-3.1",
};

export const DEFAULT_COLOR = "#7c3aed";

function resolveVisualConfig(agent) {
  const adapterConfig = agent.adapterConfig ?? {};
  return (
    (adapterConfig.visualConfig ?? adapterConfig.metadata?.visualConfig) ?? {}
  );
}

function buildAutoPosition(depth, siblingIndex, siblingCount) {
  const baseY = 130 + depth * 150;
  if (siblingCount <= 1) return { x: 0, y: baseY };
  const spacing = 260;
  const x = (siblingIndex - (siblingCount - 1) / 2) * spacing;
  return { x, y: baseY };
}

function buildNode(agent, depth = 0, siblingIndex = 0, siblingCount = 1, agents = []) {
  const visualConfig = resolveVisualConfig(agent);
  const color =
    typeof visualConfig.color === "string"
      ? visualConfig.color
      : typeof agent.adapterConfig?.color === "string"
        ? agent.adapterConfig.color
        : DEFAULT_COLOR;

  const node = {
    id: agent.id,
    index: typeof visualConfig.index === "number" ? visualConfig.index : depth + 1,
    name: agent.name,
    description: `${agent.role} • ${agent.title}`,
    color,
    model: DEFAULT_MODELS.text,
    status: agent.status,
    position: buildAutoPosition(depth, siblingIndex, siblingCount),
  };

  const children = agents.filter((child) => child.reportsTo === agent.id);
  if (children.length > 0) {
    node.subagents = children.map((child, childIndex) =>
      buildNode(child, depth + 1, childIndex, children.length, agents)
    );
  }
  return node;
}

export function buildAgentSystemFromProject(project, agents = []) {
  const leadAgent =
    agents.find((a) => a.id === project.leadAgentId) ||
    agents.find((a) => a.reportsTo === null) ||
    agents[0] ||
    null;

  const leadNode = leadAgent
    ? buildNode(leadAgent, 0, 0, 1, agents)
    : {
        id: `project-${project.id}`,
        index: 1,
        name: project.name,
        description: "Paperclip project lead agent",
        color: project.metadata?.color ?? DEFAULT_COLOR,
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 130 },
      };

  return {
    id: project.id,
    teamName: project.name,
    teamType: "Paperclip Project",
    teamDescription: `${project.name} team derived from Paperclip project data.`,
    color: project.metadata?.color ?? leadNode.color,
    outputType: project.metadata?.outputType ?? "text",
    outputModel: project.metadata?.outputModel ?? DEFAULT_MODELS.text,
    outputAutoApprove: project.metadata?.outputAutoApprove ?? true,
    user: { index: 0, model: "Human", position: { x: 0, y: 0 } },
    leadAgent: leadNode,
  };
}

export function buildAgentSystemFromTeam(team, agents = [], zoneIndex = 0) {
  const leadAgent =
    agents.find((a) => a.id === team.leadAgentId) ||
    agents.find((a) => a.reportsTo === null) ||
    agents[0] ||
    null;

  const teamColor = team.color ?? DEFAULT_COLOR;

  const leadNode = leadAgent
    ? buildNode(leadAgent, 0, 0, 1, agents)
    : {
        id: `team-${team.id}`,
        index: 1,
        name: team.name,
        description: "Paperclip team lead",
        color: teamColor,
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 130 },
      };

  return {
    id: `team_${team.id}`,
    zoneIndex,
    teamName: team.name,
    teamType: "Paperclip Team",
    teamDescription: team.description || `${team.name} team agent configuration.`,
    color: teamColor,
    outputType: "text",
    outputModel: DEFAULT_MODELS.text,
    outputAutoApprove: true,
    user: { index: 0, model: "Human", position: { x: 0, y: 0 } },
    leadAgent: leadNode,
  };
}

export function getAllAgents(system) {
  const agents = [];
  const traverse = (node) => {
    agents.push(node);
    if (node.subagents) node.subagents.forEach(traverse);
  };
  traverse(system.leadAgent);
  return agents;
}

export function getAllCharacters(system) {
  const userNode = {
    id: USER_ID,
    index: system.user.index,
    name: USER_NAME,
    color: "#111827",
    model: system.user.model,
    description: "Human user issuing commands.",
  };
  return [userNode, ...getAllAgents(system)];
}
