# Component Matrix

Every UI component in the editor shell, the states it must implement, and the tokens/primitives it must consume. Use this as the completeness checklist when porting the design system to another project: if a component is missing from this table, the port is incomplete.

## Shell regions

| Region | Components | Primitives |
| --- | --- | --- |
| Top bar | `EditorTopBar` | `.ds-btn`, `.ds-btn--primary`, `.ds-toolbar` |
| Tool rail | `EditorRail` | `.ds-btn--plain`, `.ds-btn--icon`, `aria-pressed` |
| Side panels | `EditorSidePanel`, `PanelGroup` | `.ds-panel`, `.ds-panel__header`, `.ds-panel__body` |
| Attribute inspector | `EditorAttributeDrawer`, `AttributeSection` | `.ds-field`, `.ds-number`, `.ds-segmented` |
| Canvas workspace | `CanvasWorkspace`, `CanvasScrollbars` | tokens only (no control styling) |
| Selection actions | `SelectionActionToolbar`, `SelectionLayerMenu` | `.ds-toolbar`, `.ds-btn--icon`, `.ds-btn--danger` |
| Onboarding / empty | first-run, empty-layer states | `.ds-panel`, `.ds-btn--primary` |

## Component checklist

| Component | Role | Required states | Consumed tokens |
| --- | --- | --- | --- |
| `EditorTopBar` | Document actions and global commands | default, hover, active, disabled | `--ds-ui-glass-*`, `--ds-ui-radius-control`, `--ds-ui-font-body` |
| `EditorRail` | Tool switching column | default, hover, selected, focus-visible, disabled | `--ds-ui-rail`, `--ds-ui-rail-border`, `--ds-primary` |
| `EditorSidePanel` | Panel container | default, scrolled, collapsed | `--ds-ui-panel`, `--ds-ui-radius-panel`, `--ds-ui-glass-shadow` |
| `PanelGroup` | Collapsible group inside a panel | expanded, collapsed, hover header | `--ds-ui-line`, `--ds-space-2/3`, `--ds-ui-font-title` |
| `EditorAttributeDrawer` | Floating inspector | open, closed, resizing | `--ds-ui-glass-fill`, `--ds-ui-radius-dialog`, `--ds-ui-workspace-shadow` |
| `AttributeSection` | Grouped attribute rows | default, disabled | `--ds-space-2`, `--ds-ui-font-small` |
| `PanelNumberField` | Numeric input | default, focus, invalid, disabled | `--ds-ui-radius-field`, `--ds-ui-input-font-size` |
| `CompactNumberField` | Dense numeric stepper | default, hover, active, disabled | `--ds-ui-control`, `--ds-outline` |
| `PanelSliderField` | Slider with label | default, dragging, focus, disabled | `--ds-primary`, `--ds-ui-control-shadow` |
| `PanelSegmentedControl` | Mode switch | default, selected, focus, disabled | `--ds-ui-radius-pill`, `--ds-ui-surface` |
| `SelectionActionToolbar` | Context toolbar | default, hover, active, destructive | `--ds-ui-glass-strong`, `--ds-ui-radius-pill`, `--ds-error` |
| `SelectionLayerMenu` | Layer quick actions | default, hover, disabled | `--ds-ui-surface`, `--ds-ui-line` |
| `LayerActionButtons` | Per-row actions | default, hover, danger, disabled | `--ds-ui-muted`, `--ds-error` |
| `LayerPreview` | Thumbnail | loaded, empty, error | `--ds-ui-line`, `--ds-ui-radius-field` |
| `LayersPanel` | Layer tree | default, selected, dragging, empty | `--ds-primary`, `--ds-ui-control` |
| `ArtboardPanel` | Canvas presets | default, selected, hover | `--ds-ui-panel`, `--ds-primary` |
| `ImagePanel` | Image attributes | default, loading, error | `--ds-ui-field-height`, `--ds-ui-hint` colors |
| `TextPanel` / `TextPropertiesEditor` | Typography controls | default, focus, invalid | `--ds-ui-font-*`, `--ds-ui-radius-field` |
| `ToolsPanel` | Tool grid | default, hover, selected, disabled | `--ds-ui-control`, `--ds-ui-radius-control` |
| `WatermarkPanel` | Watermark settings | default, enabled, disabled | `--ds-ui-glass-*`, `--ds-primary` |
| `ImagePropertiesEditor` | Image-specific inspector | default, loading, error | `--ds-ui-line`, `--ds-ui-muted` |
| `CanvasWorkspace` | Canvas host | idle, panning, zooming, dragging | `--ds-ui-workspace`, `--ds-ui-canvas`, `--ds-ui-grid` |
| `CanvasScrollbars` | Custom scrollbars | idle, hover, dragging | `--ds-outline`, `--ds-ui-radius-pill` |

## Primitive state contract

| Primitive | States that must exist in every project |
| --- | --- |
| `.ds-btn` | default, hover, focus-visible, active (press transform), selected (`aria-pressed`), disabled |
| `.ds-btn--primary` | as above plus accent fill, inset highlight, accent shadow |
| `.ds-btn--plain` | transparent until hover, muted text until hover |
| `.ds-btn--danger` | danger text, danger tint on hover |
| `.ds-segmented__item` | default, hover, selected, focus-visible, disabled |
| `.ds-input` / `.ds-select` / `.ds-textarea` | default, hover, focus ring, disabled, error (`.ds-field.is-error`) |
| `.ds-number__step` | default, hover, active, disabled |
| `.ds-slider` | default, focus ring, disabled, dragging |
| `.ds-switch__input` | off, on, focus ring, disabled |
| `.ds-chip` | default, selected |
| `.ds-panel` | default, header hover |
| `.ds-toolbar` | default, translucent (falls back to solid under `prefers-reduced-transparency`) |

Motion: all transitions are 160ms ease. Under `prefers-reduced-motion: reduce`, transitions and the press transform must be removed.
