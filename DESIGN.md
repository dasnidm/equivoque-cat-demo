# Cat Choice Experiment Design System

## 1. Intent

A distraction-free participant surface for a three-cat equivoque experiment. The interface exposes only the choices and the final outcome; operator explanations, labels, traces, and instructions stay out of view.

## 2. Tokens

- `--surface-page`: `#f4f1eb`
- `--surface-card`: `#fffdf9`
- `--surface-card-hover`: `#ffffff`
- `--text-primary`: `#20211f`
- `--border-default`: `rgba(32, 33, 31, 0.14)`
- `--border-selected`: `#276955`
- `--focus-ring`: `#276955`
- `--cat-one`: `#a85f3e`
- `--cat-two`: `#526d8a`
- `--cat-three`: `#34383a`
- Spacing scale: `4, 8, 12, 16, 24, 32px`
- Card radius: `8px`

## 3. Typography

- System sans stack for zero network cost.
- Result: `clamp(20px, 5vw, 32px)`, weight 650, line height 1.35.
- Korean text uses zero letter spacing and `word-break: keep-all`.

## 4. Layout

- The experiment occupies one centered viewport-height stage.
- The three cat cards always remain in one horizontal row, including mobile.
- The row is capped at `760px`; gaps compress from `16px` to `8px` on narrow screens.
- Removed cards become transparent but retain their original grid slot, so spatial identity never changes.
- During finalization, the first cat moves from its original slot into the center column while the other slots disappear.
- Stable card aspect ratios prevent state changes from shifting the result region.

## 5. Components

### Cat Choice

- Native button containing a cat pictogram with a distinct coat: orange tabby, blue-gray spotted, or dark tuxedo.
- Variants: available, selected, confirming, clearing, removed, fading, centering.
- States: hover, active, focus-visible, disabled.
- The visible surface contains no labels; each button has a Korean accessible name.
- Every selected card uses one stable treatment: white background, green border/ring, and no lift or position change.
- Every tap, including a direct final tap on the first cat, enters a 360ms confirming state so the tapped card always receives the selected treatment first.
- Selection treatment is cumulative only during the 360ms confirmation: earlier and newly tapped cards remain highlighted together, then all surviving cards return to the default state when narrowing finishes.
- The final first cat shows selection only during confirmation, then returns to its default surface as soon as fading or center movement begins; it never inherits a forced treatment.
- A 180ms clearing stage renders all visible cards without selection before any View Transition snapshot or removal begins.
- Cards do not move or change surface color on hover/press; removal alone uses opacity/scale while preserving the card's original slot.
- Mobile taps suppress the browser's native blue tap highlight and release pointer focus after activation; keyboard focus remains visible.

### Result

- Hidden through the cat's final movement, then faded in and announced through `aria-live="polite"`.
- Copy: `당신은 첫 번째 고양이를 골랐습니다.`

### Reset

- Familiar rotate-arrow icon button with an accessible name and native tooltip.
- Visually quiet and fixed above the choice row.

## 6. Motion & Accessibility

- Interaction motion is limited to `transform` and `opacity` except for the browser-managed View Transition geometry interpolation.
- Browsers without View Transition support use a CSS transform fallback over the exact one-column distance.
- Finalization is sequential: the tapped card confirms for 360ms, selection clears in place for 180ms, non-target cats fade for 620ms, the default-state first cat moves to center for 760ms, then the result fades in for 320ms.
- `prefers-reduced-motion` collapses both visual stages to 1ms and uses 60ms phase delays.
- Touch targets remain at least 44px.
- All choices are keyboard-operable and preserve a visible focus ring.

## 7. Performance

- Static HTML, CSS, and vanilla JavaScript only.
- No fonts, frameworks, remote images, build step, or runtime network requests.
- Inline SVG keeps the full experience lightweight on the 1GB host.
