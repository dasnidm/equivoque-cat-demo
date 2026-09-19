const TARGET_CHOICE = "a";
const CONFIRM_DELAY_MS = 360;
const CLEAR_DELAY_MS = 180;
const FADE_DELAY_MS = 620;
const CENTER_DELAY_MS = 760;
const REDUCED_PHASE_DELAY_MS = 60;
const prefersReducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const INITIAL_STATE = {
  phase: "initial",
  selected: [],
  visible: ["a", "b", "c"],
  complete: false,
};

let state = createInitialState();
let confirmationTimer = null;
let completionTimer = null;

const cards = Array.from(document.querySelectorAll(".cat-card"));
const catRow = document.querySelector("#cat-row");
const resultText = document.querySelector("#result-text");
const resetButton = document.querySelector("#reset-button");
const supportsViewTransitions = typeof document.startViewTransition === "function";

function createInitialState() {
  return {
    ...INITIAL_STATE,
    selected: [...INITIAL_STATE.selected],
    visible: [...INITIAL_STATE.visible],
  };
}

function beginConfirmation(choice, onConfirmed) {
  state.complete = false;
  state.phase = "confirming";
  state.selected = [...new Set([...state.selected, choice])];

  clearTimeout(confirmationTimer);
  confirmationTimer = setTimeout(() => {
    confirmationTimer = null;
    onConfirmed();
    commitRender();
  }, prefersReducedMotion ? REDUCED_PHASE_DELAY_MS : CONFIRM_DELAY_MS);
}

function beginFinalization() {
  state.complete = false;
  state.phase = "clearing";
  state.selected = [];
  render();

  clearTimeout(completionTimer);
  completionTimer = setTimeout(() => {
    state.phase = "fading";
    state.visible = [TARGET_CHOICE];
    commitRender();

    completionTimer = setTimeout(() => {
      state.phase = "centering";
      commitRender();

      completionTimer = setTimeout(() => {
        completionTimer = null;
        state.complete = true;
        state.phase = "complete";
        render();
      }, prefersReducedMotion ? REDUCED_PHASE_DELAY_MS : CENTER_DELAY_MS);
    }, prefersReducedMotion ? REDUCED_PHASE_DELAY_MS : FADE_DELAY_MS);
  }, prefersReducedMotion ? REDUCED_PHASE_DELAY_MS : CLEAR_DELAY_MS);
}

function handleInitialChoice(choice) {
  if (choice === TARGET_CHOICE) {
    beginConfirmation(choice, beginFinalization);
    return;
  }

  state.phase = "second";
  state.selected = [choice];
}

function handleSecondChoice(choice) {
  if (state.selected.includes(choice)) {
    return;
  }

  if (choice === TARGET_CHOICE) {
    const retainedChoice = state.selected.find((item) => item !== TARGET_CHOICE);
    beginConfirmation(choice, () => {
      state.visible = [TARGET_CHOICE, retainedChoice];
      state.selected = [];
      state.phase = "narrowed";
    });
    return;
  }

  beginConfirmation(choice, beginFinalization);
}

function handleNarrowedChoice(choice) {
  if (choice === TARGET_CHOICE) {
    beginConfirmation(choice, beginFinalization);
    return;
  }

  if (state.visible.includes(choice)) {
    beginConfirmation(choice, beginFinalization);
  }
}

function updateState(choice) {
  if (state.phase === "initial") {
    handleInitialChoice(choice);
  } else if (state.phase === "second") {
    handleSecondChoice(choice);
  } else if (state.phase === "narrowed") {
    handleNarrowedChoice(choice);
  }
}

function render() {
  const isConfirming = state.phase === "confirming";
  const isClearing = state.phase === "clearing";
  const isFading = state.phase === "fading";
  const isCentering = state.phase === "centering";
  const isFinalizing = isClearing || isFading || isCentering;

  catRow.classList.toggle("fading", isFading);
  catRow.classList.toggle("centering", isCentering);
  catRow.classList.toggle("complete", state.complete);
  catRow.classList.toggle("fallback-motion", !supportsViewTransitions);
  catRow.setAttribute("aria-busy", String(isConfirming || isFinalizing));

  cards.forEach((card) => {
    const choice = card.dataset.choice;
    const isVisible = state.visible.includes(choice);
    const isSelected = state.selected.includes(choice);
    const isFinalTarget = (isFinalizing || state.complete) && choice === TARGET_CHOICE;

    card.classList.toggle("removed", !isVisible);
    card.classList.toggle("selected", isSelected && !isFinalTarget);
    card.classList.toggle("forced", false);
    card.disabled = isConfirming || isFinalizing || state.complete || !isVisible;
    card.setAttribute("aria-pressed", String(isSelected || isFinalTarget));
  });

  resultText.textContent = state.complete
    ? "당신은 첫 번째 고양이를 골랐습니다."
    : "";
  resultText.classList.toggle("shown", state.complete);
}

function commitRender() {
  if (supportsViewTransitions) {
    document.startViewTransition(render);
    return;
  }

  render();
}

function handleChoice(choice) {
  if (
    state.phase === "confirming" ||
    state.phase === "clearing" ||
    state.phase === "fading" ||
    state.phase === "centering" ||
    state.complete ||
    !state.visible.includes(choice)
  ) {
    return;
  }

  updateState(choice);
  commitRender();
}

cards.forEach((card) => {
  card.addEventListener("click", (event) => {
    const choice = card.dataset.choice;
    if (choice !== undefined) {
      handleChoice(choice);
    }

    if (event?.detail > 0) {
      card.blur();
    }
  });
});

resetButton.addEventListener("click", (event) => {
  clearTimeout(confirmationTimer);
  confirmationTimer = null;
  clearTimeout(completionTimer);
  completionTimer = null;
  state = createInitialState();
  commitRender();

  if (event?.detail > 0) {
    resetButton.blur();
  }
});

render();
