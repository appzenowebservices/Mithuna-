// src/entities/NPC/AgentController.js
//
// Movement + state-machine driver for a single NPC agent.
// Movement is straight-line steering to a target (Rapier/steering based world).
// The CharacterStateMachine decides which animation/expression to show based on
// whether the agent is moving, arrived, or busy in a fixed state.
//
// Autonomy (ported logic from the-delegation's NpcAgentDriver) applies only
// when the agent is in free-wander mode (no directed intent) and resting in a
// stable state: it periodically wanders, plays a short reaction (wave/happy/
// look_around), or sits for a while.

import * as THREE from "three";
import { AGENT_CONFIG } from "./AgentConfig";
import { agentRuntime } from "./agentRuntime";
import { CharacterStateMachine } from "../../simulation/behavior/CharacterStateMachine";
import {
  getDeskPosition,
  getSpawnPosition,
  getBoardroomPosition,
  getTeamDeskPosition,
  getTeamDoorway,
  getTeamDeskFacing,
} from "../../world/layout/poiLayout";
import { sampleOfficeWanderTarget } from "../../systems/Navigation/NavMesh";

const REACTIONS = ["look_around", "wave", "happy"];
const SEATED_STATES = ["sit_idle", "sit_work", "sit_type", "sit_phone", "whiteboard_talk"];

export function getAgentRuntime(agentId) {
  let rt = agentRuntime.get(agentId);
  if (!rt) {
    rt = {
      fsm: new CharacterStateMachine("idle"),
      targetX: null,
      targetZ: null,
      arrivalState: "idle",
      autoWander: true,
      // Autonomy timer + busy-transition latch (NpcAgentDriver port).
      behaviorTimer: Math.random() * 5 + 2,
      wasBusy: false,
      // Two-leg room routing: when set, walk here first, then continue.
      viaPoint: null,
      // Y-rotation to hold while seated at an anchored desk (null = free).
      deskFacing: null,
      // Visual reflex flags resolved by the renderer each frame.
      speakRequested: false,
      listenRequested: false,
      // Chat focus: while the user is talking to this agent it holds still,
      // faces the player and plays pay_attention instead of wandering.
      chatFocus: false,
      kind: null,
      // Injected lazily by the Agent component once its model is ready.
      animDriver: null,
      expressionDriver: null,
      driver: null,
    };
    agentRuntime.set(agentId, rt);
  }
  return rt;
}

/** Direct the agent to walk to a world position, then settle into a state. */
export function setAgentTarget(rt, x, z, arrivalState = "idle") {
  rt.targetX = x;
  rt.targetZ = z;
  rt.arrivalState = arrivalState;
  rt.arrived = false;
}

export function pickNewTarget(rt) {
  rt.viaPoint = null;
  rt.deskFacing = null;
  // Prefer office-bounded wander when a team room is anchored (LIFE)
  const office = sampleOfficeWanderTarget();
  if (office) {
    setAgentTarget(rt, office.x, office.z, "idle");
    return;
  }
  const angle = Math.random() * Math.PI * 2;
  const radius = 5 + Math.random() * (AGENT_CONFIG.WANDER_RADIUS - 5);
  setAgentTarget(rt, Math.cos(angle) * radius, Math.sin(angle) * radius, "idle");
}

/** Lock the agent into chat focus: stop wandering, hold pay_attention, face the player. */
export function enterChatFocus(rt) {
  rt.chatFocus = true;
  rt.autoWander = false;
  rt.targetX = null;
  rt.targetZ = null;
  rt.viaPoint = null;
}

/** Release chat focus and let the agent go back to its normal autonomous flow. */
export function exitChatFocus(rt) {
  rt.chatFocus = false;
  rt.autoWander = true;
  rt.targetX = null;
  rt.targetZ = null;
  if (rt.driver && rt.fsm.getState() === "pay_attention") {
    rt.fsm.transition(rt.arrivalState || "idle", rt.driver);
  }
}

/** Weighted autonomous decision taken while resting in free-wander mode. */
function decideNextAction(rt) {
  const rand = Math.random();
  const seated = SEATED_STATES.includes(rt.arrivalState);

  if (seated) {
    // ~15% stay seated and keep working/idle for a while.
    if (rand < 0.15) {
      rt.behaviorTimer = Math.random() * 15 + 15;
      return;
    }
    // Otherwise stand up and wander (never sit again immediately).
    rt.arrivalState = "idle";
    pickNewTarget(rt);
    rt.behaviorTimer = 1;
    return;
  }

  // Standing: 40% wander nearby, 30% wander further, 30% short reaction.
  if (rand < 0.7) {
    pickNewTarget(rt);
    rt.behaviorTimer = 1;
  } else {
    const action = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    if (rt.driver && rt.fsm.getState() !== "walk") {
      rt.fsm.transition(action, rt.driver);
    }
    rt.behaviorTimer = Math.random() * 5 + 5;
  }
}

/**
 * Advance the agent for one frame.
 * @param {THREE.Object3D} group  the agent's root object (position/rotation).
 * @param {string} agentId
 * @param {number} delta
 * @param {object} driver  the renderer adapter (setAnimation/setExpression/...).
 * @param {{x:number, z:number}} faceTarget  player position while chatting.
 */
export function updateAgent(group, agentId, delta, driver, faceTarget = null) {
  if (!group) return;

  const rt = getAgentRuntime(agentId);
  const fsm = rt.fsm;

  // Chat focus: hold still, face the player, play pay_attention. No walking.
  if (rt.chatFocus) {
    if (faceTarget) {
      const dx = faceTarget.x - group.position.x;
      const dz = faceTarget.z - group.position.z;
      if (Math.hypot(dx, dz) > 0.01) {
        const targetRotation = Math.atan2(dx, dz);
        group.rotation.y = THREE.MathUtils.lerp(
          group.rotation.y,
          targetRotation,
          Math.min(1, delta * AGENT_CONFIG.TURN_SPEED)
        );
      }
    }
    if (driver && rt.driver) {
      if (fsm.getState() !== "pay_attention") {
        fsm.transition("pay_attention", rt.driver);
      }
      fsm.update(delta, rt.driver);
    }
    return;
  }

  if (rt.targetX === null || rt.targetZ === null) {
    pickNewTarget(rt);
  }

  // Two-leg room routing: reached the doorway, continue to the actual desk.
  if (rt.viaPoint && rt.arrived) {
    const next = rt.viaPoint;
    rt.viaPoint = null;
    setAgentTarget(rt, next.x, next.z, rt.arrivalState);
    return;
  }

  const dx = rt.targetX - group.position.x;
  const dz = rt.targetZ - group.position.z;
  const dist = Math.hypot(dx, dz);

  let moving = false;

  if (dist > AGENT_CONFIG.ARRIVE_DIST) {
    moving = true;
    const speed = AGENT_CONFIG.WALK_SPEED;
    const nx = dx / dist;
    const nz = dz / dist;

    group.position.x += nx * speed * delta;
    group.position.z += nz * speed * delta;

    const targetRotation = Math.atan2(nx, nz);
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      targetRotation,
      Math.min(1, delta * AGENT_CONFIG.TURN_SPEED)
    );
  } else {
    if (!rt.arrived) {
      rt.arrived = true;
      rt.behaviorTimer = 0.5 + Math.random() * 2;
    }
    // Anchored desks: hold the authored facing while seated so the agent
    // lines up with the auto chair/desk props.
    if (
      rt.deskFacing !== null &&
      rt.arrivalState === "sit_work" &&
      fsm.getState() !== "walk"
    ) {
      group.rotation.y = THREE.MathUtils.lerp(
        group.rotation.y,
        rt.deskFacing,
        Math.min(1, delta * AGENT_CONFIG.TURN_SPEED)
      );
    }
    if (rt.autoWander && !rt.speakRequested && !rt.listenRequested) {
      rt.behaviorTimer -= delta;
      if (rt.behaviorTimer <= 0) {
        decideNextAction(rt);
      }
    }
  }

  if (driver && rt.driver) {
    if (moving) {
      if (fsm.getState() !== "walk") fsm.transition("walk", rt.driver);
      rt.expressionDriver?.setSpeaking?.(false);
    } else if (fsm.getState() === "walk") {
      fsm.transition(rt.arrivalState, rt.driver);
    } else if (rt.speakRequested && fsm.getState() !== "talk" && fsm.getState() !== "walk") {
      fsm.transition("talk", rt.driver);
      rt.expressionDriver?.setSpeaking?.(true);
    } else if (rt.listenRequested && fsm.getState() !== "listen" && fsm.getState() !== "walk" && fsm.getState() !== "talk") {
      fsm.transition("listen", rt.driver);
    } else if (!rt.speakRequested && !rt.listenRequested && (fsm.getState() === "talk" || fsm.getState() === "listen" || fsm.getState() === "pay_attention")) {
      rt.expressionDriver?.setSpeaking?.(false);
      fsm.transition(rt.arrivalState, rt.driver);
    }
    fsm.update(delta, rt.driver);
  }
}

/**
 * Apply a resolved character intent to the agent's movement.
 * `place` carries team identity ({teamIndex, teamName}) so anchored rooms
 * (buildings baked into the world GLB) win over procedural zones.
 * Directed intents disable free wander; pass-through intents leave the
 * current movement alone so an in-progress walk is never interrupted.
 * The intent kind is stored on the runtime for the renderer's visual-reflex
 * resolution (speaking/listening).
 */
export function applyIntent(rt, kind, index = 0, place = {}) {
  if (!rt) return;
  const { teamIndex = null, teamName = null } = place ?? {};
  rt.kind = kind;

  switch (kind) {
    case "GO_TO_DESK": {
      const p = getTeamDeskPosition(teamIndex, index, teamName);
      rt.autoWander = false;
      rt.deskFacing = getTeamDeskFacing(teamIndex, teamName);
      // LIFE: desk work now shows typing (sit_work base + type upper) when available
      const workState = "sit_type";
      const doorway = getTeamDoorway(teamIndex, teamName);
      if (doorway) {
        rt.viaPoint = p;
        setAgentTarget(rt, doorway.x, doorway.z, workState);
      } else {
        setAgentTarget(rt, p.x, p.z, workState);
      }
      return;
    }
    case "GO_TO_BOARDROOM":
    case "WAIT_BOARDROOM": {
      const p = getBoardroomPosition();
      rt.autoWander = false;
      setAgentTarget(rt, p.x, p.z, "sit_idle");
      return;
    }
    case "RETURN_TO_SPAWN": {
      const p = getSpawnPosition(index);
      rt.autoWander = false;
      rt.deskFacing = null;
      setAgentTarget(rt, p.x, p.z, "idle");
      return;
    }
    case "HOLD":
    case "ERROR": {
      rt.autoWander = true;
      rt.targetX = null;
      rt.targetZ = null;
      rt.viaPoint = null;
      rt.deskFacing = null;
      rt.expressionDriver?.setExpression?.("sad");
      return;
    }
    case "PAUSED": {
      rt.autoWander = true;
      rt.targetX = null;
      rt.targetZ = null;
      rt.viaPoint = null;
      rt.deskFacing = null;
      return;
    }
    case "WORK_TALK":
    case "REMOVED":
      // Pass-through: keep current movement / settle in place.
      return;
    case "IDLE":
    default:
      rt.autoWander = true;
      rt.targetX = null;
      rt.targetZ = null;
      rt.viaPoint = null;
      rt.deskFacing = null;
      return;
  }
}
