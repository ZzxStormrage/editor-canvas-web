# 重构与回归防护待办

> 记录时间：2026-10-27　基线：`2ceafbc` + 工作区未提交改动（图片裁剪功能进行中）
> 用途：下一次改动前先读这份清单，按 P0 → P1 → P2 顺序推进。每完成一项就把 `[ ]` 改成 `[x]`，并在文末「变更记录」补一行。
> 本文件不在 `scripts/public-files.mjs` 的公开白名单内，不会随 `npm run export:public` 导出。

## 一、为什么要做这些

当前回归风险不来自"文件行数大"，而来自两类结构问题：

1. **同一件事有多份真相**：选区状态派生出三套读模型（图层列表 / 图片属性 / 选区工具条），各自有独立刷新链。
2. **序列化靠散弹式钩子**：`DocumentPlugin` 直接 `pluginManager.get(...)` 调 6 个外部钩子，新增一个元素属性要同时改 3 处，漏一处的后果是**静默丢数据**（因为历史、草稿、导入导出都压在 `export/load` 上）。

客观放大因素：测试只直接引用了 12 个纯函数/策略模块（`utils/*`、`scrollbar`、`PinchZoomStrategy`），而 `image-plugin.js`(1674) / `text-plugin.js`(1788) / `action-buttons.js`(1819) 三个最大文件**没有直接测试**。

## 二、热点清单（含证据）

| 排名 | 热点 | 证据位置 | 典型回归表现 |
| --- | --- | --- | --- |
| 1 | 选区派生出三套读模型 | `layer-plugin.js` 11 处手动 `_emitChanged()`；`useCanvasEditor.js` 8 处 `syncSelectionToolbar()`、5 处 `refreshImageCropProjection()` | 按钮可点但状态不更新；属性面板显示旧值 |
| 2 | 序列化散弹式钩子 | `document-plugin.js:180,181,197,211,229,261`；白名单 `utils/editor-document.js:6` | 新增字段导出丢失；撤销后属性消失 |
| 3 | 图片节点多源状态 | `image-plugin.js:279`(getFit) / `:323`(restore) / `:356`(activateDeferred) / `:825` / `:843` / `:862` | 裁剪后 `objectFit` 显示为 stretch；恢复时适配方式错乱 |
| 4 | 文本三基准 + 视觉补丁 | `text-plugin.js:172`(update) / `:224`(restore) / `:437`(sanitize)；三个 `*_KEY` 常量 | 文字跳位；导出残留 skew/stroke |
| 5 | 事件契约隐式 | 26 个事件名硬编码；`composables/canvas-editor/canvas-change-events.js` 只是数组 | 事件拼写错误无提示；`layers:changed` 空数组语义被误用 |
| 6 | 12 参构造 + 初始化顺序 | `core/Editor.js` 构造函数 12 个位置参数；`ArtboardManager` 在 `buildScene` 创建、`bootstrap` 才拿到 state | 加子系统要改 Builder + 构造函数 + 所有 `new Editor(...)` |
| 7 | 双份样式源 | `design-system/` 全仓库未被 `src` 引用（已 grep 确认），但它是从本仓库抽出的权威版 | 改 `editor-workbench.scss` 后 design-system 漂移，UI 不一致 |

## 三、P0：不改运行时行为，先止血

- [ ] **P0-1 事件名常量收敛**（暂缓）
  - 新增 `src/logic/events.js`，导出 `EDITOR_EVENTS`（26 个事件名常量）+ 每个事件的载荷 JSDoc。
  - 只做增量：先不替换现有字符串，避免大范围 diff。后续改到哪个文件就顺手替换哪个。
  - 验收：`npm run lint` 通过；新文件被 `src/index.js` 导出（可选）。
  - **暂缓原因**：现在加等于新增一份无消费者的死代码，事件字符串仍是唯一真相，反而多一处漂移源。等真正改动某个事件名时再引入并同步替换。

- [x] **P0-2 新增元素属性的 checklist 注释**
  - 在 `document-plugin.js` 文件头写 5 步清单：① 插件实现 `restore` 钩子 ② 插件提供读取器并由 `_serializeNode` 调用 ③ `DOCUMENT_METADATA_KEYS` 加键 ④ `validateDocumentNode` 补校验 ⑤ 补 round-trip 测试。
  - 背景：本次 `crop` 就漏过白名单一次，属于已发生的真实回归。

- [x] **P0-3 裁剪 round-trip 测试（优先）**
  - 落地为 `tests/image-crop-document.test.js`（3 个用例）：文档解析保留 `crop` 且不改原对象、非法 `crop` 抛错、Leafer 节点工厂剥离 `crop` 元数据、真实 `ImagePlugin + DocumentPlugin` 导出后 `crop/objectFit/sourceWidth/elementId/url` 完整保留并可再次解析。
  - 注意：裁剪后的图片 `objectFit` 序列化为 CSS `fill`（`stretch` 的 CSS 名），不是 `stretch`。

- [x] **P0-4 修复裁剪失效态（已知缺陷）**
  - 位置：`composables/canvas-editor/useImageCrop.js`。
  - 修法：抽出 `resetCropState()`，`commit` 成功、返回 `null`、抛异常三条路径都无条件复位视图状态（插件侧三条路径本来就都会结束会话）。
  - 回归测试：`src/composables/canvas-editor/tests/use-image-crop.test.js`（4 个用例）。

## 四、P1：一次重构换掉主要风险（需测试兜底）

- [ ] **P1-1 序列化钩子改注册表（收益最大）**
  - 目标：插件在 `bootstrap` 中 `registerSerializer({ type, serialize, restore, sanitize })`，`DocumentPlugin` 只遍历注册表，去掉 6 处 `pluginManager.get()`。
  - 影响文件：`document-plugin.js`、`image-plugin.js`、`text-plugin.js`、`svg-raster-cache-plugin.js`、`plugin-manager.js`。
  - 前置：P0-3 必须先绿。验收：`core-integration` + round-trip + `editor-document-images` 三组测试全绿。

- [ ] **P1-2 选区刷新合并**
  - 在 `useCanvasEditor.js` 内新增 `refreshSelection()`，把 8 处 `syncSelectionToolbar()` 收成一处 fan-out（内部仍调原函数，行为不变）。
  - 目的：以后加"选中态相关能力"只需接一处。

- [ ] **P1-3 图片状态单一读取入口**
  - 抽 `readImageState(node)` 作为唯一读取点，`getFit/getSource/getCropSettings/_getCropImageMapping` 全部从它派生。
  - 顺带修 `getFit()` 对裁剪图片返回 `stretch` 的语义问题（`image-plugin.js:279-295`）。
  - 注意：`_restoreNodeState` → 4 条恢复路径必须保持等价，先补测试再动。

- [ ] **P1-4 文本 patch 链显式化**
  - 把 `update()` 里的 `_applyTextEditConfig → _applyMeasuredUpdateWidth → _syncFontUrl → _applyTextPatchFallback → _applyVisualItalic → _applyVisualFontWeight` 改成 `TEXT_PATCH_STEPS` 数组（每步纯函数 + 名称），顺序显式化。
  - 目的：以后加文本属性只需 push 一步，不再靠读 1788 行猜顺序。

## 五、P2：结构性，收益大但成本高

- [ ] **P2-1 Editor 构造改 options 对象**：一次性改所有调用点（`EditorBuilder` + 测试），保留旧位置参数重载一个版本。
- [ ] **P2-2 端到端冒烟**：`选中图片 → 裁剪 → 提交 → 撤销 → 刷新恢复草稿`。这条链路横跨 6 个模块且目前零自动化保护，可用 Playwright。
- [ ] **P2-3 样式源归一**：决定 `design-system/` 是唯一源（src 引用 tokens）还是纯导出快照，二选一，消除双份真相。

## 六、改动前必须知道的硬约束

- **双 Leafer 不能合并**：`tree` 放内容（跟随缩放），`sky` 放选择框与控件（屏幕坐标）。选择框挂到缩放层会导致控件坐标系错乱。
- **只能写 `state.proxy`**：直接改 `EditorState` 的 raw 对象会绕过 clamp 校验和事件发布。
- **`showGrid` 与 `areaType` 互相赋值**：靠 `value !== old` 挡递归，但会产生一次重复的 `canvas:grid-visibility-changed`，新增非幂等监听时要注意。
- **插件之间不要新增直接调用**：现有 6 处 `pluginManager.get()` 是待偿还的债，不要再加第 7 处。
- **`EditorBuilder` 顺序**：`buildScene` 早于 `buildServices`，`ArtboardManager` 在 `bootstrap` 前拿不到 `state`，新方法必须做空判断。
- **画板外淡化是克隆整棵内容树**（`artboard.js:510-680`，32ms 批量刷新）：内容翻倍渲染，是性能热点，改这块要测节点数多的场景。

## 七、每次改完的验证

```sh
npm test          # node --test，纯函数 + 集成
npm run lint
npm run build
npm run check     # 以上三者 + check:public
```

若动了 `document-plugin` / `image-plugin` / `text-plugin`，额外手工回归：
1. 加文字 → 改字号/字体/字重 → 导出 JSON → 重新导入，样式与位置一致。
2. 加图片 → 裁剪 → 撤销 → 重做 → 刷新页面恢复草稿，裁剪结果保留。
3. 多选组合 → 解组 → 层级上移/下移 → 撤销，结构正确。

## 八、已修复问题（2026-10-27）

### 裁剪时拖动图片位置错乱

- **现象**：进入图片裁剪后拖动图片，图片会滑出裁剪框、横跨整个画板，看起来像"位置不对"。
- **根因**：`.image-crop-overlay__plane` 尺寸等于图片框，但内部 `<img>` 按 `mapping` 定位，`cover` 适配或 `panX/panY` 偏移后宽高会超出 plane；plane 没有 `overflow: hidden`，图片直接溢出。而遮罩（mask）只覆盖 plane 内部，溢出的部分既不被裁剪也不被压暗，视觉上就是"图跑到画板上了"。
- **修复**：
  1. `ImageCropOverlay.vue` 在 plane 内新增 `.image-crop-overlay__clip` 包裹 `<img>` 与四个 mask，`overflow: hidden` 把图片裁到图片框内；frame 与 8 个控制点留在 clip 外层，避免控制点被裁掉。
  2. `artboard.js` 的 `#getContentCloneSources` 增加 `(child.opacity ?? 1) > 0`，透明度为 0 的节点不再生成画板预览副本。
  3. `image-plugin.js` 的 `beginSelectedCrop` / `_restoreCropSession` 在改完原图透明度后调用 `artboard.syncAllElements()`，及时重建副本，避免原位留下"重影"。
- **验证**：Playwright 实测（1440×900）——图片加框内拖动 1:1 跟随，`img` 溢出 `clip` 264px 时视觉无溢出；缩小裁剪框后左侧遮罩正常压暗；提交/取消后 overlay 正确卸载、原图恢复显示。`npm run lint` / `npm test`(77) / `npm run build` 全绿。
- **未覆盖**：该路径仍无自动化测试，属于 P2-2 端到端冒烟的范围。

### 裁剪预览的交互细节调整（同日第二轮）

- **框外保留整图**：把裁剪预览的裁剪范围从「图片框」改成「图片内容框」。`.image-crop-overlay__clip` 现在按 `contentBox`（含 zoom / panX / panY）定位与定尺，遮罩也改为「内容框减裁剪框」计算，因此拖动或放大后超出裁剪框的部分仍然可见，只是被压暗（rgba(18,20,25,0.48)）。
- **控制条跟随选框**：`.image-crop-controls` 从「固定在画布底部居中」改为跟随裁剪框——用 `controlsStyle` 按投影基向量算出裁剪框的屏幕矩形，贴在框下方 10px 居中，下方放不下时翻到上方，并钳制在宿主内；同时把尺寸压到与 `.selection-action-toolbar` 一致（高度 42px、padding 4px、gap 4px、按钮 32px），滑杆宽度收到 96px 以内，整条宽度约等于裁剪框宽度。
- **图标统一**：工具栏裁剪按钮由 `mdi-crop`（未在 `plugins/vuetify.js` 的映射表里，会回退成通用的 Shapes 图标）改为 `mdi-crop-free`（映射到 Lucide `Crop`），与「自动裁剪」按钮同一个字形，尺寸统一为 18。
- **提示条**：保持在画布底部 84px 居中，避开底部缩放工具条与浮动的控制条。

### 裁剪交互修正（同日第三轮）

- **拖框不再拖动图片**：`frame` 的 `pointerdown` 原先直接走 `startImageDrag`，导致拖裁剪框时图片跟着动。现在改为 `startCropMove`：裁剪框还有移动空间时平移裁剪框（`moveCrop`，钳制在图片框内、尺寸不变）；裁剪框占满图片框时没有移动空间，退化为拖图片，避免进入裁剪后无法调整取景。
- **拖图片的入口改到压暗区**：`.image-crop-overlay__clip` 从 `pointer-events: none` 改为 `auto` 并绑定 `startImageDrag`，框外的压暗图片区域可拖动取景；裁剪框在上层，互不干扰。
- **进入裁剪隐藏官方选区**：`beginSelectedCrop` 增加 `innerEditor.cancel()`。官方编辑框、缩放控制点、旋转按钮、操作按钮都跟随选区显隐，取消选区后整体消失，不会与裁剪遮罩叠在一起；提交和取消路径原本就会重新 `select(image)`，选区可正常恢复。
- **滑杆加长**：`.image-crop-controls__zoom` 宽度改回 `clamp(150px, 18vw, 200px)`（上一轮为了压缩宽度收到 96px，实际手感太短）。
- **控制条间距**：`CONTROLS_GAP` 从 10 调到 18，避开裁剪框向下探出 9px 的边中点控制点。

### 裁剪会话失效与工具条遮挡（同日第五轮）

- **裁剪中撤销/删除/打开项目后遮罩卡死**：撤销会重建文档、销毁裁剪目标节点，但裁剪会话只认自己的提交/取消，视图层仍停在失效投影上（实测撤销后 `overlay: 1` 而图层已清空）。
  - 修复：`ImagePlugin` 监听 `document:loaded` / `document:cleared` / `selection:deleted` / `layers:changed`，目标节点被销毁或脱离父级时调用 `_restoreCropSession(false, 'target-lost')`；`_restoreCropSession` 统一广播 `image:crop-ended`（带 `reason`），`useCanvasEditor` 订阅后复位视图状态。
  - `useImageCrop.refreshImageCropProjection()` 在投影为 `null` 时也主动退出，作为第二道兜底。
  - 实测：裁剪中 Cmd+Z、图层面板删除、打开项目三种路径遮罩均自动关闭。
- **裁剪时画布缩放按钮点不动**：遮罩 `inset: 0` 且 `pointer-events: auto`，盖住了 `.workspace-meta`（z-index 2）。修复：裁剪期间给工作区加 `.canvas-workspace-panel--cropping`，把 `.workspace-meta` 提到 `z-index: 7`；同时 `controlsStyle` 预留底部 68px（`WORKSPACE_TOOLBAR_RESERVE`），控制条不会滑到工具条底下。实测裁剪中点击放大，画布 100% → 101%，遮罩/裁剪框/控制条同步跟随。

### 裁剪边界与角点缩放（同日第六轮）

- **裁剪框只能在原节点框内移动**：`moveCrop` / `resizeCrop` 的边界取的是「图片节点框」（`frameWidth/frameHeight`）。放大图片（滑杆 > 100%）或 cover 适配后，内容会超出节点框，这些区域明明有像素却移不过去。
  - 修复：新增 `cropBounds`（= 当前内容框，随 zoom / pan 变化），移动与八个控制点都改为按内容范围钳制；`pointerMode` 在按下时快照 bounds，拖动过程中内容变化也不会串。
  - 实测：200% 放大后把裁剪框左移，`frame.x` 从 762 → 672，越出了 `plane.x = 762` 的原节点框。
- **裁剪结果带空白**：初始裁剪框固定为整框，`contain` 适配（或内容小于节点框）时框内包含上下留白，提交后节点带着透明边，选中时选框把空白也圈进去。
  - 修复：新增 `createInitialCropRect()` 取「节点框 ∩ 内容范围」作为初始框（`contain` 时自动内缩到图片实际像素）；`resetCrop`（自动裁剪）复用同一函数；提交时 `normalizeImageCropRect` 传入内容 bounds，保证结果一定被像素覆盖。
  - 实测：`contain` 的 300×300 节点、内容 300×225 → 初始裁剪框 529×396（= 内容），提交后节点 300×225，长宽比 1.333 与源图一致，无空白。
- **裁剪后拖选框角点缩放无效**：裁剪后的图片用 `fill.mode = 'clip'` 渲染，`scale/offset` 是绝对局部坐标，拖角点只改外框尺寸，内容不跟着缩放，看起来像「缩放没反应 / 冒出空白」。
  - 修复：`ImagePlugin` 监听 `EditorScaleEvent.SCALE`，用 `_cropFrameSizes` 记录上一次外框尺寸，按比例同步缩放 `crop.scaleX/scaleY` 与 `offsetX/offsetY`；基准在 `_setImageCropResource` 与提交时写入。
  - 实测：裁剪后 209×225 → 拖角点放大到 279×286，`crop.scaleX` 从 0.375 同步到 0.476。
- **裁剪控制点偏大**：`.image-crop-overlay__handle` 原为 17px（2px 白边、黑底），比官方选区的控制点（`config/index.js`：`pointSize: 10`）明显粗一圈。改为 10px、`box-sizing: border-box`、1px 白边，八个方向的偏移量从 `-9px` 收到 `-5px`（边中点 `calc(50% - 5px)`）；`CONTROLS_GAP` 同步 18 → 14，避免控制条离框太远。
  - 保持裁剪自己的黑底白边配色，**不要**改成选区那种白底蓝边（`#4A90D9`）——试过，用户要求撤回。

### 缩放锚点与提交边界（2026-10-28）

- **放大后移动裁剪框会带着图片一起动**：`contentBox` 的缩放锚点用的是「裁剪框中心」（`centerX = crop.left + crop.width / 2`），裁剪框一移动锚点就跟着移动，内容随之平移；放大倍数越高越明显，而且因为边界也跟着漂移，会让人以为「裁剪框被限制住了」。
  - 修复：新增 `getImageCropContentBox()`，锚点固定为**图片框中心**（`frameWidth / 2`），与裁剪框位置完全解耦；`contentBox` 与 `createImageCropTransform()` 共用它，预览与提交不会再各算一套。
  - 实测：200% 放大后拖动裁剪框 80px，`clip`（图片内容）位移 0；裁剪框可一路移到 `plane.x` 之外，覆盖整个缩放后的内容范围。
- **放大后提交被截断**：`commitSelectedCrop` 的钳制边界传的是**未缩放**的 mapping（`mapping.left/width`），而预览里看到的是缩放后的内容框，两者不一致 → 可见裁剪框 210×225，提交出来只有 60×205。
  - 修复：提交时同样用 `getImageCropContentBox({ mapping, zoom, panX, panY })` 作为 bounds。
  - 实测：同一操作下提交结果从 60×205 修正为 210×225，与选框一致。

### 裁剪缩放滑杆样式（2026-10-28）

- 按参考图（2x 截图，244×76）重做 `.image-crop-controls__zoom`：
  - 去掉滑杆前的图标（模板里只剩 `input` + 百分比）。
  - 轨道 `appearance: none` 自绘：高 **6px**、`border-radius: 999px`；已填充用主题主色，未填充 `rgba(120,120,128,0.28)`，通过 `--zoom-progress` 变量驱动 `linear-gradient` 断点（`zoomProgress` 由 `MIN_ZOOM/MAX_ZOOM` 计算）。
  - 圆钮：**18px 纯白圆**、无描边、`0 2px 6px rgba(28,28,30,0.28)` 柔和投影 —— 与参考图 36px/2x 实测一致。
  - 拖拽态（`:active`）：`background: rgba(255,255,255,0.46)` + `backdrop-filter: blur(10px) saturate(180%)` + 内阴影高光 + `scale(1.06)`，做透明玻璃质感。
  - **踩坑**：① `transform: scale()` 在 `::-webkit-slider-thumb` 上不生效，Chrome 只认有限属性；② 拖动 range 圆钮时 `input:active` **不会命中**，`:active` 驱动的拖拽态永远不触发。最终改为 `pointerdown` 打 `.is-dragging` 类 + 直接改 `width/height`（18 → 21px，`margin-top` -6 → -7.5px 保持居中），transitions 里去掉 transform。
  - Firefox 同步补了 `::-moz-range-track` / `::-moz-range-thumb`。
- 校验方式：截图后用 Pillow 量像素（圆钮静止 18px、拖拽 21px —— 注意红色标记法的圆钮中间有 1px 白边，量到 19px 要加回边框；轨道 12px@2x=6px；拖拽态圆钮内透出蓝色 `(160,207,254)`）。

### 画布点阵跟随缩放（2026-10-28）

- **要改的是 `area.js` 而不是 SCSS**：可见点阵画在 `.leafer-app-view`（Leafer 交互 DOM）的行内样式上，`.canvas-workspace-panel` 的 CSS 点阵被它不透明底色盖住，改 SCSS 没用。
- 点距从 `grid.size`（24 → **20**，更密）乘以画布缩放，取整到 1px；圆点半径固定 `1.35px`（屏幕像素，不随缩放变大）。
- 缩放同步：`EditorBuilder#bindAreaState` 订阅 `viewport:zoom-changed`，把 `state.zoom` 传进 `updateArea`。
- 性能三道闸：
  1. rAF 合并（`scheduleArea`，一帧最多一次写样式）；
  2. `appliedStyles` 比对上次写入值，点距取整后没变就**完全跳过 DOM 写**；
  3. 点距下限 `MIN_DOT_STEP = 10px`，缩到 50% 以下不再继续加密，避免点粘连成灰噪 + 无意义的连续重绘。
- 实测：100%→20px、120%→24px、80%→16px、20%→10px（下限）；连点 10 次 +1% 缩放只触发 **4 次** style 写入（而非 10 次）。

## 九、变更记录

| 日期 | 完成项 | 备注 |
| --- | --- | --- |
| 2026-10-27 | — | 建立清单，未开始改动 |
| 2026-10-27 | 修复裁剪拖动溢出与画板克隆重影 | 见「八、已修复问题」；P0-4 的失效态仍未修 |
| 2026-10-27 | 裁剪框外保留压暗整图 + 控制条跟随选框 + 图标统一 | 见「八」第二轮；`editor-workbench.scss` 保持 CRLF |
| 2026-10-27 | 拖框/拖图分流 + 裁剪时隐藏官方选区 + 滑杆加长 | 见「八」第三轮 |
| 2026-10-27 | P0-2 / P0-3 / P0-4 完成 | 新增 7 个测试（84 通过）；P0-1 暂缓，原因见条目 |
| 2026-10-27 | 裁剪会话失效自动退出 + 裁剪中工具条可点 | 见「八」第五轮；测试 86 通过 |
| 2026-10-27 | 裁剪边界改用内容范围 + 角点缩放联动 | 见「八」第六轮；测试 89 通过 |
| 2026-10-28 | 缩放锚点改图片框中心 + 提交边界对齐预览 | 见「八」；测试 91 通过 |
| 2026-10-28 | 裁剪缩放滑杆改 iOS 风格（去图标/白色圆钮/拖拽放大玻璃态） | 见「八」；按参考图像素测量还原 |
| 2026-10-28 | 画布点阵加密并跟随缩放（点距 24→20，半径不变，rAF + 去重） | 见「八」；10 次缩放仅 4 次样式写入 |
