---
name: product-native-design
description: Use when designing or redesigning any UI (website, app, dashboard, landing page, admin, checkout) that must feel specific to its product instead of a generic template. A repeatable method - discover the product's material and moment, write a one-line design thesis, derive 2-3 motifs, tokens and a DESIGN.md, give each screen a recipe, assign motion owners, verify with screenshots. Handles RTL/Arabic and works alongside other design/motion skills.
---

# Product-native design

A method for UI that looks like it could only belong to *this* product. It is project-agnostic: it produces the project's own direction (thesis, motifs, `DESIGN.md`) instead of assuming one.

## How it fits with other skills and files

- If a design-direction/critique skill exists (e.g. `impeccable`), load it first for critique and its ban list; this skill supplies the **method and the project-specific decisions**. Then a polish skill (details), then motion skills.
- If `AGENTS.md` / `DESIGN.md` / docs exist, read them first. They win over anything here. If they conflict with each other, report it; do not silently pick.
- **One owner per topic, link don't copy.** Tokens live in `DESIGN.md`; motion ownership in `AGENTS.md` or a motion plan; flows and data in docs. Never duplicate values into code comments or other files.
- Never hardcode palette values in components; use theme variables.

## Step 1 — Discover (state assumptions, don't interrogate)

Collect from the repo, assets and conversation; ask at most 3 questions, only if truly blocked:

| Input | Why it matters |
| --- | --- |
| What the product physically/functionally *is* (material, process, artifacts) | source of the thesis and motifs |
| Who uses it, on what device, from where (ads, search, in-app browser, desktop) | decides mobile-first, density, performance budget |
| Language and script (RTL? Arabic? mixed?) | typography, layout, bidi, motion direction |
| Real assets (logos, photos, existing site) | extract the palette from pixels, never by eye; keep real photos over stock |
| Constraints (budget, stack, accessibility, offline) | filters every idea |
| Owner taste ("morph style", "brutalist", "calm") | an input to the thesis, not a replacement for it |

## Step 2 — Thesis: "X, then Y"

One sentence tying the product's **material** (X) to its **moment of highest value** (Y).
Examples: "the bag, then the receipt" (factory + checkout); "the page, then the proof" (law firm + signed engagement); "the ingredient, then the plate" (restaurant + order). 

Tests: (a) swap the logo with a competitor's: does it still fit? If yes, rework. (b) Can a screen answer "what object is this and what does it become next?" If not, keep that screen plain.

## Step 3 — Motifs (2–3, no more)

Derive from the product's edges, textures, tools or workflow artifacts (stitching, perforation, ruled lines, labels, stamps, grids, tape, gauges). For each motif write: **meaning**, **where it appears**, **where it must not**, **a CSS/SVG recipe**, **mobile cost**. Rules: one dominant motif per region; a motif that carries no meaning is decoration, so cut it; static textures ≤ 6% opacity, never animated, never behind small text.

## Step 4 — Tokens and `DESIGN.md`

Create or update `DESIGN.md`: YAML front matter (name, description, status provisional/final, colors, typography, rounded, spacing), then sections: Overview (thesis + motifs), Colors (roles + contrast notes), Typography, Layout, Elevation & shape, Texture, Components, Motion intent, Imagery & logo, Voice/copy, Do/Don't.

- **Color:** neutrals come from the product's material; **one rationed accent** (about one accent element per viewport); semantic colors always paired with icon + text; compute contrast ratios by script and write the pass/fail next to the token. Verify logo-on-background combinations (a dark logo disappears on a dark band: define a knockout or a chip).
- **Type:** at most two families plus a mono if numbers matter (codes, prices, IDs). Body line-height ≥ 1.6 (≥ 1.7 for Arabic). Fluid scale with `clamp`. Self-host fonts, subset to needed scripts.
- **Shape/elevation:** a radius scale with nested radii (`outer = inner + padding`); soft tinted shadows, never pure black.
- Map tokens to the component library's theme variables (e.g. shadcn-style `--background`, `--primary`) so libraries inherit the system.

## Step 5 — One signature moment

Pick the single moment that should be unforgettable (a receipt, a result, a finished onboarding, a first-run) and over-invest there: unique object, sound design of motion, careful copy. Everything else stays quieter so that moment lands.

## Step 6 — Screen recipes

For each screen type write a short recipe (focal object, primary action, structure, states). General rules:

- One focal point and **one primary action per region**; the rest is secondary or text-only.
- Vary section rhythm (big block, ruled list, strip, ticket); avoid a metronome of identical card grids.
- **Design every state:** empty, loading, error, success, partial, expired/rejected. Loading uses a product-shaped skeleton, not a spinner.
- Mobile first: primary actions in the thumb zone (sticky bottom bar), inputs ≥ 48px, correct `inputMode`, labels above fields (never placeholder-only).
- Density follows context: marketing = airy and expressive; admin/tools = dense, calm, no decorative motion or motifs.
- Real data, real photos. Missing facts (prices, phones, names) are marked `TODO(...)`, never invented.

## Step 7 — Motion ownership (skill-agnostic)

- **Micro-state** (hover, focus, press, toggle, in-place fade) → CSS transitions with shared tokens.
- **Structure change** (shared element, card→dialog, list add/remove/reorder, step and route change) → one view-transition/shared-element system.
- **Orchestration** (timelines, scroll-linked, stagger, plugins) → one JS animation engine, lazy-loaded.
- One owner per element and per property; never CSS transition + JS tween on the same property.
- One token source (duration, distance, easing); other systems derive from it.
- Sequence, don't overlap: finish the structural transition, then start the timeline.
- Frequency rule: high-frequency UI ≈ 200ms or static; keyboard-driven changes are never animated.
- Every animation has a static reduced-motion equivalent; state never depends on motion (unsupported browsers must still work).
- Motion budget: animate transform/opacity only; ≲ 12 animated elements on mobile; throttle-test CPU.

## Step 8 — RTL / multilingual module (apply when relevant)

- `dir` on the root; **logical properties only** (`ms/me/ps/pe/start/end`, `text-start`). Mirror directional icons; don't mirror logos, QR codes, media controls.
- Arabic: never `letter-spacing` or `text-transform`; generous line-height; avoid ultra-tight headings. Split text for animation by **words**, not characters.
- Digits: choose one system consistently (Western digits for prices and codes is common); `tabular-nums` for changing numbers; isolate codes/phones/URLs and Latin brand runs with `dir="ltr"` + `unicode-bidi: isolate`.
- Directional motion (slides, carousels, progress): verify "forward" reads in the reading direction in an RTL screenshot.
- Test long strings, mixed-script lines, and large numbers; text wraps, never clips.
- Other scripts: check font fallback, line-height and word-break rules.

## Step 9 — Anti-template list

Gradient text; glassmorphism walls; decorative blobs/orbs; purple-blue "AI" gradients; identical 3-up icon feature grids; stock-photo smiles; accent color as body text; color-only status; placeholder-only labels; multiple primary buttons per region; emoji as UI chrome; infinite decorative animation; centered-everything layouts; fake testimonials or metrics.

## Step 10 — Verify (look, don't assume)

1. Screenshots: mobile (360×740), mobile with `prefers-reduced-motion`, desktop (1280×800); RTL if applicable. Open and inspect them.
2. **Squint test:** blur the screenshot: is there one clear focal point and one primary action?
3. **Swap test:** would it survive a different brand's logo? If yes, it's still generic.
4. Contrast by script (≥ 4.5:1 body, ≥ 3:1 large/UI); keyboard-only pass with visible focus; touch targets ≥ 44px.
5. Performance: LCP/CLS/INP on throttled mobile; lazy-load heavy motion and tooling.
6. Run the project's build, lint and typecheck; commit small.

## Finish checklist

- [ ] Thesis in one sentence, written in `DESIGN.md`
- [ ] 2–3 motifs, each with meaning, placement limits and a recipe
- [ ] Tokens only (no raw hex/palette classes); contrast computed
- [ ] One signature moment designed end to end
- [ ] One primary action and at most one accent element per region
- [ ] All states designed; copy in one place, in the product's voice
- [ ] Motion owners assigned, tokens shared, reduced-motion verified
- [ ] RTL/bidi verified where relevant
- [ ] No invented facts; screenshots reviewed
