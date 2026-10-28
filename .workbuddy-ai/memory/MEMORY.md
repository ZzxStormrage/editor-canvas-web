# 项目长期记忆 · zzx-editor (canvas-editor)

## 重构待办的位置
- 所有"需要改动 / 易回归"的条目统一记在 `docs/refactor-backlog.md`（P0/P1/P2 分级 + 勾选 + 证据行号 + 变更记录）。
- 下次做重构或加功能前先读它，完成后更新勾选和文末「变更记录」。
- 该文件不在 `scripts/public-files.mjs` 公开白名单内，不会被导出。

## 不可违反的硬约束
- 双 Leafer：`tree` 放内容（跟随缩放），`sky` 放选择框/控件（屏幕坐标），不能合并。
- 只能写 `state.proxy`；直接改 raw 会绕过 clamp 与事件。
- `EditorBuilder` 的 `buildScene` 早于 `buildServices`，`ArtboardManager` 在 `bootstrap` 前没有 `state`。
- 插件之间不再新增 `pluginManager.get()` 直接调用（现有 6 处是待偿还的债）。
- 新增元素属性必须同步：插件钩子 + DocumentPlugin 调用 + `DOCUMENT_METADATA_KEYS` + 恢复路径 + round-trip 测试。

## 已知缺陷（未修）
- 暂无（裁剪失效态已于 2026-10-27 修复，见下）。

## 测试基线
- `npm test` = 89 个用例。新增：`tests/image-crop-document.test.js`（文档 round-trip）、`src/composables/canvas-editor/tests/use-image-crop.test.js`（裁剪会话状态）、`tests/image-crop.test.js` 扩充初始框与 bounds 用例。

## 已修复
- 2026-10-27 裁剪拖动溢出：`ImageCropOverlay.vue` 增加 `.image-crop-overlay__clip`（overflow hidden）包裹 img+mask；`artboard.js#getContentCloneSources` 排除 opacity<=0；begin/restore 时同步画板副本。详见 `docs/refactor-backlog.md` 第八节。
- 2026-10-27 裁剪交互：clip 改按 contentBox 定位（框外整图可见+压暗）；控制条跟随裁剪框（贴下方 18px、尺寸对齐选区工具条）；裁剪图标改 `mdi-crop-free`。
- 2026-10-27 裁剪交互分流：拖 `frame` = 移动裁剪框（占满时退化为拖图）；拖 `.image-crop-overlay__clip`（压暗区）= 平移图片；进入裁剪时 `innerEditor.cancel()` 隐藏官方选区与按钮。

## 裁剪交互模型（改动前先看，别打乱）
- `frame`（裁剪框）：`startCropMove` → 移动框；8 个控制点 → `startResize` 改框尺寸。
- `.image-crop-overlay__clip`（图片内容框，含压暗区）：`startImageDrag` → 平移图片。
- 三者共用 `pointerMode`，靠 `type: 'crop' | 'resize' | 'image'` 分流；`event.target !== event.currentTarget` 保证只响应自身。
- 会话结束统一走 `_restoreCropSession(restore, reason)` → 广播 `image:crop-ended` → 视图层 `handleCropEnded` 复位。目标丢失由 `_endCropIfTargetLost()` 兜底（监听 document/selection/layers 事件）。
- 裁剪期间 `.workspace-meta` 被提到 z-index 7，否则缩放按钮被遮罩挡住。

## 裁剪坐标系（最容易搞混）
- `frameWidth/Height` = 图片**节点框**；`contentLeft/Top/Width/Height` = 图片**实际内容范围**（随 fit 变化）。
- **缩放锚点固定为图片框中心**（`getImageCropContentBox`），不能用裁剪框中心——否则移动裁剪框会带着图片一起平移。预览与提交必须共用这个函数，否则放大后提交会被截断。
- 裁剪框的活动边界用**缩放后的内容框**，不是 frame：放大/cover 后内容会超出节点框，必须能裁过去；内容之外没有像素，越界就会出空白。
- 初始裁剪框 = `createInitialCropRect()`（frame ∩ content），`contain` 适配时自动内缩。
- 裁剪后用 `fill.mode='clip'`，scale/offset 是**绝对局部坐标**；拖角点改外框尺寸不会缩放内容，必须由 `_handleCropFrameScale` 按比例同步。
- 裁剪控制点（`.image-crop-overlay__handle`）10px、**黑底白边**，只对齐选区圆点的尺寸，不要改成白底蓝边（用户明确撤回）。

## 文件编码坑
- `src/assets/scss/editor-workbench.scss` 是 **CRLF**。不要用 Python 文本模式整体改写（会全转 LF，diff 爆炸）。用 Edit 工具，或二进制读写后再 `grep -c $'\r'` 校验。
- `src/plugins/vuetify.js` 用 `mdi-*` 名映射 Lucide 图标；未登记的 `mdi-*` 会回退成通用 Shapes 图标（`mdi-crop` 就是这种情况）。新增图标必须先在那里登记。

## 浏览器验证方式
- 本机有 Playwright Chromium 缓存：`~/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`。
- `playwright-core` 装在 `/Users/zzx/.workbuddy-ai/binaries/node/workspace`；脚本必须放在该目录内运行（ESM 不认 NODE_PATH）。
- 加图片用 `.canvas-workspace-panel > input[type="file"]`（侧栏那个 input 是画板背景图）。

## 验证命令
`npm test` → `npm run lint` → `npm run build` → `npm run check`
