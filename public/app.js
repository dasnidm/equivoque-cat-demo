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
let mode = "classic";
let gesture = null;
const reactionTimers = new Map();

const cards = Array.from(document.querySelectorAll(".cat-card"));
const catRow = document.querySelector("#cat-row");
const resultText = document.querySelector("#result-text");
const resetButton = document.querySelector("#reset-button");
const supportsViewTransitions = typeof document.startViewTransition === "function";

// A separate illustration layer keeps the original mode's artwork intact.
cards.forEach((card, index) => {
  card.insertAdjacentHTML("beforeend", `
    <span class="pet-art" aria-hidden="true">
      <svg viewBox="0 0 180 180" fill="none" class="pet-cat">
        <ellipse class="cat-shadow" cx="89" cy="157" rx="49" ry="8" fill="currentColor" opacity=".09"/>
        <g class="cat-body">
          <path class="cat-tail" d="M119 141c38 5 44-32 22-37" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>
          <path d="M57 119c0-26 65-26 65 0l6 30c-15 11-68 11-77 0z" fill="currentColor"/>
          <ellipse cx="89" cy="134" rx="23" ry="22" fill="white" opacity=".28"/>
          <path d="M61 151h17m23 0h17" stroke="white" stroke-opacity=".5" stroke-width="9" stroke-linecap="round"/>
          <g class="cat-head">
            <path d="M47 72 43 32q1-7 8-2l27 20q12-3 23 0l26-20q7-5 8 2l-4 40c24 49-14 62-42 62S24 121 47 72Z" fill="currentColor"/>
            <path d="m51 41 3 26 16-12zm76 0-19 14 16 12z" fill="#ecc6b5"/>
            <path d="M80 56v13m10-15v12m10-10v13" stroke="white" stroke-opacity="${index === 1 ? '.1' : '.3'}" stroke-width="5" stroke-linecap="round"/>
            <g class="cat-eyes" stroke="#292d2c" stroke-width="4" stroke-linecap="round"><path d="M67 87v6m45-6v6"/></g>
            <g class="happy-eyes" stroke="#292d2c" stroke-width="3" stroke-linecap="round"><path d="M61 93q6-8 12 0m33 0q6-8 12 0"/></g>
            <ellipse cx="65" cy="103" rx="9" ry="4" fill="#ecb3aa" opacity=".6"/><ellipse cx="113" cy="103" rx="9" ry="4" fill="#ecb3aa" opacity=".6"/>
            <path d="m85 101 4 4 4-4" fill="#664c46" stroke="#664c46" stroke-linejoin="round"/>
            <path d="M89 105v3m-7 1q4 5 7-1 3 6 7 1" stroke="#664c46" stroke-width="2" stroke-linecap="round"/>
            <path d="m45 99-15-3m16 10-14 3m101-10 15-3m-16 10 14 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </g>
        </g>
      </svg>
      <span class="pet-spark">✦</span><span class="pet-mark">쓰다듬었어요</span>
    </span>`);
});

function reactToPet(card) {
  clearTimeout(reactionTimers.get(card));
  card.classList.remove("purring");
  void card.offsetWidth;
  card.classList.add("purring");
  reactionTimers.set(card, setTimeout(() => {
    card.classList.remove("purring");
    reactionTimers.delete(card);
  }, 650));
}

function clearGesture() {
  if (gesture) {
    gesture.card.classList.remove("stroking");
    gesture.card.style.removeProperty("--stroke-lean");
    if (gesture.card.hasPointerCapture(gesture.id)) gesture.card.releasePointerCapture(gesture.id);
  }
  gesture = null;
}

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
    ? (mode === "pet" ? "당신의 고양이를 찾았어요." : "당신은 첫 번째 고양이를 골랐습니다.")
    : "";
  resultText.classList.toggle("shown", state.complete);
}

function commitRender() {
  if (supportsViewTransitions && state.phase === "centering" && !prefersReducedMotion) {
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
  let suppressClickUntil = 0;
  card.addEventListener("pointerdown", (event) => {
    if (mode !== "pet" || card.disabled || !event.isPrimary || event.button !== 0 || gesture) return;
    gesture = { card, id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    card.setPointerCapture(event.pointerId);
    card.classList.add("stroking");
  });
  card.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.card !== card || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture.distance += Math.hypot(dx, dy);
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    card.style.setProperty("--stroke-lean", `${Math.max(-7, Math.min(7, dx * .6))}deg`);
  });
  card.addEventListener("pointerup", (event) => {
    if (!gesture || gesture.card !== card || gesture.id !== event.pointerId) return;
    const stroked = gesture.distance >= 18;
    clearGesture();
    if (stroked) {
      suppressClickUntil = performance.now() + 500;
      reactToPet(card);
      handleChoice(card.dataset.choice);
    }
  });
  card.addEventListener("pointercancel", clearGesture);
  card.addEventListener("lostpointercapture", () => {
    if (gesture?.card === card) clearGesture();
  });
  card.addEventListener("click", (event) => {
    if (event.detail > 0 && performance.now() < suppressClickUntil) return;
    if (mode === "pet" && !card.disabled) reactToPet(card);
    const choice = card.dataset.choice;
    if (choice !== undefined) {
      handleChoice(choice);
    }

    if (event?.detail > 0) {
      card.blur();
    }
  });
});

function resetExperiment() {
  clearGesture();
  reactionTimers.forEach(clearTimeout);
  reactionTimers.clear();
  cards.forEach((card) => card.classList.remove("purring", "stroking"));
  clearTimeout(confirmationTimer);
  confirmationTimer = null;
  clearTimeout(completionTimer);
  completionTimer = null;
  state = createInitialState();
  commitRender();
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    document.body.classList.toggle("pet-mode", mode === "pet");
    document.querySelector(".pet-intro").hidden = mode !== "pet";
    document.querySelectorAll("[data-mode]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    resetExperiment();
  });
});

resetButton.addEventListener("click", (event) => {
  resetExperiment();

  if (event?.detail > 0) {
    resetButton.blur();
  }
});

render();
