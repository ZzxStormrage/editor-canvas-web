# canvas-editor-core 使用说明

本文档说明编辑器的初始化、画板、视口、图片、文本、选区、图层、业务属性、事件和
生命周期，供编辑器页面与业务面板开发使用。

> 在线阅读：启动项目后访问 `#/docs`。完整编辑器示例位于 `#/editor`。

## 阅读路线

| 使用目标 | 建议章节 |
| --- | --- |
| 第一次接入 | “快速开始” → “创建编辑器” → “生命周期” |
| 开发 Vue 面板 | “Vue 应用层” → 对应功能模块 → “事件” |
| 添加图片或文字 | “图片” → “文本” → “选择” |
| 开发图层面板 | “图层” → “选择” → “元素业务属性” |
| 排查问题 | “错误处理” → 对应模块 |

## 快速开始

### 准备容器

编辑器会占满传入的 DOM 容器。容器必须具有可计算的宽高。

```vue
<template>
  <div ref="canvasRef" class="canvas-host"></div>
</template>

<style scoped>
.canvas-host {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>
```

### 创建实例

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { createEditor } from '@/canvas-editor-core/src/index.js'

const canvasRef = ref(null)
let editor = null

onMounted(() => {
  editor = createEditor({
    view: canvasRef.value,
    autoResize: true,
    artboard: {
      width: 375,
      height: 667,
      fill: '#ffffff'
    }
  })
})

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
</script>
```

### 添加内容

```js
const title = await editor.text.add('活动标题', {
  fontSize: 32,
  fontWeight: 700,
  fill: '#1f2937',
  textAlign: 'center'
})

const image = await editor.image.add('/images/product.png', {
  width: 240,
  lockRatio: true
})
```

图片和文本新增方法返回 Promise，必须使用 `await`。

### 修改当前文本

```js
editor.select(title)

editor.text.update({
  text: '新的活动标题',
  fontSize: 40,
  fill: '#7c3aed'
})
```

## 调用边界

项目将编辑器拆成三层，依赖方向保持单向。

| 层级 | 主要目录 | 职责 | 禁止行为 |
| --- | --- | --- | --- |
| 编辑器内核 | `src/canvas-editor-core` | Leafer 节点、插件、选区、画板、命令 | 引用 Vue 组件或页面状态 |
| Vue 调用层 | `src/composables/canvas-editor` | 将内核 API 组合为业务方法和 `ref` | 访问内核私有字段 |
| 页面组件 | `src/components`、`src/views` | 表单、按钮和状态展示 | 直接操作场景树 |

遵循以下规则：

1. 页面组件只调用 composable 暴露的方法。
2. composable 通过 `Editor` 外观或插件公开 API 操作编辑器。
3. 通用 Leafer 逻辑放入内核插件，不复制到 Vue 组件。
4. 组件卸载时销毁编辑器并取消事件订阅。
5. 业务属性必须是可 JSON 序列化的普通对象。

## Vue 应用层

项目中的完整页面使用 `useCanvasEditor()`，它负责创建实例、同步 UI 状态和销毁资源。

```js
import { useCanvasEditor } from '@/composables/useCanvasEditor.js'

const editor = useCanvasEditor({
  onMessage(message, type) {
    console.log(type, message)
  }
})
```

模板只调用组合后的方法：

```vue
<CanvasWorkspace :editor="editor" />

<v-btn @click="editor.addText">添加文字</v-btn>
<v-btn @click="editor.openImagePicker">上传图片</v-btn>
<v-btn @click="editor.zoomIn">放大</v-btn>
```

只有 composable 尚未封装某项能力时，才读取内核实例：

```js
const coreEditor = editor.getEditor()

if (coreEditor) {
  coreEditor.setShowGrid(false)
}
```

`getEditor()` 在组件挂载前和卸载后会返回 `null`。

## 创建编辑器

### `createEditor(options)`

```js
import { createEditor } from '@/canvas-editor-core/src/index.js'

const editor = createEditor({
  view: document.querySelector('#canvas'),
  autoResize: true,
  areaType: 'grid',
  background: '#f7f8fa',
  zoom: {
    min: 0.2,
    max: 4,
    initial: 1,
    step: 0.01
  },
  artboard: {
    width: 375,
    height: 667,
    fill: '#ffffff'
  },
  image: {
    maxWidthRatio: 0.8,
    maxHeightRatio: 0.8,
    lockRatio: true
  }
})
```

常用初始化参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `view` | `HTMLElement \| string` | 必填，挂载容器或选择器。 |
| `width` | `number` | 外层画布宽度；自动布局时通常省略。 |
| `height` | `number` | 外层画布高度；自动布局时通常省略。 |
| `autoResize` | `boolean` | 是否跟随容器尺寸变化。 |
| `background` | `string` | 工作区背景颜色。 |
| `areaType` | `'grid' \| 'blank'` | 网格或纯色工作区。 |
| `zoom` | `Object` | 缩放范围、初始值和步进。 |
| `grid` | `Object` | 网格尺寸和颜色。 |
| `artboard` | `Object` | 白色画板尺寸、填充和溢出透明度。 |
| `image` | `Object` | 新增图片的默认尺寸约束。 |
| `text` | `Object` | 新增文本的默认样式。 |
| `editor` | `Object` | Leafer Editor 控件配置。 |

`init(options)` 是兼容别名，新代码统一使用 `createEditor(options)`。

## Editor 实例

业务代码优先使用以下公开入口：

| 属性 | 说明 |
| --- | --- |
| `editor.state` | 当前尺寸、缩放和网格状态。 |
| `editor.image` | 图片插件。 |
| `editor.text` | 文本插件。 |
| `editor.layer` | 图层插件。 |
| `editor.elementData` | 元素业务属性插件。 |
| `editor.artboard` | 白色画板管理器。 |
| `editor.eventBus` | 编辑器事件总线。 |
| `editor.commands` | 命令历史管理器。 |
| `editor.selectedElements` | 当前选中元素数组。 |

`leafer`、`stage`、`contentLayer` 和 `editor.editor` 用于高级扩展。普通组件不要直接修改
这些对象的内部状态。

## 画布与画板

外层画布是编辑器视口，白色画板是内容操作区域，两者尺寸含义不同。

### 调整外层画布

```js
editor.resize(1200, 800)
```

### 调整白色画板

```js
editor.setArtboardSize(750, 1334)
```

### 读取画板边界

```js
const localBounds = editor.artboard.getContentBounds()
const worldBounds = editor.artboard.getWorldBounds()
```

- `getContentBounds()` 返回 stage 内部坐标，适合放置元素。
- `getWorldBounds()` 返回当前缩放和平移后的世界坐标，适合浮层定位。

### 背景和网格

```js
editor
  .setBackground('#f7f8fa')
  .setAreaType('grid')
  .setShowGrid(true)
  .setGrid({
    size: 24,
    color: '#eef1f5',
    majorSize: 120,
    majorColor: '#dce2ea'
  })
```

`Editor` 的设置方法返回当前实例，可以链式调用。

## 视口缩放

```js
editor.setZoom(1.2)
editor.zoomIn()
editor.zoomOut()
editor.resetZoom()
editor.centerArtboard()
```

将画板缩放到工作区的 80% 并居中：

```js
editor.fitArtboardToView({
  viewportRatio: 0.8,
  expandZoomRange: true
})
```

| 参数 | 说明 |
| --- | --- |
| `padding` | 从可用视口扣除的留白。 |
| `viewportRatio` | 画板占可用视口的比例，默认 `1`。 |
| `expandZoomRange` | 必要时扩展缩放上下限，适合图片驱动画板尺寸。 |

## 图片

### `editor.image.add(source, options)`

支持图片 URL、`File`、`Blob` 和 SVG 字符串，返回 Leafer `Image` 节点。

```js
const image = await editor.image.add('/demo.png', {
  x: 100,
  y: 120,
  width: 240,
  lockRatio: true
})
```

常用参数：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `x` | `number` | 图片 x 坐标。 |
| `y` | `number` | 图片 y 坐标。 |
| `width` | `number` | 图片宽度。 |
| `height` | `number` | 图片高度。 |
| `maxWidthRatio` | `number` | 未传宽高时的最大宽度占比。 |
| `maxHeightRatio` | `number` | 未传宽高时的最大高度占比。 |
| `lockRatio` | `boolean` | 是否保持宽高比。 |
| `visible` | `boolean` | 初始是否显示，默认 `true`。 |
| `select` | `boolean` | 创建完成后是否选中，默认 `true`。 |

`visible: false` 和 `select: false` 适合需要先完成尺寸、层级和视口计算，再一次性显示的
组合流程。

### `editor.image.getSize(source)`

读取图片原始像素尺寸，不创建节点。

```js
const { width, height } = await editor.image.getSize(file)
```

图片解析和 Blob URL 生命周期由图片插件负责，Vue 组件不应重复创建临时 `<img>`。

## 文本

### 添加文本

```js
const text = await editor.text.add('标题', {
  x: 40,
  y: 80,
  width: 300,
  fontFamily: 'PingFang SC',
  fontSize: 32,
  fontWeight: 700,
  fill: '#111827',
  textAlign: 'center',
  lineHeight: 40,
  letterSpacing: 0,
  writingMode: 'x'
})
```

也可以将完整配置作为第一个参数：

```js
await editor.text.add({
  text: '标题',
  fontSize: 32,
  fill: '#111827'
})
```

### 更新文本

```js
editor.text.update(text, {
  text: '新标题',
  italic: true,
  textDecoration: 'under'
})
```

当前只选中了一个文本节点时，可以省略目标：

```js
editor.text.update({
  fontSize: 40,
  fill: '#7c3aed'
})
```

### 编辑和读取

```js
editor.text.edit(text)

const selectedText = editor.text.getSelected()
const style = editor.text.getStyle(selectedText)
```

## 选择

```js
editor.select(text)
editor.addToSelection(image)
editor.removeFromSelection(image)
editor.deselect()
```

状态查询：

```js
editor.selectedElements
editor.isMultipleSelect
editor.isEditing
```

跨模块写操作不要直接修改 `editor.editor.list`，统一调用选区公开方法。

## 图层

图层列表从视觉最上层到最下层排列，返回适合 Vue 渲染的 DTO，不直接暴露内部 Map。

```js
const layers = editor.layer.getList()
```

常用操作：

```js
editor.layer.select(layerId)
editor.layer.remove(layerId)
editor.layer.toggleLock(layerId)
editor.layer.togglePointerThrough(layerId)
editor.layer.hover(layerId)
editor.layer.hover(null)
```

按面板从上到下的顺序排序：

```js
editor.layer.reorder(orderedLayerIds)
```

图层排序、删除和锁定必须通过图层插件执行，以便同步选区、覆盖层和事件。

## 元素业务属性

业务属性用于保存与渲染无关的数据，例如图片描述、图片角色、商品 ID、埋点标识或文本
输入规则。不要把这些字段混入 `x`、`fill`、`fontSize` 等 Leafer 渲染属性。

每个图片和文本元素都会获得稳定 `elementId`。属性值必须是可以 JSON 序列化的普通对象。

### 写入和读取

```js
editor.elementData.set(image, {
  image: {
    description: '商品正面展示图',
    role: 'ai-variable'
  }
})

const attributes = editor.elementData.get(image)
const elementId = editor.elementData.getId(image)
```

当前只选中一个元素时：

```js
editor.elementData.setSelected({
  action: {
    type: 'navigate',
    value: '/product/1001'
  }
})

editor.elementData.getSelected()
editor.elementData.removeSelected('action')
editor.elementData.clearSelected()
```

按稳定 ID 操作：

```js
editor.elementData.getById(elementId)
editor.elementData.setById(elementId, { productId: '1001' })
```

### 图片角色

项目约定以下图片角色：

| 值 | 用途 |
| --- | --- |
| `background` | 生产背景图。 |
| `mask` | 生产遮罩图。 |
| `ai-variable` | AI 可变图片。 |

角色只表示业务用途，不会自动改变图层层级或点击穿透状态。

### 导出属性

```js
const records = editor.elementData.export()
```

返回格式：

```js
[
  {
    elementId: 'stable-element-id',
    type: 'Image',
    attributes: {
      image: {
        description: '商品正面展示图',
        role: 'ai-variable'
      }
    }
  }
]
```

默认忽略空属性元素；传入 `{ includeEmpty: true }` 可包含全部元素。该方法只导出业务属性，
不等于完整场景序列化。

## 事件

```js
const unsubscribe = editor.eventBus.on('layers:changed', ({ layers }) => {
  console.log(layers)
})

unsubscribe()
```

常用事件：

| 事件 | 数据 | 使用场景 |
| --- | --- | --- |
| `text:added` | `{ text }` | 文本创建完成。 |
| `text:updated` | `{ text, options }` | 文本内容或样式更新。 |
| `text:selected` | `{ text, options }` | 同步文本属性面板。 |
| `image:added` | `{ image }` | 图片创建完成。 |
| `layers:changed` | `{ layers }` | 刷新图层列表。 |
| `element-data:changed` | `{ elementId, attributes }` | 同步业务属性面板。 |
| `artboard:resized` | `{ artboard }` | 同步画板尺寸。 |
| `viewport:zoom-changed` | `{ zoom, previous }` | 同步缩放显示。 |
| `history:changed` | `{ canUndo, canRedo }` | 同步撤销重做按钮。 |

订阅者异常由 EventBus 隔离，不会中断其他监听器。组件卸载时必须取消订阅。

## 命令与历史

```js
editor.execute(command)
editor.undo()
editor.redo()

editor.commands.canUndo
editor.commands.canRedo
editor.commands.clear()
```

只有通过命令管理器执行的写操作才会进入历史栈。直接调用图片、文本或图层插件不会自动
生成撤销记录。

## 常见业务流程

### 无闪烁替换背景图

文件上传属于应用层。编辑器只接收应用层得到的图片 URL、`File` 或 `Blob`。需要先完成
画板和视口设置再显示图片时，使用隐藏创建模式：

```js
async function replaceBackground(editor, source) {
  const imageSize = await editor.image.getSize(source)
  const currentBounds = editor.artboard.getContentBounds()
  const background = await editor.image.add(source, {
    x: currentBounds.x,
    y: currentBounds.y,
    width: imageSize.width,
    height: imageSize.height,
    lockRatio: false,
    visible: false,
    select: false
  })

  editor.setArtboardSize(imageSize.width, imageSize.height)

  const bounds = editor.artboard.getContentBounds()
  background.set({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    visible: false
  })

  editor.fitArtboardToView({
    viewportRatio: 0.8,
    expandZoomRange: true
  })
  background.set({ visible: true })

  return background
}
```

当前 Vue 页面已在 `useArtboardControls()` 中封装上传、标记、锁定、置底和替换逻辑，页面
组件只调用 `openBackgroundImagePicker()` 和 `handleBackgroundImageChange(event)`。

### 图层面板

```js
const layers = editor.layer.getList()

editor.layer.reorder(layers.map((item) => item.id))
editor.layer.toggleLock(layers[0].id)
editor.layer.remove(layers[0].id)
```

### 自定义属性面板

```js
const current = editor.elementData.getSelected() ?? {}

editor.elementData.setSelected({
  ...current,
  description: '运营配置内容'
}, { replace: true })
```

Vue 组件只维护表单草稿，保存时调用 composable 暴露的方法，不保存 Leafer 节点引用。

## 生命周期

```js
const unsubscribers = [
  editor.eventBus.on('layers:changed', refreshLayers),
  editor.eventBus.on('text:selected', syncTextPanel)
]

onBeforeUnmount(() => {
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  editor.destroy()
})
```

`destroy()` 会清理插件、视口监听、事件总线、Leafer 实例和图片插件持有的 Blob URL。
实例销毁后不能复用。

## 错误处理

内核参数错误统一抛出 `EditorError`。

```js
import { EditorError } from '@/canvas-editor-core/src/index.js'

try {
  await editor.image.add(source)
} catch (error) {
  if (error instanceof EditorError) {
    console.error(error.code, error.message)
  }
  throw error
}
```

常见排查项：

- 编辑器没有显示：检查挂载容器宽高和 `view`。
- 图片没有加载：检查 URL、跨域策略和文件内容。
- 属性面板未更新：检查对应 EventBus 订阅是否建立。
- 选区行为异常：不要直接修改 `innerEditor.list`。
- 图层状态不同步：通过 `editor.layer` 执行写操作。
- 实例无响应：检查实例是否已经销毁。

常用错误码：

| 错误码 | 含义 |
| --- | --- |
| `INIT_OPTIONS_REQUIRED` | 初始化参数不是对象。 |
| `VIEW_REQUIRED` | 未提供挂载容器。 |
| `VIEW_NOT_FOUND` | 选择器没有找到 DOM。 |
| `EDITOR_DESTROYED` | 实例已经销毁。 |
| `AREA_TYPE_INVALID` | 工作区类型不是 `grid` 或 `blank`。 |
| `ARTBOARD_SIZE_INVALID` | 画板尺寸不是有效正数。 |
| `ZOOM_RANGE_INVALID` | 缩放范围无效。 |
| `IMAGE_SOURCE_INVALID` | 图片来源类型不支持。 |
| `IMAGE_ADD_FAILED` | 图片读取或节点创建失败。 |
| `TEXT_VALUE_INVALID` | 文本内容类型无效。 |
| `TEXT_SELECTION_REQUIRED` | 没有可更新的选中文本。 |
| `ELEMENT_DATA_TARGET_REQUIRED` | 当前没有唯一目标元素。 |
| `ELEMENT_DATA_TARGET_NOT_FOUND` | 指定的元素 ID 不存在。 |

## API 速查

| 任务 | API |
| --- | --- |
| 创建编辑器 | `createEditor(options)` |
| 调整画板 | `editor.setArtboardSize(width, height)` |
| 适配画板到视口 | `editor.fitArtboardToView(options)` |
| 添加图片 | `await editor.image.add(source, options)` |
| 读取图片尺寸 | `await editor.image.getSize(source)` |
| 添加文字 | `await editor.text.add(content, options)` |
| 更新文字 | `editor.text.update(target, options)` |
| 选择元素 | `editor.select(target)` |
| 取消选择 | `editor.deselect()` |
| 获取图层 | `editor.layer.getList()` |
| 排序图层 | `editor.layer.reorder(ids)` |
| 删除图层 | `editor.layer.remove(id)` |
| 锁定图层 | `editor.layer.toggleLock(id)` |
| 点击穿透 | `editor.layer.togglePointerThrough(id)` |
| 写入业务属性 | `editor.elementData.set(target, attributes)` |
| 导出业务属性 | `editor.elementData.export()` |
| 监听事件 | `editor.eventBus.on(name, handler)` |
| 撤销/重做 | `editor.undo()` / `editor.redo()` |
| 销毁编辑器 | `editor.destroy()` |
