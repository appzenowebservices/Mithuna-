# Simulation

The simulation owns the world.

Rendering serves only as a visualization layer — it does not drive simulation logic.

Entities exist as independent units of state.

Systems evolve entities by processing their components over time.

The Engine orchestrates all subsystems, mediating interactions and maintaining the simulation lifecycle.

---------------------------------------
Everything in Mithuna belongs to one of five categories.    

Simulation
The brain.

Systems
How the world evolves.

Entities
What exists.

Rendering
How the world is visualized.

Infrastructure
How data enters and leaves the simulation.


---------------------------------------
The mineral world, after billions of years, eventually learned to think through biology, and biology is now teaching minerals to think directly through silicon.
---------------------------------------
Reality
↓
Signal
↓
Data
↓
Information
↓
Knowledge
↓
Archetype
↓
Decision
↓
Action
↓
Reality
---------------------------------------

## Architecture

Mithuna Engine is the **visual reflex** of a three-part agent company:

| Pillar | Role | Location |
| --- | --- | --- |
| hermes-agent | Executor / brain. Runs the HTTP server on `:8765` (`hermes_server.py`). | `../hermes-agent` |
| paperclip | Control plane. Authoritative domain FSM (agents, issues, runs) on `:3100`. | `../paperclip` |
| **Mithuna Engine** | **Body and face.** Renders agents and reflects paperclip state. Decides how to *show* work, never what work to do. | this repo |

Mithuna subscribes to paperclip's company live-event stream (`/api/companies/:id/events/ws`) and to its REST API. Domain state flows **one way**:

```
paperclip events/API
   → paperclipStore  (snapshot: agentStatus, issueStatusByAgent, presence)
   → IntentResolver  (deterministic: status+issue ⇒ intent)
   → CharacterStateMachine + Animation/Expression drivers
   → rendered agent movement / pose / ring / label
```

Intent resolution is deterministic and pure (`src/simulation/intent/IntentResolver.js`): e.g. `in_progress` ⇒ `GO_TO_DESK`, `in_review` ⇒ `GO_TO_BOARDROOM`, `done` ⇒ `RETURN_TO_SPAWN`, `blocked` ⇒ `HOLD`, `running` ⇒ `WORK_TALK`. Directed intents cancel free wander; `IDLE` leaves the agent to NpcAgentDriver-style autonomy (wander, sit, wave/happy/look_around reactions).

### Degradation by design

Capabilities are probed from the loaded model (`capabilities.js`). The current `player.glb` has only a `walk` clip and no morph targets, so every non-walk state falls back to `walk`/`idle` and facial expressions become no-ops — the status ring + name bubble remain the source of truth. Nothing breaks when a clip or a face is missing.

### Running locally

```sh
# 1. paperclip (control plane) — its own repo, port 3100
cd ../paperclip && pnpm dev

# 2. hermes (executor) — HTTP server, port 8765
cd ../hermes-agent && env/Scripts/python.exe hermes_server.py
#   optional presence telemetry (reports agent.presence live events):
#   set PAPERCLIP_COMPANY_ID + PAPERCLIP_AGENT_ID (and optionally
#   PAPERCLIP_AGENT_API_KEY / PAPERCLIP_BASE_URL) before starting.

# 3. Mithuna Engine (client) — Vite dev server (default port 3000)
npm run dev
```

The Vite server proxies `/api` and the live-event socket to paperclip. Open the app, pick a company with agents/issues, and watch the characters walk to desks, boardrooms, and spawn points as issue statuses change. `agent.presence` (reported by hermes) dims agents that go offline.

---------------------------------------

Reality
↓
Signal
↓
Data
↓
Information
↓
Knowledge
↓
Archetype
↓
Decision
↓
Action
↓
Reality
---------------------------------------
