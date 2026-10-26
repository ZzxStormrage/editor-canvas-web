# Skill Ecosystem

The design-system skill is the reusable baseline. Use specialized skills only when the request needs their domain guidance.

| Skill | Use it for | Relationship |
| --- | --- | --- |
| `canvas-editor-design-system` | Shared visual language, tokens, shell components, controls, panels, and canvas-editor UX | Automatically discoverable baseline |
| `canvas-editor-core` | Canvas engine APIs, viewport transforms, command/history behavior, event buses, plugins, and scene layout | Load for canvas architecture or interaction logic |
| `design-system` | Primitive/semantic/component token architecture and token validation | Load when establishing or auditing a token system |
| `impeccable` | Visual audit, hierarchy, accessibility, responsive behavior, motion, and interaction polish | Load for a broad UI critique or redesign |
| `ui-ux-pro-max` | Searchable UI patterns, palettes, typography, icons, and stack-specific recommendations | Load when exploring alternatives or benchmarking patterns |
| `ui-styling` | Component implementation guidance for projects using its supported UI approach | Load only when it matches the target project's stack |
| `skill-creator` | Creating, validating, or revising Skills | Load when changing this Skill or another Skill |

These skills are complementary. Do not replace the target project's framework or install a UI kit merely because a related skill is available.
