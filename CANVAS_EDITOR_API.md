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
| 替换图片或文字 | “图片” → “文本” → “H5 文档运行时” |
| 开发图层面板 | “图层” → “选择” → “元素业务属性” |
| 查询元素或截图 | “元素业务属性” → “生产遮罩与打印区域” |
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
| `image` | `Object` | 图片默认配置；`maxWidthRatio: 0.8`、`maxHeightRatio: 0.8`、`lockRatio: true`。 |
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
| `editor.production` | 遮罩识别、打印区域和区域截图插件。 |
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

添加图片并返回 `Promise<LeaferImage>`。必须使用 `await` 获取创建完成的 Leafer `Image`
节点。

方法参数：

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `source` | `string \| File \| Blob` | 是 | 无 | 图片 URL、SVG URL、完整 SVG 字符串、`File`、`Blob` | 图片来源。插件负责读取原始像素尺寸和管理临时 Blob URL。 |
| `options` | `Object` | 否 | `{}` | 见下方字段表 | 本次图片的放置和初始状态配置。 |

```js
const image = await editor.image.add('/demo.png', {
  x: 100,
  y: 120,
  width: 240,
  lockRatio: true
})
```

`options` 完整字段：

| 字段 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `x` | `number` | 否 | 画板水平居中位置 | 任意有限坐标，可为负数 | 相对内容层的 x 坐标；未传时根据最终图片宽度居中。 |
| `y` | `number` | 否 | 画板垂直居中位置 | 任意有限坐标，可为负数 | 相对内容层的 y 坐标；未传时根据最终图片高度居中。 |
| `width` | `number` | 否 | `原始宽度 × 默认缩放比例` | 大于 `0` | 初始显示宽度。传入后覆盖默认宽度计算。 |
| `height` | `number` | 否 | `原始高度 × 默认缩放比例` | 大于 `0` | 初始显示高度。传入后覆盖默认高度计算。 |
| `maxWidthRatio` | `number` | 否 | `0.8` | `0 < value <= 1` | 默认尺寸相对画板宽度的最大占比。可被全局 `image.maxWidthRatio` 修改。 |
| `maxHeightRatio` | `number` | 否 | `0.8` | `0 < value <= 1` | 默认尺寸相对画板高度的最大占比。可被全局 `image.maxHeightRatio` 修改。 |
| `lockRatio` | `boolean` | 否 | `true` | `true \| false` | 后续编辑宽高时是否保持图片比例，不负责补全首次创建时缺失的单边尺寸。 |
| `visible` | `boolean` | 否 | `true` | `true \| false` | 图片创建后是否立即显示。 |
| `select` | `boolean` | 否 | `true` | `true \| false` | 图片创建完成后是否自动进入选中状态。 |

默认放置规则：

1. 操作区域优先使用白色画板；没有画板时使用外层画布。
2. 默认缩放比例为：

```js
Math.min(
  画板宽度 * maxWidthRatio / 图片原始宽度,
  画板高度 * maxHeightRatio / 图片原始高度,
  1
)
```

3. 默认宽高使用同一个缩放比例，因此保持原始宽高比。
4. 缩放比例最大为 `1`，大图会缩小，小图不会自动放大。
5. 未传 `x`、`y` 时，图片按照最终宽高在画板中水平和垂直居中。

单次 `editor.image.add()` 的 `options` 优先级高于创建编辑器时传入的全局 `image` 配置：

```js
const editor = createEditor({
  // 所有后续图片的默认值
  image: {
    maxWidthRatio: 0.8,
    maxHeightRatio: 0.8,
    lockRatio: true
  }
})

// 仅覆盖当前图片
await editor.image.add('/demo.png', {
  maxWidthRatio: 0.6,
  select: false
})
```

> 注意：当前首次创建时 `width` 和 `height` 分别计算。只传 `width` 或只传 `height`，
> 不会因为 `lockRatio: true` 自动推导另一边；需要严格等比时请同时传入计算后的宽高，
> 或同时省略宽高使用默认等比缩放。

`visible: false` 和 `select: false` 适合需要先完成尺寸、层级和视口计算，再一次性显示的
组合流程。

### `editor.replaceSelectedImage(source, options)`

替换当前严格单选图片的资源，返回 `Promise<LeaferImage>`。也可以直接调用插件方法
`editor.image.replaceSelected(source, options)`，两种写法行为一致。

```js
editor.select(image)

const replacedImage = await editor.replaceSelectedImage(file, {
  fit: 'contain'
})

console.log(replacedImage === image) // true，仍是原节点
```

方法参数：

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `source` | `string \| File \| Blob` | 是 | 无 | 图片 URL、SVG、`File`、`Blob` | 新图片来源；写入节点前会先完成资源加载。 |
| `options` | `Object` | 否 | `{}` | 普通对象 | 替换配置。 |
| `options.fit` | `string` | 否 | `'contain'` | `'contain'`、`'cover'`、`'stretch'` | 新图片在当前图片外框中的适配方式。 |

`fit` 行为：

| 值 | 是否保持节点外框 | 是否保持图片比例 | 对齐方式 | 使用场景 |
| --- | --- | --- | --- | --- |
| `'contain'` | 是 | 是 | 水平、垂直居中 | 默认值；完整显示新图片，比例不一致时允许留白。 |
| `'cover'` | 是 | 是 | 水平、垂直居中 | 填满原外框，比例不一致时裁切边缘。 |
| `'stretch'` | 是 | 否 | 填满外框 | 严格铺满原外框，可能拉伸图片。 |

替换只修改图片资源和填充模式，不重建节点，因此以下内容保持不变：

- `elementId`、自定义属性和图片角色。
- `x`、`y`、`width`、`height`、旋转、翻转、透明度和缩放。
- 图层顺序、点击穿透状态和选中状态。

新资源会先加载，再一次性替换，避免先以原始尺寸绘制后再次缩放造成闪烁。图片锁定时
不会替换，需要先解锁。`File` 和 `Blob` 产生的临时 URL 由图片插件统一释放。

### `editor.image.getSize(source)`

读取图片原始像素尺寸，不创建节点。

```js
const { width, height } = await editor.image.getSize(file)
```

图片解析和 Blob URL 生命周期由图片插件负责，Vue 组件不应重复创建临时 `<img>`。

### 编辑当前图片属性

Vue 图片属性面板应通过 `Editor` 外观 API 读写，不直接访问 Leafer 图片节点：

```js
const properties = editor.getSelectedImageProperties()

editor.updateSelectedImageProperties({
  x: 24,
  y: 36,
  width: 240,
  rotation: 15,
  opacity: 80
})

editor.resetSelectedImageSize()
```

仅在严格单选图片时返回属性；未选中图片、多选或选中其他类型时返回 `null`。
位置以画板左上角为原点，缩放比例以图片原始像素尺寸为 `100%`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `x` / `y` | `number` | 图片相对画板的位置，可为负数。 |
| `width` / `height` | `number` | 当前显示尺寸，最小值为 `1`。 |
| `originalWidth` / `originalHeight` | `number` | 图片原始像素尺寸，只读。 |
| `scalePercentX` / `scalePercentY` | `number` | 相对原图的水平、垂直缩放百分比。 |
| `rotation` | `number` | 旋转角度。 |
| `opacity` | `number` | 不透明度百分比，范围 `0-100`。 |
| `lockRatio` | `boolean` | 调整单边尺寸或缩放时是否同步另一边。 |
| `flippedX` / `flippedY` | `boolean` | 水平、垂直翻转状态。 |
| `locked` | `boolean` | 图片是否锁定，只读；锁定后属性写入会被忽略。 |
| `fit` | `'contain' \| 'cover' \| 'stretch'` | 图片资源在节点外框中的适配方式，只读。 |

画布拖动、缩放、旋转以及面板写入都会触发 `image:selection-changed`，可用同一个
监听器刷新属性面板。

## 生产遮罩与打印区域

### 标记遮罩图

文件上传仍属于应用层。图片节点创建完成后，通过 Editor 外观 API 写入遮罩角色：

```js
const imageUrl = await pictureApi.upload(file)
const mask = await editor.image.add(imageUrl, {
  x: artboard.x,
  y: artboard.y,
  width: artboard.width,
  height: artboard.height,
  lockRatio: false
})

editor.markImageAsMask(mask, file)
```

该方法自动写入 `attributes.image.role = 'mask'`，并保留本地 `File` 供透明像素识别。
同一画布只保留一个遮罩图，上传新遮罩会替换旧遮罩，但不会改变画板尺寸。

### 管理打印区域

打印区域的位置以画板左上角为原点，可以通过画布控制点或 API 调整：

```js
editor.createPrintArea({ x: 20, y: 30, width: 300, height: 200 })

const properties = editor.getPrintAreaProperties()

editor.updatePrintArea({
  x: properties.x + 10,
  y: properties.y,
  width: 320,
  height: 220
})

editor.removePrintArea()
```

### 自动识别遮罩透明区域

```js
const printArea = await editor.detectPrintAreaFromMask({
  alphaThreshold: 10,
  maxAnalysisSize: 2048
})
```

识别过程优先选择不接触图片边缘的最大透明连通区域；没有内部区域时回退到最大的透明
区域。识别结果会按照遮罩图当前的位置、缩放和旋转映射到画板，并自动创建或更新打印框。

### `editor.capturePrintArea(options)`

该 API 文档位于“生产遮罩与打印区域”模块。它按照当前打印区域截图，返回一个
`Promise`；未传上传函数时解析为 `File`，传入 `upload` 后解析为上传接口结果。

核心 API 默认返回 `File`：

```js
const file = await editor.capturePrintArea({
  includeBackground: false,
  includeMask: false,
  type: 'image/png',
  quality: 1,
  pixelRatio: 1
})
```

传入上传方法后，Promise 直接返回接口结果：

```js
const result = await editor.capturePrintArea({
  includeBackground: false,
  upload: (file) => pictureApi.upload(file)
})
```

通过 `useCanvasEditor()` 暴露的 `capturePrintArea(options)` 已默认注入 `pictureApi.upload`，
因此 Vue 组件直接调用即可得到上传结果：

```js
const imageUrl = await editor.capturePrintArea()
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `includeBackground` | `false` | 是否包含标记为背景图的图片。 |
| `includeMask` | `false` | 是否包含遮罩图。 |
| `type` | `image/png` | 支持 PNG、JPEG 和 WebP。 |
| `quality` | `1` | JPEG/WebP 图片质量，范围 `0-1`。 |
| `pixelRatio` | `1` | 输出像素倍率。 |
| `fileName` | 自动生成 | 上传文件名。 |
| `fill` | `undefined` | 输出底色；PNG 默认透明。 |
| `upload` | 无 | 接收 `File` 的上传函数；传入后返回其 Promise 结果。 |

截图始终排除打印区域边框和吸附辅助线。截图使用离屏克隆场景，不会隐藏当前画布元素或
产生闪烁。

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

### `editor.replaceSelectedText(content)`

替换当前严格单选文本的内容。也可以调用 `editor.text.replaceSelected(content)`。

```js
editor.select(title)

const replacedText = editor.replaceSelectedText('新的商品标题')
console.log(replacedText === title) // true，仍是原节点
```

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `content` | `string \| number` | 是 | 无 | 字符串或数字 | 新文本内容，数字会转换为字符串。 |

该方法保留原文本节点、`elementId`、业务属性、位置、样式和固定宽度。它只替换内容，
文本实际排版高度仍由 Leafer 根据内容、宽度、字号和行高计算。未严格单选文本时抛出
`TEXT_SELECTION_REQUIRED`。

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

### 选区工具条

选区工具条由 Vue 渲染，内核只提供可序列化状态和操作 API。组件不要读取
`editor.editor.editBox` 或创建 Leafer 按钮节点。

```js
const toolbar = editor.getSelectionToolbarState()

// toolbar.bounds 是选区在画布宿主中的世界坐标边界
if (toolbar.visible) {
  console.log(toolbar.bounds, toolbar.locked, toolbar.disabled)
}

editor.toggleSelectionLock()
editor.duplicateSelection()
editor.deleteSelection()
editor.groupSelection()
editor.ungroupSelection()

const layerActions = editor.getSelectionLayerActions()
editor.runLayerAction('forward')
```

多选节点时 `toolbar.canGroup` 表示是否可以组合；选中组合节点时
`toolbar.canUngroup` 为 `true`。组合仅支持同一父级且未锁定的节点。

移动、缩放、旋转选区时，监听 `selection:toolbar-changed` 更新 Vue 组件位置。组件只负责
定位、展示和调用上述 API，锁定、复制、删除、组合及层级规则始终保留在内核。

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

业务属性用于保存与渲染无关的数据，例如图片描述、图片角色、文字描述、商品 ID、埋点标识
或文本输入规则。不要把这些字段混入 `x`、`fill`、`fontSize` 等 Leafer 渲染属性。

每个图片和文本元素都会获得稳定 `elementId`。属性值必须是可以 JSON 序列化的普通对象。

### 写入和读取

```js
editor.elementData.set(image, {
  image: {
    description: '商品正面展示图',
    role: 'ai-variable'
  }
})

editor.elementData.set(text, {
  text: {
    description: '用户姓名'
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

### 获取和查询元素

推荐通过 Editor 外观 API 查询。三个方法始终返回数组，没有匹配结果时返回 `[]`：

```js
const allElements = editor.getAllElements()
const maskElements = editor.getElementsByRole('mask')
const backgroundElements = editor.getElementsByRole('background')
const imageElements = editor.getElementsByType('image')
const textElements = editor.getElementsByType('text')
```

也可以直接使用元素业务属性插件：

```js
const allElements = editor.elementData.getAllElements()
const aiElements = editor.elementData.getElementsByRole('ai-variable')
const groupElements = editor.elementData.getElementsByType('group')
```

查询规则：

| API | 匹配规则 |
| --- | --- |
| `getAllElements()` | 返回画布全部元素，递归包含组合及其子元素。 |
| `getElementsByRole(role)` | 递归匹配自定义属性中的 `role`，包括 `attributes.image.role`。角色值精确匹配。 |
| `getElementsByType(type)` | 匹配元素的 `customType`、Leafer `tag` 或构造函数名称，大小写不敏感。 |

查询会递归包含组合内的子元素。返回值是当前画布中的 Leafer 元素引用，可以继续传给
`editor.select(element)`、`editor.elementData.get(element)` 等 API；不要直接修改其内部字段。

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

## H5 文档运行时

H5 页面不创建 Leafer 编辑器实例，而是渲染可序列化文档。运行时替换通过
`src/services/h5-document.js` 的纯文档 API 完成，返回新文档，不直接修改传入对象。

```js
import {
  replaceH5Image,
  replaceH5Text,
  saveH5Document
} from '@/services/h5-document.js'

const imageDocument = await replaceH5Image(documentData, imageElementId, imageFile)
const textDocument = replaceH5Text(imageDocument, textElementId, 'H5 动态标题')

saveH5Document(textDocument)
```

### `replaceH5Image(document, elementId, source, options)`

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `document` | `Object` | 是 | 无 | `version=1` 的 H5 文档 | 当前文档。 |
| `elementId` | `string` | 是 | 无 | 已存在的图片元素 ID | 通过稳定 `elementId` 定位图片。 |
| `source` | `string \| File \| Blob` | 是 | 无 | 图片 URL、`File`、`Blob` | 新图片；`File`、`Blob` 会转换为可持久化 Data URL。 |
| `options` | `Object` | 否 | `{}` | 普通对象 | 替换配置。 |
| `options.fit` | `string` | 否 | `'contain'` | `'contain'`、`'cover'`、`'stretch'` | 与编辑器图片替换规则一致。 |

返回 `Promise<Object>`。新文档保留图片元素的坐标、宽高、旋转、缩放、透明度、业务
属性和图层顺序，并更新以下字段：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | 无 | 新图片 URL 或 Data URL。 |
| `sourceWidth` / `sourceHeight` | `number` | 图片原始尺寸 | 新图片原始像素尺寸。 |
| `objectFit` | `'contain' \| 'cover' \| 'fill'` | `'contain'` | H5 渲染使用的 CSS 图片适配方式。 |
| `objectPosition` | `string` | `'center center'` | 新图片在原外框中水平、垂直居中。 |

### `replaceH5Text(document, elementId, content)`

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `document` | `Object` | 是 | 无 | `version=1` 的 H5 文档 | 当前文档。 |
| `elementId` | `string` | 是 | 无 | 已存在的文本元素 ID | 通过稳定 `elementId` 定位文本。 |
| `content` | `string \| number` | 是 | 无 | 字符串或数字 | 新文本内容。 |

返回新的 `Object` 文档。除 `text` 外，其余文本元素字段保持不变。

启动项目后访问 `#/h5-preview`，可在“替换功能测试”区域选择元素。点击“替换图片”会
选择本地图片并使用默认 `contain` 规则；输入文字后点击“替换文字”可立即验证渲染结果。

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
| `text:replaced` | `{ text, content }` | 当前文本内容替换完成。 |
| `text:selected` | `{ text, options }` | 同步文本属性面板。 |
| `image:added` | `{ image }` | 图片创建完成。 |
| `image:replaced` | `{ image, fit, properties }` | 当前图片资源替换完成。 |
| `image:updated` | `{ image, properties }` | 图片属性通过 Editor API 更新。 |
| `image:selection-changed` | `{ image, properties }` | 同步当前单选图片属性；非图片时 `properties` 为 `null`。 |
| `production:mask-changed` | `{ image }` | 遮罩图片完成标记。 |
| `production:mask-detected` | `{ mask, transparentBounds, printArea, properties }` | 透明区域识别完成。 |
| `production:print-area-changed` | `{ printArea, properties }` | 同步打印区域位置和尺寸。 |
| `layers:changed` | `{ layers }` | 刷新图层列表。 |
| `selection:toolbar-changed` | `{ visible, bounds, locked, disabled }` | 刷新 Vue 选区工具条。 |
| `selection:group-changed` | `{ action, group, children }` | 同步组合或解组后的场景状态。 |
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
| `IMAGE_REPLACE_FAILED` | 替换图片资源加载或写入失败。 |
| `IMAGE_SELECTION_REQUIRED` | 替换图片前没有严格单选图片。 |
| `IMAGE_LOCKED` | 当前图片已锁定，不能替换。 |
| `IMAGE_REPLACEMENT_FIT_INVALID` | 图片适配方式不是 `contain`、`cover` 或 `stretch`。 |
| `TEXT_VALUE_INVALID` | 文本内容类型无效。 |
| `TEXT_SELECTION_REQUIRED` | 没有可更新的选中文本。 |
| `ELEMENT_DATA_TARGET_REQUIRED` | 当前没有唯一目标元素。 |
| `ELEMENT_DATA_TARGET_NOT_FOUND` | 指定的元素 ID 不存在。 |
| `MASK_IMAGE_REQUIRED` | 尚未上传或指定遮罩图片。 |
| `MASK_DETECTION_FAILED` | 遮罩透明像素读取或识别失败。 |
| `MASK_AREA_OUTSIDE_ARTBOARD` | 识别区域不在画板范围内。 |
| `PRINT_AREA_REQUIRED` | 截图前没有打印区域。 |
| `PRINT_AREA_CAPTURE_FAILED` | 打印区域导出或文件生成失败。 |

## API 速查

| 任务 | API |
| --- | --- |
| 创建编辑器 | `createEditor(options)` |
| 调整画板 | `editor.setArtboardSize(width, height)` |
| 适配画板到视口 | `editor.fitArtboardToView(options)` |
| 添加图片 | `await editor.image.add(source, options)` |
| 替换选中图片 | `await editor.replaceSelectedImage(source, options)` |
| 读取图片尺寸 | `await editor.image.getSize(source)` |
| 获取选中图片属性 | `editor.getSelectedImageProperties()` |
| 更新选中图片属性 | `editor.updateSelectedImageProperties(properties)` |
| 恢复图片原始尺寸 | `editor.resetSelectedImageSize()` |
| 标记遮罩图 | `editor.markImageAsMask(image, source)` |
| 创建打印区域 | `editor.createPrintArea(options)` |
| 更新打印区域 | `editor.updatePrintArea(properties)` |
| 识别遮罩透明区域 | `await editor.detectPrintAreaFromMask(options)` |
| 截图并上传打印区域 | `await editor.capturePrintArea(options)` |
| 添加文字 | `await editor.text.add(content, options)` |
| 更新文字 | `editor.text.update(target, options)` |
| 替换选中文字 | `editor.replaceSelectedText(content)` |
| 替换 H5 图片 | `await replaceH5Image(document, elementId, source, options)` |
| 替换 H5 文字 | `replaceH5Text(document, elementId, content)` |
| 选择元素 | `editor.select(target)` |
| 取消选择 | `editor.deselect()` |
| 获取选区工具条状态 | `editor.getSelectionToolbarState()` |
| 锁定/解锁选区 | `editor.toggleSelectionLock()` |
| 复制选区 | `editor.duplicateSelection()` |
| 删除选区 | `editor.deleteSelection()` |
| 组合选区 | `editor.groupSelection()` |
| 解散组合 | `editor.ungroupSelection()` |
| 获取图层 | `editor.layer.getList()` |
| 排序图层 | `editor.layer.reorder(ids)` |
| 删除图层 | `editor.layer.remove(id)` |
| 锁定图层 | `editor.layer.toggleLock(id)` |
| 点击穿透 | `editor.layer.togglePointerThrough(id)` |
| 获取全部元素 | `editor.getAllElements()` |
| 按角色获取元素 | `editor.getElementsByRole(role)` |
| 按类型获取元素 | `editor.getElementsByType(type)` |
| 写入业务属性 | `editor.elementData.set(target, attributes)` |
| 导出业务属性 | `editor.elementData.export()` |
| 监听事件 | `editor.eventBus.on(name, handler)` |
| 撤销/重做 | `editor.undo()` / `editor.redo()` |
| 销毁编辑器 | `editor.destroy()` |
