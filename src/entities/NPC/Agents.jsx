import { useMemo } from "react";
import { usePaperclipStore } from "../../networking/sync/paperclipStore";
import {
  buildAgentSystemFromProject,
  buildAgentSystemFromTeam,
  getAllAgents,
} from "../../data/agentic";
import { Agent } from "./Agent";

export function Agents() {
  const connected = usePaperclipStore((s) => s.connected);
  const agents = usePaperclipStore((s) => s.agents);
  const teams = usePaperclipStore((s) => s.teams);
  const project = usePaperclipStore((s) => s.project);

  // One agent-system per company unit: the active project, or every team when
  // no project is selected. Each system becomes a colored team zone in-world.
  const systems = useMemo(() => {
    if (!connected) return [];
    if (project) return [buildAgentSystemFromProject(project, agents)];
    if (teams.length > 0) {
      return teams.map((team, i) => buildAgentSystemFromTeam(team, agents, i));
    }
    return [];
  }, [connected, project, teams, agents]);

  const nodes = useMemo(() => {
    const seen = new Set();
    return systems.flatMap((system, zoneIndex) =>
      getAllAgents(system)
        .filter((node) => {
          if (seen.has(node.id)) return false;
          seen.add(node.id);
          return true;
        })
        .map((node) => ({
          ...node,
          teamIndex: zoneIndex,
          teamColor: system.color ?? node.color,
          teamName: system.teamName ?? null,
        }))
    );
  }, [systems]);

  if (nodes.length === 0) return null;

  return (
    <>
      {nodes.map((node) => (
        <Agent key={node.id} node={node} />
      ))}
    </>
  );
}
