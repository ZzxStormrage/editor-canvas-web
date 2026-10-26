# macOS Canvas Design System · 可移植包

从 [zzx-editor](https://github.com/ZzxStormrage/editor-canvas-web) 的编辑器外壳中抽取的 macOS / iOS 风格设计系统。包含**约束文档（Skill）**、**设计 Token**、**框架无关控件**、**Vuetify 主题适配**和**可视化验收页**，可直接搬到任意 Vue / React / 原生项目。

## 目录

| 路径 | 作用 | 是否必需 |
| --- | --- | --- |
| `skill/` | Skill 文档，复制到目标项目 `.agents/skills/canvas-editor-design-system/` | 建议 |
| `tokens/tokens.css` | `--ds-*` 调色板（`R,G,B` 三元组）+ `--ds-ui-*` 语义/尺寸 Token | **必需** |
| `tokens/tokens.json` | 机器可读 Token，供 JS/TS 或构建脚本使用 | 可选 |
| `styles/base.css` | `.editor-app` 外壳基础（背景、字体、全屏布局） | 使用编辑器外壳时必需 |
| `styles/primitives.css` | `.ds-*` 控件：按钮/字段/分段控件/滑块/开关/标签/面板/工具栏 | **必需**（非 Vuetify 项目） |
| `styles/component-layer.css` | 24 个 `editor-shell` 组件的完整样式（依赖 `.editor-*` 类名） | 复用编辑器外壳时 |
| `theme/vuetify-theme.js` | Vuetify 主题色 + 组件默认 props | Vuetify 项目 |
| `preview/index.html` | 全部控件与状态的可视化验收页 | 验收用 |

## 安装（3 步）

```bash
# 1. 复制整个包
cp -R design-system ~/path/to/target-project/

# 2. 复制 Skill（供 AI 自动遵守）
mkdir -p ~/path/to/target-project/.agents/skills/canvas-editor-design-system
cp -R design-system/skill/* ~/path/to/target-project/.agents/skills/canvas-editor-design-system/

# 3. 在入口样式里按顺序引入
```

```css
/* main.css 或 index.css，顺序不可颠倒 */
@import './design-system/tokens/tokens.css';
@import './design-system/styles/base.css';         /* 可选：使用 .editor-app 外壳时 */
@import './design-system/styles/primitives.css';
/* @import './design-system/styles/component-layer.css';  复用编辑器外壳时 */
```

根节点加 `class="editor-app"`（使用 base.css 时）。

### Vuetify 项目

```js
import { EDITOR_THEME_NAME, EDITOR_THEME_COLORS, EDITOR_COMPONENT_DEFAULTS } from './design-system/theme/vuetify-theme.js';

createVuetify({
  theme: { defaultTheme: EDITOR_THEME_NAME, themes: { [EDITOR_THEME_NAME]: { dark: false, colors: EDITOR_THEME_COLORS } } },
  defaults: EDITOR_COMPONENT_DEFAULTS
});
```

Vuetify 的 `--v-theme-*` 变量会与 Token 对齐；再引入 `component-layer.css` 即可获得与本项目完全一致的按钮/字段/面板外观。

## 用法

```html
<button class="ds-btn ds-btn--primary">主要操作</button>
<button class="ds-btn">次要操作</button>
<button class="ds-btn ds-btn--plain ds-btn--icon" aria-label="更多">⋯</button>

<div class="ds-segmented">
  <button class="ds-segmented__item is-selected">设计</button>
  <button class="ds-segmented__item">预览</button>
</div>

<label class="ds-field">
  <span class="ds-field__label">宽度</span>
  <input class="ds-input" />
</label>
```

## 保持一致性的硬约束

1. **只用 Token**：颜色写 `rgb(var(--ds-primary))` / `rgba(var(--ds-primary), 0.16)`，尺寸写 `--ds-ui-*`，间距写 `--ds-space-1..6`。禁止裸 `#hex` 和魔法像素间距。
2. **控件尺寸锁定**

   | 项 | 值 | Token |
   | --- | --- | --- |
   | 按钮 / 图标按钮高度 | 34px | `--ds-control-height` |
   | 输入框高度 | 36px | `--ds-ui-text-field-height` |
   | Chip 高度 | 24px | — |
   | 控件圆角 | 8px | `--ds-ui-radius-control` |
   | 输入框圆角 | 6px | `--ds-ui-radius-field` |
   | 面板圆角 | 12px | `--ds-ui-radius-panel` |
   | 弹层圆角 | 16px | `--ds-ui-radius-dialog` |
   | 胶囊圆角 | 999px | `--ds-ui-radius-pill` |

3. **字号锁定**：正文 12px、标题 13px、小号 11px、微号 10px；输入框内文字 13px。层级优先靠字重（600）和对比度，不靠加大字号。
4. **间距节奏**：以 4px 为基准（4 / 8 / 12 / 16 / 24 / 32），组内用 4–8px，组间用 12–16px。
5. **动效统一**：160ms ease；`prefers-reduced-motion: reduce` 时禁用过渡与按压缩放。
6. **玻璃质感**：必须同时具备半透明填充 + 边缘高光 + 背景模糊 + 克制阴影；不允许「无透明的模糊」，也不允许所有表面同样透明。
7. **状态齐全**：每个可交互控件都要有 hover / focus-visible / active / selected / disabled，表单还要有 error。

## 验收

```bash
open design-system/preview/index.html
```

预览页罗列了全部调色板、按钮变体与状态、分段控件、字段（含错误/禁用）、滑块、开关、玻璃面板。移植到新项目后，用同样的清单逐项比对；`skill/references/component-matrix.md` 是组件 × 状态 × Token 的完整对照表。

## 框架适配

| 目标项目 | 做法 |
| --- | --- |
| Vue + Vuetify | `vuetify-theme.js` + `component-layer.css`，视觉 1:1 |
| Vue + Element Plus / Ant Design | 只引 `tokens.css` + `primitives.css`，用 `.ds-*` 类替换组件；主题变量映射到各库的 token |
| React / 原生 | 同上，`.ds-*` 为纯 CSS 类，无框架依赖 |
| 需要复用整套编辑器外壳 | 额外引入 `component-layer.css`，并保留 `.editor-app` 根类与 `.editor-*` 结构 |

## 已知边界

- `component-layer.css` 是编辑器外壳的完整样式，其中约 85 行针对 Vuetify 运行时类（`.v-btn`、`.v-field` 等），在非 Vuetify 项目中不会生效但不报错；等价外观请用 `primitives.css`。
- 目前只有浅色主题；Token 已按语义命名，扩展深色主题时只需覆盖 `--ds-*` 调色板，不要改组件 CSS。
- `preview/index.html` 通过 `file://` 直接打开即可，无需构建。
