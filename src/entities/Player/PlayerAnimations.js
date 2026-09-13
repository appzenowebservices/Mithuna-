const FALLBACK_ANIMATIONS = {
  run: "walk",
};

let currentAction = null;

function resolveAction(actions, animationState) {
  const direct = actions[animationState];
  if (direct) return direct;

  const fallback = FALLBACK_ANIMATIONS[animationState];
  if (fallback && actions[fallback]) {
    return actions[fallback];
  }

  return null;
}

export function updatePlayerAnimations(
  actions,
  animationState
) {
  if (!actions) return;

  const nextAction = resolveAction(actions, animationState);

  if (!nextAction) {
    if (currentAction) {
      currentAction.fadeOut(0.15);
      currentAction = null;
    }
    return;
  }

  if (currentAction === nextAction) {
    if (currentAction && !currentAction.paused) {
      return;
    }
  }

  currentAction?.fadeOut(0.15);

  nextAction.reset().fadeIn(0.15).play();

  currentAction = nextAction;
}