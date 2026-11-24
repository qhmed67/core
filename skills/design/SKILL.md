---
name: design
description: One design skill for any UI work (web, app, dashboard, native, design system, motion, review). Method, tokens, states, motion, RTL/Arabic, React Native, verification. Use to design, redesign, polish or review an interface.
---

# design

Merged from the owner's `product-native-design`, `interface-design-foundations` and `react-native-motion`, plus details from jakubkrehel/make-interfaces-feel-better (MIT). See SOURCES.md.

## Authority

1. Project `DESIGN.md`, `AGENTS.md`, brand rules and component-library conventions win. If they conflict, report it. Do not pick silently.
2. One owner per topic. Tokens live in `DESIGN.md`. Link to them. Never copy values into comments or other files.
3. Never hardcode palette, radius, spacing, duration or spring values in components. Use tokens.

## Method (new or redesigned UI)

1. **Discover.** From repo, assets and chat: what the product physically is, who uses it on which device, language and script, real assets, constraints. State assumptions. Ask at most 3 questions, only if blocked. Extract palette from real pixels, never by eye.
2. **Thesis.** One sentence "X, then Y": product material, then its moment of highest value. Swap test: with a competitor's logo, does it still fit? Then rework.
3. **Motifs.** 2-3, no more. Each gets: meaning, where it appears, where it must not, CSS/SVG recipe, mobile cost. A motif with no meaning is decoration: cut it. Static textures at most 6% opacity, never animated, never behind small text.
4. **Tokens + `DESIGN.md`.** YAML front matter (name, description, status, colors, typography, rounded, spacing), then Overview, Colors, Typography, Layout, Elevation, Components, Motion intent, Voice, Do/Don't. Map tokens to the component library's theme variables.
5. **One signature moment** (receipt, result, first run). Over-invest there. Everything else stays quiet.
6. **Screen recipe** per screen type: focal object, primary action, structure, states.

## Principles

- Continuity: every appearance has a visible origin and destination. Nothing teleports.
- Hierarchy: one focal point and one primary action per region. Secondary recedes by size, weight, spacing, contrast.
- Restraint: one expressive moment per view.
- Feedback: every interactive element answers within 100 ms.
- Performance is design. Dropped frames are a broken design.

## Tokens

**Color roles:** `bg.canvas`, `bg.surface`, `bg.subtle`, `border.subtle|strong`, `text.primary|secondary|muted`, `accent`, `success|warning|danger`.
- Neutrals come from the product's material. One rationed accent: about one accent element per viewport.
- Never meaning by color alone. Status = color + icon + text.
- Compute contrast by script. Body 4.5:1, large text and UI 3:1. Write pass/fail next to the token.
- Check logo on every surface it can land on.
- Dark mode is a second system, not an inversion.

**Type:** two families max, plus mono if numbers matter. Roles: display, title, headline, body, caption, mono. Body line-height 1.5-1.7 (Arabic 1.7+). Measure 45-75 characters. `tabular-nums` on changing numbers. `text-wrap: balance` on headings, `pretty` on body. Fluid scale with `clamp`. Self-host and subset fonts.

**Space/shape/depth:**
- Scale like 4, 8, 12, 16, 24, 32, 40, 56.
- Nested radius: `outer = inner + padding`.
- Shadows: layered, transparent, tinted. Never pure black. Prefer shadow over border for fake elevation. Keep borders for structure and state.
- Blur is costly. Few blurred surfaces, always an opaque fallback.
- Image outline: 1px, `oklch(0 0 0 / .1)` light, `oklch(1 0 0 / .1)` dark. Pure black or white, no tint.
- One icon family. Stroke 1.5px beside regular text, 2px beside semibold. `currentColor`, states from CSS. Outline default, fill for active. Optical alignment over geometric.
- Hit area 44x44 (40 in dense desktop). Extend with a pseudo-element. Never overlap hit areas.

## Layout and states

- Mobile first when used on phones. Primary action in the thumb zone. Inputs 48px+, right `inputMode`. Labels above fields, never placeholder-only.
- Vary section rhythm. No metronome of identical card grids.
- Density follows context: marketing airy, admin dense and calm with no decorative motion.
- Real data and photos. Unknown facts: `TODO(...)`. Never invent prices, names, testimonials, metrics.
- Every component: idle, hover, focus-visible, pressed, disabled, loading, error. Plus empty, partial, success, expired where relevant. Loading = product-shaped skeleton, not a spinner. Never remove a focus ring without replacing it.

## Motion

| Change | Owner |
| --- | --- |
| hover, focus, press, toggle, color, in-place fade | CSS transition, exact properties (never `transition: all`) |
| surface becomes another surface, route/step change | one shared-element / view-transition system |
| list add, remove, reorder | layout animation |
| sequence, scroll-linked, stagger | one JS engine (GSAP or Motion), lazy-loaded |

- One owner per element and per property. No CSS transition plus JS tween on the same property.
- Tokens: instant 90ms, fast 160ms, base 260ms, slow 420ms, hero 560-900ms (one per view). Other systems derive from these.
- Springs for touch and shape change. Timing for color, opacity, progress. Hand gesture velocity to the spring.
- High-frequency UI: static or at most 150ms. Keyboard-driven changes never animate.
- Press: `scale(0.96)`, never below 0.95.
- Enter: ease-out. Exit softer than enter, small fixed `translateY`, not full height. Stagger only infrequent entrances, about 100ms steps.
- Icon swap: opacity 0 to 1, scale .25 to 1, blur 4px to 0.
- Cross-fade inside a morph: outgoing early, incoming late. Never both at full strength.
- Skip enter animation on first load (`initial={false}`).
- Interruptible. Never lock input during a transition. Sequence, don't overlap.
- Animate transform, opacity, color only. `will-change` only for transform/opacity/filter and only after seeing stutter. At most about 12 animated elements on mobile.
- Reduced motion: every animation has a static or cross-fade equivalent. Remove parallax, loops, particles, large movement. State never depends on motion. Stop idle loops when hidden.
- GSAP: React uses `useGSAP` with scoped refs and cleanup. Register plugins once. Do not animate layout properties. Check the installed version's API before writing code.

## RTL and Arabic

- `dir` on root. Logical properties only (`ms/me/ps/pe/start/end`, `text-start`).
- Mirror directional icons. Do not mirror logos, QR codes, media controls.
- Arabic: no `letter-spacing`, no `text-transform`. Split animated text by words, not characters.
- One digit system, consistently. `tabular-nums` on changing numbers. Isolate codes, phones, URLs and Latin brand runs: `dir="ltr"` + `unicode-bidi: isolate`.
- Directional motion must read forward in the reading direction. Check an RTL screenshot.
- Test long strings and mixed-script lines. Text wraps, never clips.

## React Native / Expo

- Check installed Expo, RN, Reanimated, Gesture Handler, Skia versions before coding.
- Animated values in shared values, never React state. No `setState` per frame or gesture tick.
- Reanimated, not RN `Animated`. No `useNativeDriver`. `Gesture.Pan()` + `GestureDetector`, not `useAnimatedGestureHandler`.
- Springs and timings from the project's motion module. No literals in components.
- Bridge to JS thread through one local module so an API rename is a one-file change.
- Each component: typed props, role and label, 44pt hit target, reduced-motion variant (`useReducedMotion`).
- Named exports, one component per file, memoized list items.
- Skia `RuntimeEffect` compiled once at module scope, null-checked, with a plain fallback.
- Stop idle loops on blur or background. Verify at 55 fps+ on a mid-range Android device.
- Container transform: measure source rect, animate destination rect. No experimental shared-element APIs.

## Anti-template list

Gradient text. Glassmorphism walls. Decorative blobs and orbs. Purple-blue "AI" gradients. Identical 3-up icon grids. Stock-photo smiles. Accent as body text. Color-only status. Placeholder-only labels. Several primary buttons per region. Emoji as UI chrome. Infinite decorative animation. Centered-everything. Fake testimonials or metrics.

## Verify (look, don't assume)

1. Screenshots: mobile 360x740, mobile with reduced motion, desktop 1280x800, RTL if relevant. Open and inspect them. Replay motion at 10% speed.
2. Squint test: one focal point, one primary action?
3. Swap test: survives a different logo? Then still generic.
4. Contrast by script. Keyboard-only pass. Visible focus. Touch targets.
5. LCP, CLS, INP on throttled mobile. Lazy-load heavy motion.
6. Build, lint, typecheck, tests. Commit small.

Done when: thesis and tokens in `DESIGN.md`, no raw values in code, all states designed, motion owners assigned, reduced-motion and RTL checked, no invented facts, screenshots reviewed.
