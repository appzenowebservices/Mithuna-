// src/simulation/character/ExpressionDriver.js
//
// Ported semantics from the-delegation's ExpressionBuffer (blink, speaking,
// expression keys) as a CPU-side per-agent driver.
//
// When the model has no face (no morph targets / facial bones) this driver still
// tracks expression state so later facial work can plug in — but it produces no
// visual change, so nothing breaks.

const BLINK_INTERVAL_MIN = 2;
const BLINK_INTERVAL_RANGE = 3;
const BLINK_DURATION = 0.15;
const SPEAKING_FRAME_DURATION = 0.12;
const SPEAKING_FRAME_COUNT = 4;

export class ExpressionDriver {
  constructor(capabilities = {}) {
    this.capabilities = capabilities;
    this.expression = "idle";
    this.isSpeaking = false;

    this.blinkTimer = BLINK_INTERVAL_MIN + Math.random() * BLINK_INTERVAL_RANGE;
    this.isBlinking = false;
    this.speakingTimer = 0;
    this.speakingFrame = 0;
  }

  setExpression(name) {
    this.expression = name;
  }

  setSpeaking(isSpeaking) {
    this.isSpeaking = isSpeaking;
  }

  update(delta) {
    // Blinking
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0) {
      if (!this.isBlinking) {
        this.isBlinking = true;
        this.blinkTimer = BLINK_DURATION;
      } else {
        this.isBlinking = false;
        this.blinkTimer = BLINK_INTERVAL_MIN + Math.random() * BLINK_INTERVAL_RANGE;
      }
    }

    // Speaking mouth frames
    if (this.isSpeaking) {
      this.speakingTimer -= delta;
      if (this.speakingTimer <= 0) {
        this.speakingTimer = SPEAKING_FRAME_DURATION;
        this.speakingFrame = (this.speakingFrame + 1) % SPEAKING_FRAME_COUNT;
      }
    }
  }

  /** Snapshot for a future face renderer. No-op visuals when the model has no face. */
  getVisualState() {
    return {
      expression: this.expression,
      blinking: this.isBlinking,
      speaking: this.isSpeaking,
      mouthFrame: this.speakingFrame,
      hasFace: !!this.capabilities.hasFace,
    };
  }
}
