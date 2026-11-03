---
name: interface-design-foundations
description: Design and review interfaces with a coherent token system, hierarchy, typography, surfaces, motion, states, accessibility, and performance. Use when designing or refining websites, apps, dashboards, forms, native screens, or design systems, or when a UI feels inconsistent, generic, or unfinished.
---

# Interface design foundations

A compact foundation for interfaces that feel deliberate rather than assembled.
Use it when defining a visual system, reviewing a screen, or fixing details that
make a product feel unfinished.

Read the project first. Existing brand rules, tokens, `DESIGN.md`, component
library conventions and platform guidance win over this skill. If they conflict
with each other, report the conflict instead of silently choosing one.

## Principles

1. **Continuity.** Every appearance and disappearance has a visible origin and
   destination. Nothing teleports.
2. **Hierarchy.** One focal point and one primary action per region. Secondary
   controls recede through size, weight, spacing and contrast, not decoration.
3. **Restraint.** One expressive moment per view. Everything else stays quiet so
   that moment lands.
4. **Feedback.** Every interactive element answers within 100 ms. Press, focus,
   drag, release and completion are visibly distinct.
5. **Physicality.** Touch-driven motion carries momentum and settles; it never
   stops dead or moves linearly.
6. **Performance is design.** A beautiful transition that drops frames is a
   broken transition. Animate the cheapest properties and verify on real
   hardware.

## Design tokens

Create tokens before designing components. Components consume roles, never raw
values. Keep one source of truth and map it into the component library's theme
variables.

### Color roles

Define roles, not a mood board:

| Role | Purpose |
| --- | --- |
| `bg.canvas` | The page or screen base. |
| `bg.surface` | Cards, sheets and raised regions. |
| `bg.subtle` | Hover, selected and quiet fills. |
| `border.subtle` / `border.strong` | Hairlines and emphasis. |
| `text.primary` / `text.secondary` / `text.muted` | Reading hierarchy. |
| `accent` | The single action color. Ration it. |
| `success` / `warning` / `danger` | Semantic states, always paired with an icon or label. |

Rules:

- One accent element per viewport is a useful budget, not a quota.
- Never encode meaning in color alone.
- Compute contrast from the actual values. Body text needs at least 4.5:1;
  large text and UI boundaries need at least 3:1.
- Verify logo and text combinations against every surface they can land on.
- Dark mode is a second system, not an inversion. Check elevation, borders and
  semantic colors separately.

### Typography

- Choose at most two families, plus a monospace face when numbers, codes or IDs
  need alignment.
- Define roles with size, line height, weight and tracking: display, title,
  headline, body, caption, mono.
- Body line height is usually 1.5–1.7. Long-form reading wants the upper end.
- Keep measure comfortable: roughly 45–75 characters per line.
- Use tabular numbers wherever values change in place.
- Self-host and subset fonts when the project allows it. Verify fallback fonts
  and scripts.
- For Arabic and other non-Latin scripts, do not apply `letter-spacing` or
  `text-transform`. Check joining, line height and font fallback.

### Space, shape and depth

- Use a spacing scale (for example 4, 8, 12, 16, 24, 32, 40, 56) and compose
  layouts from it.
- Use a radius scale. Nested surfaces should satisfy `outer = inner + padding`.
- Build depth from layering, hairlines and subtle shadows before reaching for
  blur or glow. Pure-black shadows usually read as dirt; tint them.
- Blur is expensive. Limit simultaneous blurred surfaces and always provide an
  opaque fallback.
- Keep icon stroke weight consistent with the type weight. Use one icon family.
- Icons that change meaning should morph or cross-fade, not swap abruptly.

## Layout and content

- Design mobile first when the product is used on phones, but verify desktop
  density and wide-screen composition.
- Put primary actions in the thumb zone on mobile. Keep inputs at least 48 px
  tall with the correct `inputMode`.
- Labels sit above fields, not inside them as the only label.
- Vary section rhythm. Identical card grids repeated down a page read as a
  template.
- Density follows context: marketing is airy; admin tools are compact and calm.
- Use real content and real assets. Mark unknown facts as `TODO(...)`; never
  invent prices, names, testimonials or metrics.
- Design every state: empty, loading, partial, error, success, disabled and
  expired. Loading should use a shape that matches the incoming content, not a
  generic spinner.

## Motion

Motion explains change. It is not decoration.

### Choose the mechanism

| Change | Mechanism |
| --- | --- |
| Hover, focus, press, toggle, in-place color | CSS transition or a short timing animation |
| Element becomes another surface | Shared-element or container transform |
| List add, remove or reorder | Layout animation |
| Multi-step sequence, scroll-linked story | One timeline engine, loaded only when needed |

Use one owner per property. Never run a CSS transition and a JavaScript tween on
the same property at the same time.

### Timing and easing

Use a small shared scale. A practical starting point:

| Token | Value | Use |
| --- | --- | --- |
| `instant` | 90 ms | Press feedback |
| `fast` | 160 ms | Hover, small fades |
| `base` | 260 ms | Most state changes |
| `slow` | 420 ms | Larger surfaces |
| `hero` | 560–900 ms | One signature transition |

- Springs for anything the finger touches or that changes shape. Timing for
  color, opacity and progress.
- Hand gesture velocity into the spring. No gesture ends with a dead stop.
- Allow overshoot on small elements only. Large surfaces settle calmly.
- Respect an interaction budget: one hero animation plus a small number of
  supporting animations. Everything else holds still.
- Make animations interruptible. Never lock input while a transition runs.
- When two contents cross-fade inside a morph, fade the outgoing content early
  and the incoming content later. Never show both at full strength.
- Stop idle loops when the surface is hidden or the app is backgrounded.
- Sequence, don't overlap: finish a structural transition before starting a
  timeline that depends on it.

### Reduced motion

Every animation needs a static or cross-fade equivalent. State and meaning must
never depend on motion. With reduced motion enabled: remove parallax, idle
loops, particles and large movement; keep short opacity changes.

## Interaction states

Every component ships with:

- idle, hover, focus-visible, pressed, disabled, loading and error;
- a clear origin and destination for enter and exit;
- keyboard behavior and a visible focus ring;
- a touch target of at least 44×44 px even when the visual is smaller;
- an accessible name, role, state and value where relevant.

Focus is not hover. Do not remove focus outlines without replacing them.

## Do and don't

| Do | Don't |
| --- | --- |
| Animate transform, opacity and color | Animate layout with per-frame script or state |
| Use shared tokens and motion presets | Hard-code colors, radii, springs or durations |
| Give every surface an origin and destination | Pop elements in from nowhere |
| Keep one hero moment per view | Animate everything at once |
| Let content carry the color | Compete with content using chrome |
| Provide fallbacks for blur and effects | Ship effects that miss the frame budget |
| Verify with screenshots at real sizes | Judge from code alone |

## Verification

1. Capture screenshots at mobile (360×740), desktop (1280×800), and the
   relevant reduced-motion and RTL variants. Look at them.
2. Squint test: is there one clear focal point and one primary action?
3. Swap test: if the logo changed, would the design still fit the product? If
   yes, it is still generic.
4. Check contrast, keyboard-only operation, focus visibility and touch targets.
5. Run build, lint, typecheck and tests.
6. Check the interaction on a mid-range device or a throttled CPU profile.
7. Review the diff for accidental scope creep before committing.
