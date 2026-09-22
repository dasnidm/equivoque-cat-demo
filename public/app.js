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

let mode = "classic";
let catCount = 3;
let randomPosition = false;
let state = createInitialState();
let confirmationTimer = null;
let completionTimer = null;
let gesture = null;
let tapTimer = null;
const reactionTimers = new Map();
const departures = new Set();

for (const [choice, label, colorClass] of [["d", "Fourth cat", "cat-four"], ["e", "Fifth cat", "cat-five"]]) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `cat-card ${colorClass}`;
  card.dataset.choice = choice;
  card.setAttribute("aria-label", label);
  card.setAttribute("aria-pressed", "false");
  document.querySelector("#cat-row").append(card);
}
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
      <span class="pet-spark">✦</span><span class="pet-mark">Petted</span>
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
    visible: ["a", "b", "c", "d", "e"].slice(0, mode !== "classic" ? catCount : 3),
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
  if (mode !== "classic") {
    handlePetChoice(choice);
    return;
  }
  if (state.phase === "initial") {
    handleInitialChoice(choice);
  } else if (state.phase === "second") {
    handleSecondChoice(choice);
  } else if (state.phase === "narrowed") {
    handleNarrowedChoice(choice);
  }
}

function resolveRunGroup(retained) {
  const leaving = cards.filter(card => state.visible.includes(card.dataset.choice) && !retained.includes(card.dataset.choice));
  if (!prefersReducedMotion) leaving.forEach(card => {
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.hidden = false;
    ghost.disabled = true;
    ghost.setAttribute("aria-hidden", "true");
    ghost.removeAttribute("aria-label");
    ghost.classList.remove("selected", "purring", "stroking");
    ghost.classList.add("running-away");
    Object.assign(ghost.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", zIndex: "20" });
    document.body.append(ghost);
    const direction = rect.left + rect.width / 2 < innerWidth / 2 ? -1 : 1;
    ghost.style.setProperty("--run-facing", direction);
    const distance = direction < 0 ? -(rect.right + 60) : innerWidth - rect.left + 60;
    const animation = ghost.animate([{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }], { duration: 820, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" });
    const departure = { ghost, animation };
    departures.add(departure);
    animation.onfinish = () => { ghost.remove(); departures.delete(departure); };
  });
  state.visible = retained;
  state.selected = [];
  state.phase = "escaping";
  completionTimer = setTimeout(() => {
    completionTimer = null;
    state.complete = retained.length === 1;
    state.phase = state.complete ? "complete" : "initial";
    render();
  }, prefersReducedMotion ? 0 : 840);
}

function handlePetChoice(choice) {
  if (state.selected.includes(choice)) return;
  const selection = [...state.selected, choice];
  if (mode === "run") {
    if (choice === TARGET_CHOICE) {
      resolveRunGroup(state.visible.filter(item => selection.includes(item)));
    } else if (selection.length === state.visible.length - 1) {
      resolveRunGroup([TARGET_CHOICE]);
    } else {
      state.selected = selection;
      state.phase = "collecting";
    }
    return;
  }
  if (choice === TARGET_CHOICE) {
    beginConfirmation(choice, () => {
      if (selection.length === 1) {
        beginFinalization();
      } else {
        state.visible = state.visible.filter((item) => selection.includes(item));
        state.selected = [];
        state.phase = "initial";
      }
    });
  } else if (selection.length === state.visible.length - 1) {
    beginConfirmation(choice, beginFinalization);
  } else {
    state.selected = selection;
    state.phase = "collecting";
  }
}

function render() {
  const oldRects = new Map(cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
  const isConfirming = state.phase === "confirming" || tapTimer !== null;
  const isClearing = state.phase === "clearing";
  const isFading = state.phase === "fading";
  const isCentering = state.phase === "centering";
  const isFinalizing = isClearing || isFading || isCentering || state.phase === "escaping";
  const count = mode !== "classic" ? catCount : 3;
  catRow.style.setProperty("--cat-count", count);
  catRow.dataset.count = count;
  catRow.classList.toggle("five-layout", mode !== "classic" && state.visible.length === 5);
  catRow.classList.toggle("four-layout", mode !== "classic" && state.visible.length === 4);

  catRow.classList.toggle("fading", isFading);
  catRow.classList.toggle("centering", isCentering);
  catRow.classList.toggle("complete", state.complete);
  catRow.classList.toggle("fallback-motion", !supportsViewTransitions);
  catRow.setAttribute("aria-busy", String(isConfirming || isFinalizing));

  cards.forEach((card) => {
    const choice = card.dataset.choice;
    card.hidden = ["a", "b", "c", "d", "e"].indexOf(choice) >= count || (mode !== "classic" && !state.visible.includes(choice));
    const isVisible = state.visible.includes(choice);
    const isSelected = state.selected.includes(choice);
    const isFinalTarget = (isFinalizing || state.complete) && choice === TARGET_CHOICE;

    card.classList.toggle("removed", !isVisible);
    card.classList.toggle("selected", isSelected && !isFinalTarget);
    card.classList.toggle("forced", false);
    card.disabled = isConfirming || isFinalizing || state.complete || !isVisible;
    card.setAttribute("aria-pressed", String(isSelected || isFinalTarget));
  });

  if (mode !== "classic" && !prefersReducedMotion) cards.forEach(card => {
    const before = oldRects.get(card);
    if (!before || card.hidden) return;
    const after = card.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) + Math.abs(dy) > 1) card.animate([
      { translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }
    ], { duration: 420, easing: "ease-out" });
  });

  resultText.textContent = state.complete
    ? (mode !== "classic" ? "You found your cat." : randomPosition ? "You chose this cat." : "You chose the first cat.")
    : "";
  resultText.classList.toggle("shown", state.complete);
}

function commitRender() {
  if (mode === "classic" && supportsViewTransitions && state.phase === "centering" && !prefersReducedMotion) {
    document.startViewTransition(render);
    return;
  }

  render();
}

function handleChoice(choice) {
  if (
    tapTimer !== null ||
    state.phase === "escaping" ||
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
    if (mode === "classic" || card.disabled || !event.isPrimary || event.button !== 0 || gesture) return;
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
    if (card.disabled) return;
    const choice = card.dataset.choice;
    if (mode !== "classic") {
      reactToPet(card);
      if (!state.selected.includes(choice)) {
        // A tap has no stroking interval: let its tactile feedback finish first.
        tapTimer = setTimeout(() => {
          tapTimer = null;
          handleChoice(choice);
        }, prefersReducedMotion ? REDUCED_PHASE_DELAY_MS : 550);
        render();
      }
    } else if (choice !== undefined) {
      handleChoice(choice);
    }

    if (event?.detail > 0) {
      card.blur();
    }
  });
});

function resetExperiment() {
  clearTimeout(tapTimer);
  tapTimer = null;
  clearGesture();
  departures.forEach(({ ghost, animation }) => { animation.cancel(); ghost.remove(); });
  departures.clear();
  cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
  reactionTimers.forEach(clearTimeout);
  reactionTimers.clear();
  cards.forEach((card) => card.classList.remove("purring", "stroking"));
  clearTimeout(confirmationTimer);
  confirmationTimer = null;
  clearTimeout(completionTimer);
  completionTimer = null;
  state = createInitialState();
  const activeCards = cards.filter(card => state.visible.includes(card.dataset.choice));
  if (randomPosition) {
    for (let i = activeCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activeCards[i], activeCards[j]] = [activeCards[j], activeCards[i]];
    }
  }
  catRow.append(...activeCards, ...cards.filter(card => !state.visible.includes(card.dataset.choice)));
  catRow.classList.toggle("randomized", randomPosition);
  commitRender();
}

document.querySelector("#random-position").addEventListener("click", (event) => {
  randomPosition = !randomPosition;
  const button = event.currentTarget;
  button.setAttribute("aria-pressed", String(randomPosition));
  button.querySelector("span").textContent = randomPosition ? "On" : "Off";
  resetExperiment();
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    document.body.classList.toggle("pet-mode", mode !== "classic");
    document.body.classList.toggle("run-mode", mode === "run");
    document.querySelector(".pet-intro").hidden = mode === "classic";
    document.querySelector(".count-switch").hidden = mode === "classic";
    document.querySelectorAll("[data-mode]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    resetExperiment();
  });
});

document.querySelectorAll("[data-count]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextCount = Number(button.dataset.count);
    if (catCount === nextCount) return;
    catCount = nextCount;
    document.querySelectorAll("button[data-count]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
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
