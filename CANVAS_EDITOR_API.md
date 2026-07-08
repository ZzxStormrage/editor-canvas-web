# canvas-editor-core 外部 API 文档

本文档整理当前 `src/canvas-editor-core/src/index.js` 对外导出的模块，以及通过
`createEditor()` / `init()` 创建出的编辑器实例可以调用的方法。

## 运行示例

当前项目是 Vite + Vue，启动后可以直接在 `src/App.vue` 中按示例调用。

```bash
npm run dev
```

```js
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createEditor } from './canvas-editor-core/src/index.js'

const canvasRef = ref(null)
let editor = null

onMounted(() => {
  editor = createEditor({
    view: canvasRef.value,
    autoResize: true,
    artboard: {
      width: 375,
      height: 667,
      overflowOpacity: 0.2
    }
  })
})

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
```

## 入口 API

### `createEditor(options)`

创建并返回一个 `Editor` 实例，是推荐使用的初始化入口。

```js
import { createEditor } from './canvas-editor-core/src/index.js'

const editor = createEditor({
  view: document.querySelector('#canvas'),
  width: 750,
  height: 1334,
  autoResize: true
})
```

常用 `options`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `view` | `HTMLElement \| string` | 挂载编辑器的 DOM 容器或选择器。 |
| `width` | `number` | 外层画布宽度。 |
| `height` | `number` | 外层画布高度。 |
| `autoResize` | `boolean` | 是否跟随容器尺寸自动调整。 |
| `background` | `string` | 外层画布背景色。 |
| `showGrid` | `boolean` | 是否显示网格。 |
| `areaType` | `'grid' \| 'blank'` | 外层区域显示类型。 |
| `zoom` | `Object` | 缩放配置，包含 `min`、`max`、`step`、`initial`。 |
| `image` | `Object` | 图片新增默认配置。 |
| `text` | `Object` | 文本新增默认配置。 |
| `artboard` | `Object` | 内层白色画板配置。 |
| `editor` | `Object` | Leafer 官方 Editor 与自定义控件配置。 |
| `leaferOptions` | `Object` | 透传给 Leafer App 的底层配置。 |

### `init(options)`

`createEditor(options)` 的兼容别名，旧代码可以继续使用。

```js
import { init } from './canvas-editor-core/src/index.js'

const editor = init({ view: canvasRef.value })
```

## Editor 实例属性

```js
const editor = createEditor({ view: canvasRef.value })
```

| 属性 | 说明 |
| --- | --- |
| `editor.leafer` | Leafer App 根实例，高级调试使用。 |
| `editor.stage` | 缩放容器。 |
| `editor.contentLayer` | 可编辑内容层，图片、文本等元素都在这里。 |
| `editor.skyLeafer` | 官方 Editor 覆盖层。 |
| `editor.state` | 编辑器状态代理，读取当前宽高、缩放、配置等。 |
| `editor.eventBus` | 事件总线。 |
| `editor.pluginManager` | 插件管理器。 |
| `editor.image` | 图片插件实例。 |
| `editor.text` | 文本插件实例。 |
| `editor.editor` | Leafer 官方 Editor 实例。 |
| `editor.artboard` | 内层白色画板管理器。 |
| `editor.commands` | 命令管理器。 |
| `editor.selectedElements` | 当前选中的元素列表。 |
| `editor.isEditing` | 是否处于编辑中。 |
| `editor.isMultipleSelect` | 是否多选。 |
| `editor.zoom` | 当前缩放值，兼容旧代码，推荐读 `editor.state.zoom`。 |

## 画布与画板

### `editor.resize(width, height)`

调整外层画布尺寸。

```js
editor.resize(750, 1334)
```

### `editor.setBackground(color)`

设置外层画布背景色。

```js
editor.setBackground('#f7f8fa')
```

### `editor.setShowGrid(show)`

显示或隐藏网格。

```js
editor.setShowGrid(false)
```

### `editor.setAreaType(type)`

设置外层区域类型。

```js
editor.setAreaType('grid')
editor.setAreaType('blank')
```

### `editor.setGrid(options)`

合并更新网格配置。

```js
editor.setGrid({
  size: 24,
  color: '#eef1f5',
  majorSize: 120,
  majorColor: '#dce2ea'
})
```

### `editor.setArtboardSize(width, height)`

调整当前白色画板尺寸。后续新增图片、文本默认会以白色画板作为操作区域。

```js
editor.setArtboardSize(375, 667)
```

### `editor.artboard.getContentBounds()`

获取白色画板在内容坐标系下的边界。

```js
const bounds = editor.artboard.getContentBounds()
// { x, y, width, height }
```

### `editor.artboard.getWorldBounds()`

获取白色画板在世界坐标系下的边界，吸附和高级命中计算可使用。

```js
const worldBounds = editor.artboard.getWorldBounds()
```

## 缩放

### `editor.setZoom(zoom)`

设置缩放值，会被 `zoom.min` / `zoom.max` 自动钳位。

```js
editor.setZoom(1.5)
```

### `editor.zoomIn(step)`

放大画布，不传 `step` 时使用配置里的 `zoom.step`。

```js
editor.zoomIn()
editor.zoomIn(0.2)
```

### `editor.zoomOut(step)`

缩小画布。

```js
editor.zoomOut()
```

### `editor.resetZoom()`

重置为初始化缩放值。

```js
editor.resetZoom()
```

### `editor.zoomTo(zoom)`

`setZoom(zoom)` 的兼容别名，新代码推荐使用 `setZoom()`。

## 选择

### `editor.select(target)`

选中指定 Leafer 元素。

```js
const text = await editor.text.add('标题')
editor.select(text)
```

### `editor.deselect()`

取消选中。

```js
editor.deselect()
```

### `editor.addToSelection(item)`

把元素加入当前选区。

```js
editor.addToSelection(node)
```

### `editor.removeFromSelection(item)`

从当前选区移除元素。

```js
editor.removeFromSelection(node)
```

## 图片

图片能力通过 `editor.image` 调用。

### `editor.image.add(source, options)`

添加图片，支持 URL、`File`、`Blob`、SVG 字符串。返回 Leafer `Image` 节点。

```js
const image = await editor.image.add('/demo.png')

const file = input.files[0]
await editor.image.add(file, {
  x: 100,
  y: 120,
  width: 240,
  lockRatio: true
})
```

常用 `options`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `x` | `number` | 图片 x 坐标。 |
| `y` | `number` | 图片 y 坐标。 |
| `width` | `number` | 图片宽度。 |
| `height` | `number` | 图片高度。 |
| `maxWidthRatio` | `number` | 未传宽高时，相对操作区域的最大宽度占比。 |
| `maxHeightRatio` | `number` | 未传宽高时，相对操作区域的最大高度占比。 |
| `lockRatio` | `boolean` | 是否保持宽高比。 |

### `ImagePlugin.normalizeOptions(image, baseImage)`

归一化图片插件配置。通常业务层不需要直接调用，做插件扩展或配置面板校验时可使用。

```js
import { ImagePlugin, DEFAULT_CANVAS_CONFIG } from './canvas-editor-core/src/index.js'

const imageOptions = ImagePlugin.normalizeOptions(
  { maxWidthRatio: 0.6 },
  DEFAULT_CANVAS_CONFIG.image
)
```

## 文本

文本能力通过 `editor.text` 调用。

### `editor.text.add(content, options)`

新增文本，返回 Leafer `Text` 节点。

```js
const text = await editor.text.add('双击编辑文字', {
  fontFamily: 'PingFang SC',
  fontSize: 36,
  fontWeight: 700,
  italic: false,
  fill: '#1f2937',
  textAlign: 'center',
  textDecoration: 'none',
  letterSpacing: 0,
  lineHeight: 44,
  writingMode: 'x'
})
```

也可以把内容写在配置对象里：

```js
await editor.text.add({
  text: '竖版文字',
  writingMode: 'y',
  fontSize: 32
})
```

常用 `options`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `text` | `string` | 文本内容。 |
| `x` | `number` | 文本 x 坐标。 |
| `y` | `number` | 文本 y 坐标。 |
| `width` | `number` | 文本框宽度；不传时按文本实际宽度创建。 |
| `fontFamily` | `string` | 字体。 |
| `fontSize` | `number` | 字号。 |
| `fontWeight` | `string \| number` | 字重。 |
| `italic` | `boolean` | 是否斜体。 |
| `fill` | `string` | 文本颜色。 |
| `textAlign` | `'left' \| 'center' \| 'right'` | 水平对齐。 |
| `textDecoration` | `'none' \| 'under' \| 'delete' \| 'under-delete'` | 文本装饰线。 |
| `letterSpacing` | `number` | 字间距。 |
| `lineHeight` | `number` | 行高。 |
| `writingMode` | `'x' \| 'y' \| 'y-reverse'` | 横排或竖排。 |
| `rotation` | `number` | 旋转角度。 |
| `opacity` | `number` | 透明度。 |
| `draggable` | `boolean` | 是否可拖动。 |
| `editable` | `boolean` | 是否可编辑。 |

### `editor.text.update(target, options)`

更新指定文本节点。

```js
editor.text.update(text, {
  text: '新的文字',
  fontSize: 48,
  italic: true,
  fill: '#000000'
})
```

### `editor.text.update(options)`

不传 `target` 时，默认更新当前选中的文本节点。

```js
editor.text.update({
  text: '更新选中文本',
  textAlign: 'left'
})
```

### `editor.text.edit(target)`

打开官方 TextEditor 内部编辑器。`target` 不传时使用当前选中文本。

```js
editor.text.edit(text)
editor.text.edit()
```

### `editor.text.getSelected()`

获取当前选中文本；如果当前没有选中文本，会回退到最近一次可用文本。

```js
const selectedText = editor.text.getSelected()
```

### `editor.text.getStyle(target)`

读取文本样式快照。

```js
const style = editor.text.getStyle(text)
```

返回内容包含：

```js
{
  text,
  fontFamily,
  fontSize,
  fontWeight,
  italic,
  fill,
  textAlign,
  textDecoration,
  letterSpacing,
  lineHeight,
  writingMode,
  width,
  verticalAlign
}
```

### `TextPlugin.normalizeOptions(text, baseText)`

归一化文本插件配置。通常业务层不需要直接调用，做插件扩展或配置面板校验时可使用。

```js
import { TextPlugin, DEFAULT_CANVAS_CONFIG } from './canvas-editor-core/src/index.js'

const textOptions = TextPlugin.normalizeOptions(
  { fontSize: 48, italic: true },
  DEFAULT_CANVAS_CONFIG.text
)
```

## 事件

通过 `editor.eventBus` 订阅内部事件。

```js
const unsubscribe = editor.eventBus.on('text:selected', ({ text, options }) => {
  console.log(text, options)
})

unsubscribe()
```

常用事件：

| 事件名 | 触发时机 | payload |
| --- | --- | --- |
| `text:added` | 新增文本后 | `{ text }` |
| `text:updated` | 更新文本后 | `{ text, options }` |
| `text:selected` | 选中文本或文本样式变化后 | `{ text, options }` |
| `image:added` | 新增图片后 | `{ image }` |
| `viewport:zoom-changed` | 缩放变化后 | `{ zoom, previous }` |
| `canvas:resized` | 外层画布尺寸变化后 | `{ width, height }` |
| `canvas:background-changed` | 背景色变化后 | `{ background }` |
| `canvas:grid-visibility-changed` | 网格显隐变化后 | `{ showGrid }` |
| `canvas:area-type-changed` | 区域类型变化后 | `{ areaType }` |
| `canvas:grid-changed` | 网格配置变化后 | `{ grid }` |
| `artboard:resized` | 白色画板尺寸变化后 | `{ artboard }` |
| `history:changed` | 命令历史变化后 | `{ canUndo, canRedo }` |

## 命令与历史

### `editor.execute(command)`

执行命令并压入历史栈。

```js
import { ZoomCommand } from './canvas-editor-core/src/index.js'

editor.execute(new ZoomCommand(editor.state, 1.5))
```

### `editor.undo()`

撤销一步。

```js
editor.undo()
```

### `editor.redo()`

重做一步。

```js
editor.redo()
```

### `editor.commands.canUndo`

是否可以撤销。

```js
if (editor.commands.canUndo) {
  editor.undo()
}
```

### `editor.commands.canRedo`

是否可以重做。

```js
if (editor.commands.canRedo) {
  editor.redo()
}
```

### `editor.commands.clear()`

清空历史栈。

```js
editor.commands.clear()
```

## 生命周期

### `editor.destroy()`

销毁编辑器，组件卸载时必须调用。

```js
onBeforeUnmount(() => {
  editor?.destroy()
})
```

## 高级导出

以下模块已从 `src/canvas-editor-core/src/index.js` 显式导出，通常用于高级扩展、
测试或自定义插件，不建议普通业务直接改底层状态。

| 导出 | 用途 |
| --- | --- |
| `Editor` | 编辑器外观类。 |
| `EditorBuilder` | 分步骤构建编辑器。 |
| `EditorState` | 状态代理类。 |
| `ViewportManager` | 视口缩放服务。 |
| `CommandManager` | 命令历史管理。 |
| `Command` | 自定义命令基类。 |
| `ZoomCommand` | 内置缩放命令。 |
| `PluginManager` | 插件注册和生命周期管理。 |
| `EventBus` | 事件总线。 |
| `EditorError` | 编辑器错误类型。 |
| `DEFAULT_CANVAS_CONFIG` | 默认配置。 |
| `TextPlugin` | 文本插件类。 |
| `ImagePlugin` | 图片插件类。 |

## 完整业务示例

```js
import { createEditor } from './canvas-editor-core/src/index.js'

const editor = createEditor({
  view: document.querySelector('#canvas'),
  autoResize: true
})

const text = await editor.text.add('标题', {
  fontSize: 48,
  fontWeight: 700,
  fill: '#111827'
})

editor.text.update(text, {
  italic: true,
  textDecoration: 'under'
})

await editor.image.add('/demo.png', {
  width: 240,
  lockRatio: true
})

editor
  .setArtboardSize(375, 667)
  .setZoom(1.2)
  .setShowGrid(true)

const unsubscribe = editor.eventBus.on('text:selected', ({ options }) => {
  console.log('当前文本样式', options)
})

editor.deselect()
unsubscribe()
editor.destroy()
```
