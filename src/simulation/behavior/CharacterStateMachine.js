// src/simulation/behavior/CharacterStateMachine.js
//
// Ported from the-delegation's CharacterStateMachine (state machine + simulation
// logic only; no rendering/assets are taken from that repo).
//
// Declarative definition of every character state.
//  loop: true  -> animation loops; state persists until an explicit transition.
//  loop: false -> animation plays once, then auto-transitions to `nextState`.
//  interruptible: false -> the state machine will NOT apply a new state until the
//                          current animation finishes.
export const STATE_MAP = {
  idle:        { animation: "idle",        expression: "idle",      loop: true,  interruptible: true },
  walk:        { animation: "walk",                                     loop: true,  interruptible: true },
  talk:        { animation: "talk",        expression: "neutral",   loop: true,  interruptible: true },
  listen:      { animation: "listen",      expression: "listening", loop: true,  interruptible: true },
  pay_attention: { animation: "pay_attention", expression: "neutral", loop: true, interruptible: true },
  sit_down:    { animation: "sit_down",                               loop: false, nextState: "sit_idle", interruptible: false },
  sit_idle:    { animation: "sit_idle",    expression: "idle",      loop: true,  interruptible: true },
  sit_work:    { animation: "sit_work",    expression: "idle",      loop: true,  interruptible: true },
  // LIFE — office composites (base + upper via layered mixer)
  sit_type:    { animation: "sit_work", upperBody: "type", expression: "idle", loop: true, interruptible: true },
  sit_phone:   { animation: "sit_work", upperBody: "phone_call",                loop: true, interruptible: true },
  walk_carry:  { animation: "walk",     upperBody: "carry_coffee",             loop: true, interruptible: true },
  whiteboard_talk: { animation: "idle", upperBody: "whiteboard", expression: "neutral", loop: true, interruptible: true },
  stand_up:    { animation: "stand_up",                               loop: false, nextState: "idle", interruptible: false },
  look_around: { animation: "look_around", expression: "surprised", loop: false, nextState: "idle",    interruptible: true },
  happy:       { animation: "happy",       expression: "happy",     loop: false, nextState: "idle",    interruptible: true },
  sad:         { animation: "sad",         expression: "sad",       loop: false, nextState: "idle",    interruptible: true },
  pick:        { animation: "pick",                                   loop: false, nextState: "idle",    interruptible: false },
  wave:        { animation: "wave",                                   loop: false, nextState: "idle",    interruptible: true },
  wave_loop:   { animation: "wave",                                   loop: true,  interruptible: true },
  happy_loop:  { animation: "happy",       expression: "happy",      loop: true,  interruptible: true },
};

/**
 * Single-agent deterministic state machine.
 *
 * The `driver` is the agent's renderer adapter and must expose:
 *   setAnimation(animationName, loop)
 *   setExpression(expressionKey)          (optional)
 *   getAnimationDuration(animationName)   (optional)
 */
export class CharacterStateMachine {
  constructor(initialState = "idle") {
    this.state = STATE_MAP[initialState] ? initialState : "idle";
    this.timer = 0;
    this.sitTarget = null;
  }

  getState() {
    return this.state;
  }

  /**
   * Store the desired final seated state BEFORE calling transition("sit_down").
   * Applied once the sit_down animation finishes.
   */
  prepareSitDown(finalState) {
    this.sitTarget = finalState;
  }

  /** Request a state transition. Non-interruptible states silently reject new requests. */
  transition(newState, driver) {
    const currentDef = STATE_MAP[this.state];
    if (!currentDef) return;

    if (!currentDef.interruptible && this.timer > 0 && newState !== "walk") {
      return;
    }

    this._applyState(newState, driver);
  }

  /** Called every frame. Processes timers for non-looping animations. */
  update(delta, driver) {
    const def = STATE_MAP[this.state];
    if (!def || def.loop) return;

    this.timer -= delta;
    if (this.timer > 0) return;

    // sitTarget is ONLY consumed when sit_down finishes — prevents stale values
    // from leaked prepareSitDown calls affecting other non-looping states.
    const isSitDown = this.state === "sit_down";
    const next = (isSitDown ? this.sitTarget : null) ?? def.nextState ?? "idle";
    if (isSitDown) this.sitTarget = null;

    this._applyState(next, driver);
  }

  _applyState(key, driver) {
    const def = STATE_MAP[key];
    if (!def) return;

    const prev = this.state;
    this.state = key;

    if (driver?.setAnimation) driver.setAnimation(def.animation, def.loop);
    // Layered LIFE: upper-body clips (type while seated) compose over base
    if (def.upperBody) {
      if (driver?.setUpperAnimation) driver.setUpperAnimation(def.upperBody, def.loop);
    } else if (driver?.clearUpper) {
      driver.clearUpper();
    }
    if (def.expression !== undefined && driver?.setExpression) {
      driver.setExpression(def.expression);
    }

    if (!def.loop) {
      const duration = driver?.getAnimationDuration
        ? driver.getAnimationDuration(def.animation)
        : 0;
      this.timer = duration > 0 ? duration : 1.0;
    }

    if (prev !== key) {
      console.debug(`[StateMachine] ${key}${def.upperBody ? ` + ${def.upperBody}` : ""}`);
    }
  }
}
