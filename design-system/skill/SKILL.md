---
name: canvas-editor-design-system
description: "Maintain a coherent macOS or iOS inspired design system for canvas editors and tool-heavy interfaces. Use automatically for UI, theme, button, panel, toolbar, layout, onboarding, or canvas interaction changes across projects and frameworks."
---

# Canvas Editor Design System

Use this as a reusable design and implementation contract for canvas editors, whiteboards, and other dense creative tools. It is framework-agnostic: adapt to the project's existing framework, component library, styling system, canvas engine, and theme instead of assuming a particular stack.

This is an agent skill, not a runtime CSS plugin. It guides implementation decisions, and the bundle ships an optional runtime layer that the target project can import without adopting any framework.

## Bundle Layout

Copy the whole `design-system/` folder next to the skill in the target project:

```text
design-system/
├── skill/                 copy to   <project>/.agents/skills/canvas-editor-design-system/
├── tokens/tokens.css      import 1st  design tokens (--ds-*, --ds-ui-*)
├── tokens/tokens.json     machine-readable token source for JS/TS/build steps
├── styles/base.css        import 2nd  shell base for a `.editor-app` root
├── styles/primitives.css  import 3rd  framework-neutral `.ds-*` controls
├── styles/component-layer.css          full editor-shell parity (`.editor-*` widgets)
├── theme/vuetify-theme.js              Vuetify theme colors + component defaults
└── preview/index.html                  visual contract, open in a browser to verify
```

Import order is tokens → base → primitives → component layer. `component-layer.css` targets the editor shell's own `.editor-*` markup and is optional; `primitives.css` is the portable subset that works in any stack.

## Runtime Contract

- Never restyle a primitive locally. Compose `.ds-btn`, `.ds-field`, `.ds-segmented`, `.ds-panel`, `.ds-toolbar`, `.ds-chip`, `.ds-switch`, `.ds-slider`, `.ds-number` and rely on their modifiers (`--primary`, `--plain`, `--danger`, `--icon`, `--sm`, `--pill`, `is-selected`, `is-error`).
- Use token variables only: palette as `rgb(var(--ds-<name>))`, sizes from `--ds-ui-*`, spacing from `--ds-space-1..6`. No raw hex, no magic pixel gaps.
- Keep the control metrics locked: 34px buttons and icon buttons, 36px fields, 24px chips, 8px control radius, 6px field radius, 12px panel radius, 12px body / 11px small / 10px micro type.
- When the target project uses Vuetify, import `theme/vuetify-theme.js` and add `styles/component-layer.css` for exact parity instead of rewriting the primitives.
- Any new component must be added to `references/component-matrix.md` with its states and the tokens it consumes.

## Discover The Project First

Before editing, identify:

- the UI framework and component library;
- the styling and token source, such as CSS variables, Sass, theme config, or design-token files;
- the editor shell components for the top bar, rail, panels, toolbars, workspace metadata, and onboarding;
- the canvas engine and the module that owns viewport, zoom, pan, selection, and gestures;
- the project's lint, test, build, and visual verification commands.

Do not invent paths or replace the existing UI stack. Preserve unrelated user changes. Read the project adapter guidance in [references/project-adapter.md](references/project-adapter.md) when the stack or ownership boundaries are unclear.

## Token Contract

Use the project's existing token system. If it has no coherent token layer, introduce the smallest one that supports:

- primitives: palette, type scale, spacing, radii, elevation, opacity, and motion;
- semantics: canvas, chrome, surface, elevated surface, text, muted text, border, focus, primary, danger, and selection;
- components: control, toolbar, panel, rail, card, and overlay variants.

Keep palette values and component styling separate. A new project must be able to change its accent color or light/dark palette without rewriting the interaction rules. Avoid one-off raw colors, duplicated radii, and local magic spacing when an existing token can express the state.

## Visual Contract

- Use a light, calm macOS or iOS visual language when that is the product direction: layered white and cool-neutral surfaces, readable system text, and a clear accent for primary actions and selection.
- Treat the project's palette as configurable. Do not hard-code a specific Apple blue, gray, or background image into the skill.
- Use a consistent control radius. Use a pill radius for grouped controls and `50%` for circular icon buttons inside a pill.
- Keep group padding and gaps consistent. Prefer the project's spacing scale; a compact 4px group rhythm is a useful default for floating tool groups when no scale exists.
- Glass surfaces require a translucent fill, visible edge highlight, backdrop blur where supported, and restrained elevation. Do not use blur without transparency or make every surface equally translucent.
- Primary actions need a clear accent fill and readable content. Secondary actions use the project's elevated or glass surface. Plain actions stay quiet until hover. Destructive actions use the semantic danger color.
- Keep typography on a compact editor scale. Establish hierarchy through weight, contrast, and spacing before increasing font size.
- Define hover, focus-visible, active, selected, disabled, loading, and error states for every interactive control.

## Component Architecture

Map the existing product into these conceptual regions without forcing a particular component tree:

```text
Editor shell
├── top bar / document actions
├── tool rail or navigation
├── side panels and panel groups
├── canvas workspace and viewport
├── selection and contextual actions
└── onboarding, empty, and status surfaces
```

- Prefer shared primitives and semantic variants over per-panel CSS.
- Keep the action vocabulary small and explicit: primary, secondary, plain, and danger.
- Express card versus plain action surfaces through component APIs or semantic classes.
- Keep canvas geometry, viewport transforms, and gesture calculations in the canvas or viewport layer, never in a presentational button or toolbar component.
- Preserve keyboard focus, disabled semantics, accessible names, and tooltips for unfamiliar icon-only controls.
- Do not remove product functionality while changing presentation.

## Canvas Interaction Boundary

When a request changes zoom, pan, scrolling, selection, drag performance, or gestures:

1. Find the module that owns the canvas engine and viewport state.
2. Preserve the editor's coordinate model and event ownership.
3. Keep presentation components responsible only for commands and visual state.
4. Verify that zoom, pan, selection, scrolling, and drag behavior still work together.

For engine-specific APIs or architecture, use the matching engine skill when one is available. Do not move geometry calculations into CSS or UI components.

## Change Workflow

1. Identify the shared primitive or token that owns the requested behavior.
2. Confirm the project's adapter details before editing.
3. Update the token source before adding local overrides.
4. Apply the change through shared components or semantic classes.
5. Check all affected shell regions for consistency in radius, spacing, typography, color, elevation, and interaction states.
6. Run the project's relevant lint, test, build, and public/export checks. For visual changes, inspect the running page or equivalent preview when available.

Use the related-skill map in [references/skill-ecosystem.md](references/skill-ecosystem.md) to select specialized guidance without loading unrelated skills.

## Boundaries

- Do not add a new UI kit or CSS framework when the project already has one, unless the user explicitly requests a migration.
- Do not impose Vue, React, Vuetify, Tailwind, Sass, LeaferJS, or any other framework-specific API on another project.
- Do not change canvas zoom, pan, selection, or export behavior for a visual-only request.
- Do not turn a project-specific color, path, or component name into a universal rule.
- Keep comments short and explain only non-obvious design-system decisions.
