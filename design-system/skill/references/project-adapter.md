# Project Adapter Guide

The design-system skill is reusable because the implementation details are discovered per project. Before making a change, build a small adapter map from the repository rather than assuming the current project's paths.

## Adapter Map

Record these facts in working notes, not in the shared skill:

| Concern | What to locate |
| --- | --- |
| UI stack | Framework, component library, router, and state layer |
| Styling | Global stylesheet, theme provider, CSS variables, Sass, Tailwind, or token package |
| Shell | Top bar, rail/navigation, side panel, workspace, toolbar, and onboarding components |
| Canvas | Canvas engine, viewport owner, scene graph, selection manager, and gesture handlers |
| Tokens | Primitive, semantic, and component token sources |
| Verification | Lint, unit/integration tests, build, preview, and screenshot checks |

## Adaptation Rules

- Reuse the project's existing button, panel, icon, and focus primitives.
- Map the visual contract to the project's token syntax instead of adding a second token system.
- If the project has no tokens, create a minimal semantic layer in the location that the project already uses for global styles.
- Keep framework-specific implementation details in project code or a project-local adapter, never in this reusable skill.
- If a canvas engine has a dedicated skill, load it only for engine behavior or architecture work.

## Current Repository Example

This repository happens to use Vue, Vuetify, Sass, and LeaferJS. Those are an adapter example, not requirements of this skill. A different project may use React, CSS Modules, Tailwind, another canvas engine, or no UI kit at all.
