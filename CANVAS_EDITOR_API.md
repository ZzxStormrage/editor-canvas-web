# canvas-editor-core 使用说明

本文档说明编辑器的初始化、数据还原、画布编辑、业务属性、截图和跨端通信，供编辑器页面与
业务面板开发使用。

> 在线阅读：启动项目后访问 `#/docs`。完整编辑器示例位于 `#/editor`。

## 开发顺序

不要从头到尾通读所有 API。按照下面的顺序接入，完成前一步后再进入下一步：

| 阶段 | 你要完成的事情 | 首先阅读 |
| --- | --- | --- |
| 1. 选接入方式 | 判断是直接使用 Core、Vue 页面，还是 iframe / 小程序 | [调用边界](#/docs#调用边界)、[Vue 应用层](#/docs#vue-应用层) |
| 2. 创建编辑器 | 准备容器、创建实例、销毁实例 | [快速开始](#/docs#快速开始)、[创建编辑器](#/docs#创建编辑器)、[生命周期](#/docs#生命周期) |
| 3. 处理 JSON | 初始化已有模板、导出当前设计数据 | [统一编辑器文档](#/docs#统一编辑器文档) |
| 4. 接入宿主 | 通过后台、iframe 或小程序传入 JSON、Token 并接收保存数据 | [postMessage 跨端通信](#/docs#postmessage-跨端通信)、[自定义模板路由](#/docs#自定义模板路由) |
| 5. 编辑内容 | 设置画板、缩放视口，添加或替换图片和文字 | [画布与画板](#/docs#画布与画板)、[图片](#/docs#图片)、[文本](#/docs#文本) |
| 6. 开发面板 | 处理选中、图层排序、锁定、显隐和业务属性 | [选择](#/docs#选择)、[图层](#/docs#图层)、[元素业务属性](#/docs#元素业务属性) |
| 7. 生产输出 | 标记背景图、遮罩图，管理生产文件区域并截图 | [生产遮罩与生产文件区域](#/docs#生产遮罩与生产文件区域) |
| 8. 完善体验 | 监听变化、支持撤销重做、统一处理错误 | [事件](#/docs#事件)、[命令与历史](#/docs#命令与历史)、[错误处理](#/docs#错误处理) |

### 最小完整流程

如果只想先跑通“创建 → 加载 → 编辑 → 导出”，只需要以下 4 个 API：

| 步骤 | API |
| --- | --- |
| 创建实例 | [`createEditor(options)`](#/docs#api-createeditor) |
| 还原 JSON | [`editor.loadDocument(document)`](#/docs#api-editor-load-document) |
| 修改内容 | [`editor.text.update()`](#/docs#更新文本) 或 [`editor.replaceSelectedImage()`](#/docs#api-editor-replace-selected-image) |
| 获取 JSON | [`editor.exportDocument()`](#/docs#api-editor-export-document) |

完整编辑器的初始化数据和保存数据建议由宿主通过 `postMessage` 传递；编辑器只负责还原和导出，
不直接请求模板详情或保存接口。没有初始化 JSON 时不需要等待接口，编辑器会直接创建空白文档。

## 按场景查找

| 使用目标 | 建议章节 |
| --- | --- |
| 第一次接入 | “快速开始” → “创建编辑器” → “统一编辑器文档” |
| 开发 Vue 面板 | “调用边界” → “Vue 应用层” → 对应功能模块 |
| 嵌入后台或小程序 | “postMessage 跨端通信” → “自定义模板路由” |
| 添加图片或文字 | “图片” → “文本” → “选择” |
| 替换图片或文字 | “图片” → “文本” → “H5 文档测试运行时” |
| 开发图层面板 | “选择” → “图层” → “元素业务属性” |
| 查询元素或截图 | “元素业务属性” → “生产遮罩与生产文件区域” |
| 处理撤销和状态 | “事件” → “命令与历史” → “生命周期” |
| 排查问题 | “错误处理” → 对应模块 |

### 快速定位 API

在线文档左侧搜索支持三种输入方式，并按“精确 API → 中文功能别名 → 标题 → 正文”排序：

| 输入方式 | 示例 | 首个结果 |
| --- | --- | --- |
| 中文功能 | `替换图片`、`打印区域截图`、`获取所有元素` | 对应的公开 API |
| 方法名称 | `replaceImage`、`getElementsByRole`、`captureCanvas` | 完整方法签名 |
| 业务字段或错误码 | `role`、`自定义属性`、`IMAGE_LOCKED` | 包含该字段的章节 |

输入后点击结果，或按 Enter，页面会直接定位到相关 API。每个 API 标题左侧的 `#` 可以生成
稳定深链接，例如 `#/docs#api-editor-replace-image`。参数名称后续调整不会改变这个地址。

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

### 编辑器、业务页面和 H5 测试页

三个入口必须区分，不能互相复制渲染逻辑。

| 使用场景 | Vue 入口 | 渲染实现 | JSON 用途 |
| --- | --- | --- | --- |
| 完整编辑器 | `CanvasWorkspace` + `useCanvasEditor` | `canvas-editor-core` | 无损加载、编辑和导出 |
| 生产业务页面 | `CanvasDocumentViewport` | `canvas-editor-core` | 无损加载，再调用 API 应用页面策略 |
| H5 功能测试页 | `H5PreviewPage` + `H5CanvasRenderer` | HTML/CSS | 仅测试 H5 DTO、替换和输入规则 |

`H5PreviewPage` 不是生产页面，也不是编辑器还原入口。生产页面需要与编辑器保持一致时，
使用 `CanvasDocumentViewport`，不要直接操作 Leafer 节点。

## 自定义模板路由

完整编辑器只使用固定路由 `#/editor`，不接收模板 ID，也不会请求模板详情接口。空白编辑器会
立即完成初始化；宿主有 JSON 时，在收到 `editor:ready` 后通过 `template:load` 推送即可。

```text
# 编辑器固定入口
#/editor
```

不要再使用 `#/editor/1001` 或 `#/editor?templateId=1001` 初始化模板；即使宿主有模板 ID，也应先
在宿主侧得到 JSON，再通过 `template:load` 发送给编辑器。

编辑器初始化不读取 `id`、`templateId`、`itemId`、`partnerId`、`templateName` 或
`previewImgUrl`。这些模板元数据如有需要，应与 JSON 一起放在 `template:load.payload.template`
中。路由只暂时兼容 Token：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `token` | `string` | 否 | 兼容路由鉴权，也支持 `authorization`。读取后会立即从地址栏删除。 |

Token 优先通过 `postMessage` 的 `auth:token` 发送，避免出现在浏览器历史、截图或宿主日志中。
模板初始化和保存接口由宿主请求，因此模板数据消息不需要携带 Token。编辑器自身的图片上传、
字体等接口仍可使用 `auth:token` 提供的运行时 Token。

页面使用独立的 `useCustomTemplatePersistence()` 管理模板初始化和保存消息，不会把 HTTP、
Vue 或宿主通信逻辑写入 `canvas-editor-core`。当前规则：

| 场景 | 执行方 | 行为 |
| --- | --- | --- |
| 编辑器就绪 | 编辑器页面 | 发送 `editor:ready`，表示可以接收初始化 JSON。 |
| 有模板数据 | 外部宿主 | 发送 `template:load`，`document` 为完整统一 JSON。 |
| 没有模板数据 | 外部宿主 | 不需要发送任何初始化消息，编辑器直接使用空白文档。 |
| 还原画布 | 编辑器页面 | 调用 `editor.loadDocument()`，成功后发送 `editor:initialized`。 |
| 点击“立即保存” | 编辑器页面 | 只调用 `editor.exportDocument()`，发送 `template:save-requested`。 |
| 新增或修改模板 | 外部宿主 | 接收消息后自行调用保存接口、处理鉴权、重试和成功提示。 |
| 保存结果回执 | 外部宿主 | 成功发送 `template:saved`，失败发送 `template:save-failed`。 |

“立即保存”不会调用 `POST`、`PUT` 或模板列表接口。发送给宿主的核心 payload：

```js
{
  action: 'update',
  mode: 'edit',
  template: {
    id: 1001,
    itemId: 2001,
    userId: null,
    partnerId: 10,
    templateName: '生肖模板',
    previewImgUrl: ''
  },
  document: editor.exportDocument()
}
```

宿主需要接口字符串时，使用 `JSON.stringify(payload.document)` 生成 `content`。不要在编辑器
和宿主之间重复维护两套 JSON 格式。

## postMessage 跨端通信

项目通过 `src/services/message-bridge.js` 统一处理编辑器与后台管理系统、iframe、
`window.open` 页面及小程序 `web-view` 的通信。之前需求中出现的 `posstMeagess`、
`posstMegess` 都是历史拼写，代码中的正式方法名是 `postBridgeMessage`。

### 自动初始化

应用入口已经自动启动消息桥，并在 Vue 页面挂载完成后发送 `editor:ready`。这样宿主立即回传
初始化 JSON 时，编辑器组件已经完成消息订阅。模板页面会继续发送
初始化、加载和保存请求消息：

```js
import {
  MESSAGE_TYPES,
  postBridgeMessage,
  startMessageBridge
} from '@/services/message-bridge.js'

startMessageBridge()

postBridgeMessage(MESSAGE_TYPES.EDITOR_READY, {
  capabilities: [
    MESSAGE_TYPES.EDITOR_INITIALIZED,
    MESSAGE_TYPES.TEMPLATE_LOAD,
    MESSAGE_TYPES.TEMPLATE_SAVE_REQUESTED,
    MESSAGE_TYPES.TEMPLATE_SAVE_FAILED
  ]
})
```

业务组件不需要再次启动消息桥。`startMessageBridge()` 是幂等方法，重复调用会返回同一个
停止函数。

内置消息类型：

| 常量 | 实际值 | 方向 | 说明 |
| --- | --- | --- | --- |
| `MESSAGE_TYPES.EDITOR_READY` | `'editor:ready'` | 编辑器 → 宿主 | 编辑器通信层已就绪，`payload.capabilities` 表示支持的能力。 |
| `MESSAGE_TYPES.EDITOR_INITIALIZED` | `'editor:initialized'` | 编辑器 → 宿主 | 当前编辑器页面和模板上下文初始化完成，可以开始交互。 |
| `MESSAGE_TYPES.AUTH_TOKEN` | `'auth:token'` | 双向 | 传递登录 Token；编辑器接收后会用于后续 API 请求。 |
| `MESSAGE_TYPES.H5_AUTH_TOKEN` | `'h5:auth-token'` | 宿主 → H5 | 单独传递 H5 customer 接口 Token，不会覆盖编辑器 admin Token。 |
| `MESSAGE_TYPES.AUTH_EXPIRED` | `'auth:expired'` | 编辑器 → 宿主 | 接口返回 401，宿主应清理登录态并引导重新登录。 |
| `MESSAGE_TYPES.TEMPLATE_LOAD` | `'template:load'` | 宿主 → 编辑器 | 主动推送模板上下文和统一 JSON。 |
| `MESSAGE_TYPES.TEMPLATE_LOADING` | `'template:loading'` | 宿主 → 编辑器 | 可选状态消息；宿主正在获取模板。 |
| `MESSAGE_TYPES.TEMPLATE_LOADED` | `'template:loaded'` | 编辑器 → 宿主 | 模板 JSON 已成功还原到编辑器。 |
| `MESSAGE_TYPES.TEMPLATE_LOAD_FAILED` | `'template:load-failed'` | 双向 | 宿主获取失败，或编辑器还原 JSON 失败。 |
| `MESSAGE_TYPES.TEMPLATE_SAVE_REQUESTED` | `'template:save-requested'` | 编辑器 → 宿主 | 用户点击立即保存；包含模板上下文和统一 JSON。 |
| `MESSAGE_TYPES.TEMPLATE_SAVING` | `'template:saving'` | 宿主 → 编辑器 | 可选回执；宿主已开始持久化。 |
| `MESSAGE_TYPES.TEMPLATE_SAVED` | `'template:saved'` | 宿主 → 编辑器 | 可选回执；宿主接口保存成功。 |
| `MESSAGE_TYPES.TEMPLATE_SAVE_FAILED` | `'template:save-failed'` | 双向 | JSON 导出/发送失败，或宿主持久化失败。 |
| `MESSAGE_TYPES.H5_PAGE_SAVED` | `'h5:page-saved'` | H5 → 小程序 | H5 业务页面保存完成，包含页面标识、模板 JSON 和截图结果。 |

自定义消息类型可以使用任意非空字符串，推荐采用 `模块:动作` 格式，例如
`document:saved`、`selection:changed`。`'*'` 只允许用于订阅全部消息，不能作为发送类型。

### 标准消息结构

所有消息统一为可结构化克隆的普通对象：

```js
{
  channel: 'ele-editor',
  version: 1,
  id: 'message-id',
  type: 'document:saved',
  sender: 'editor',
  timestamp: 1784088000000,
  payload: {
    documentId: 'document-1001'
  }
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `string` | 是 | `'ele-editor'` | 固定通信频道，用于过滤其他页面消息。 |
| `version` | `number` | 是 | `1` | 消息协议版本。 |
| `id` | `string` | 否 | 自动生成 | 消息唯一 ID，方便日志追踪和请求响应关联。 |
| `type` | `string` | 是 | 无 | 消息类型。 |
| `sender` | `string` | 否 | `'editor'` | 发送方标识，例如 `editor`、`admin`、`mini-program`。 |
| `timestamp` | `number` | 否 | 当前时间 | Unix 毫秒时间戳。 |
| `payload` | `*` | 否 | `{}` | 业务数据，必须能被浏览器结构化克隆。 |

只需要创建消息、不立即发送时使用：

```js
import { createBridgeMessage } from '@/services/message-bridge.js'

const message = createBridgeMessage('document:saved', {
  documentId: 'document-1001'
}, {
  sender: 'editor'
})
```

### `postBridgeMessage(type, payload, options)`

发送一条标准消息，并返回本次实际调用的通道。

```js
import { postBridgeMessage } from '@/services/message-bridge.js'

const result = postBridgeMessage('document:saved', {
  documentId: 'document-1001',
  json: editorJson
})

console.log(result.message)
console.log(result.channels)
```

方法参数：

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `type` | `string` | 是 | 无 | 非空字符串，不能是 `'*'` | 消息类型。 |
| `payload` | `*` | 否 | `{}` | 可结构化克隆的数据 | 业务数据。 |
| `options` | `Object` | 否 | `{}` | 普通对象 | 发送配置。 |
| `options.target` | `string` | 否 | `'auto'` | `'auto'`、`'parent'`、`'opener'`、`'mini-program'` | 目标通道。 |
| `options.targetWindow` | `WindowProxy \| null` | 否 | 无 | 有效窗口引用 | 直接发送到指定窗口；设置后忽略 `target`。 |
| `options.targetOrigin` | `string` | 否 | 自动推导 | 完整 origin | 窗口消息目标源，例如 `https://admin.example.com`。 |
| `options.sender` | `string` | 否 | `'editor'` | 字符串 | 自定义发送方标识。 |
| `options.id` | `string` | 否 | 自动生成 | 字符串 | 指定消息 ID。 |

`target` 行为：

| 值 | 行为 |
| --- | --- |
| `'auto'` | 依次尝试小程序、父窗口、`window.opener`，成功后使用最合适的通道。 |
| `'parent'` | 仅发送到 iframe 的父窗口。 |
| `'opener'` | 仅发送到通过 `window.open()` 打开编辑器的窗口。 |
| `'mini-program'` | 仅发送到可用的小程序原生桥。 |

返回值类型为 `{ message: Object, channels: string[] }`。`channels` 可能包含
`'mini-program'`、`'parent'`、`'opener'` 或 `'window'`；空数组表示当前页面没有可用宿主，
不表示消息格式错误。

### 后台管理系统完整接入

后台管理系统准备好初始化 JSON 后，在收到 `editor:ready` 时直接推送给编辑器。编辑器不接收
模板 ID，也不会请求详情接口。后台必须同时校验消息来源和 iframe 窗口：

```js
const editorFrame = document.querySelector('#editor-frame')
const editorOrigin = 'https://editor.example.com'
const currentTemplateMetadata = {
  id: 'template-record-id',
  itemId: 'item-id',
  templateName: '生肖模板'
}

// 有模板数据时传完整统一 JSON；新建空模板时改为 null。
const currentEditorJson = {
  version: 1,
  canvas: {
    width: 1024,
    height: 1024,
    background: '#ffffff'
  },
  elements: []
}

function sendToEditor(type, payload) {
  editorFrame.contentWindow.postMessage({
    channel: 'ele-editor',
    version: 1,
    id: crypto.randomUUID(),
    type,
    sender: 'admin',
    timestamp: Date.now(),
    payload
  }, editorOrigin)
}

window.addEventListener('message', async (event) => {
  if (event.origin !== editorOrigin) return
  if (event.source !== editorFrame.contentWindow) return

  const message = event.data
  if (message?.channel !== 'ele-editor' || message.version !== 1) return

  if (message.type === 'editor:ready') {
    sendToEditor('auth:token', { token: accessToken })
    if (currentEditorJson) {
      sendToEditor('template:load', {
        template: currentTemplateMetadata,
        document: currentEditorJson
      })
    }
    return
  }

  if (message.type === 'template:save-requested') {
    const { action, template, document } = message.payload
    try {
      const dto = {
        ...template,
        content: JSON.stringify(document)
      }
      const record = action === 'create'
        ? await templateApi.create(dto)
        : await templateApi.update(dto)

      sendToEditor('template:saved', {
        requestId: message.id,
        template: record
      })
    } catch (error) {
      sendToEditor('template:save-failed', {
        requestId: message.id,
        error: { message: error.message }
      })
    }
  }
})
```

`currentEditorJson` 是宿主已经拥有的完整编辑器 JSON，可以是 JSON 字符串或普通对象；没有数据
时不发送 `template:load`。`currentTemplateMetadata` 是可选业务元数据。新增接口必须在
`template:saved.payload.template.id` 返回新模板 ID，否则编辑器下一次仍会按 `create` 发送。

### 模板生命周期通信示例

没有 JSON 时，编辑器核心就绪后直接发送 `editor:initialized`。有 JSON 时，宿主收到
`editor:ready` 后发送 `template:load`，编辑器还原成功后发送 `template:loaded` 和
`editor:initialized`。点击保存时编辑器发送
`template:save-requested`；宿主必须回传 `template:saved` 或 `template:save-failed`。

消息 payload 约定：

| 消息 | 关键字段 |
| --- | --- |
| `template:load` | `template`、`document`；仅在有初始化 JSON 时发送。 |
| `editor:initialized` | `mode`、`template`。`mode` 为 `'create'` 或 `'edit'`。 |
| `template:loaded` | `mode`、`template`。不重复发送完整 JSON。 |
| `template:save-requested` | `action`、`template`、`document`。`action` 为 `'create'` 或 `'update'`。 |
| `template:saved` | `requestId`、`template`；新增时 `template.id` 必须是后端生成的新 ID。 |
| `template:load-failed` / `template:save-failed` | `error.code`、`error.message`、`error.status`。 |

编辑器不再直接调用保存接口，因此“保存数据已发送”只表示消息已交给宿主通道，不等于数据已经
持久化成功。最终保存状态由宿主接口结果决定。

### 初始化和保存的职责边界

iframe 集成时，初始化与保存都由宿主负责：宿主统一处理 Token、接口域名、权限、错误
重试和业务日志；编辑器只负责 `loadDocument()` 与 `exportDocument()`。这样同一套编辑器可以嵌入
不同后台，而不需要知道各后台接口。

当前版本已经按此边界实现，`EditorPage` 不再调用模板详情、新增或修改接口。HTTP 逻辑没有进入
`canvas-editor-core`，宿主传入和接收的 `document` 使用同一种统一 JSON 格式。

### 后台管理系统向编辑器传 Token

编辑器启动后会发送 `editor:ready`。后台收到该消息后再发送 `auth:token`，可以避免 iframe
尚未完成监听初始化时丢失 Token。

```js
const editorFrame = document.querySelector('#editor-frame')
const editorOrigin = 'https://editor.example.com'

window.addEventListener('message', (event) => {
  if (event.origin !== editorOrigin) return
  if (event.source !== editorFrame.contentWindow) return

  const message = event.data
  if (message?.channel !== 'ele-editor' || message.version !== 1) return
  if (message.type !== 'editor:ready') return

  editorFrame.contentWindow.postMessage({
    channel: 'ele-editor',
    version: 1,
    type: 'auth:token',
    sender: 'admin',
    timestamp: Date.now(),
    payload: {
      token: accessToken
    }
  }, editorOrigin)
})
```

Token 约定：

- 推荐字段为 `payload.token`，兼容字段为 `payload.authorization`。
- 可以传原始 Token，也可以传 `Bearer xxx`；编辑器会自动去除 `Bearer` 前缀。
- Token 只保存在运行时内存中，收到新值后会覆盖临时回退 Token。
- 后续 Alova API 请求会自动写入 `Authorization: Bearer <token>`。
- 不要把真实 Token 写入文档、URL 查询参数或日志。

编辑器内部也可以主动向宿主发送 Token：

```js
import { postAccessToken } from '@/services/auth-token.js'

postAccessToken(accessToken, {
  target: 'parent',
  targetOrigin: 'https://admin.example.com'
})
```

### `window.open` 页面通信

编辑器由后台通过 `window.open()` 打开时，发送到 `opener`：

```js
postBridgeMessage('document:saved', {
  documentId: 'document-1001',
  json: editorJson
}, {
  target: 'opener',
  targetOrigin: 'https://admin.example.com'
})
```

后台页面仍使用标准 `window.addEventListener('message', handler)` 接收，并校验
`event.origin` 与 `event.source === editorWindow`。

### 小程序 `web-view` 通信

编辑器会自动识别 `uni`、微信、QQ、支付宝、百度、抖音和京东小程序桥。

```js
postBridgeMessage('document:saved', {
  documentId: 'document-1001',
  json: editorJson
}, {
  target: 'mini-program'
})
```

微信小程序页面示例：

```xml
<web-view src="{{ editorUrl }}" bindmessage="handleEditorMessage" />
```

```js
Page({
  onLoad(options) {
    const templateId = encodeURIComponent(options.templateId)
    const token = encodeURIComponent(wx.getStorageSync('accessToken'))

    this.setData({
      editorUrl: `https://editor.example.com/#/h5-page/chinese-zodiac?templateId=${templateId}&token=${token}`
    })
  },

  handleEditorMessage(event) {
    const messages = event.detail.data || []
    const message = [...messages]
      .reverse()
      .find((item) => item?.type === 'h5:page-saved')

    if (message?.channel !== 'ele-editor' || message.version !== 1) return

    const { page, templateId, json, printAreaImage } = message.payload || {}
    if (page !== 'chinese-zodiac') return

    console.log('生肖 H5 保存结果', {
      templateId,
      json,
      printAreaImage
    })

    wx.setStorageSync('chinese-zodiac-result', message.payload)
  }
})
```

微信 `web-view` 标准能力不提供小程序主动调用 H5 JavaScript 的通道，因此首次 Token 推荐放在
H5 hash 路由查询参数中。H5 支持 `token`、`authorization` 和 `Authorization`，读取后会立即
写入内存并通过 `router.replace()` 从地址栏删除。后台 iframe 或具备 JavaScript 注入能力的
原生容器应发送 `h5:auth-token` 消息，避免 Token 出现在 URL 中。`auth:token` 只提供给后台
编辑器的 `/admin/api` 请求，不能作为 H5 `/customer/api` 请求的 Token。

```js
window.EleEditorBridge.receiveMessage({
  channel: 'ele-editor',
  version: 1,
  type: 'h5:auth-token',
  sender: 'mini-program',
  payload: {
    token: h5AccessToken
  }
})
```

生肖页面保存成功后会按以下顺序处理：

```js
const result = postBridgeMessage(MESSAGE_TYPES.H5_PAGE_SAVED, {
  page: 'chinese-zodiac',
  templateId,
  json: editorJson,
  printAreaImage
}, {
  target: 'mini-program',
  sender: 'h5-page'
})

if (result.channels.includes('mini-program')) {
  wxAPI.navigateBack({ delta: 1 })
}
```

`wxAPI` 来自 `src/views/h5-page/services/wx-api.js`。项目在 `index.html` 中加载微信官方
`jweixin-1.3.2.js`，由其提供 `window.wx.miniProgram`。微信的 `bindmessage` 通常在 web-view
返回、分享或销毁时把消息交给小程序页面，所以生肖 H5 在成功发送后立即调用
`wx.miniProgram.navigateBack()`；普通浏览器没有微信桥时不会自动返回。

### 编辑器订阅宿主消息

使用 `subscribeBridgeMessage()` 订阅指定类型，组件卸载时必须取消：

```js
import { onBeforeUnmount } from 'vue'

import { subscribeBridgeMessage } from '@/services/message-bridge.js'

const unsubscribe = subscribeBridgeMessage('document:load', ({ message, payload, context }) => {
  console.log(message.id)
  console.log(payload.document)
  console.log(context.origin, context.transport)
})

onBeforeUnmount(unsubscribe)
```

监听全部消息：

```js
const unsubscribe = subscribeBridgeMessage('*', ({ message }) => {
  console.log(message.type, message.payload)
})
```

处理器可以是同步函数或异步函数。单个处理器异常只会记录日志，不会阻断其他订阅者。

### 原生容器与全局桥

消息桥启动后会暴露 `window.EleEditorBridge`，供原生 WebView 容器直接调用：

```js
window.EleEditorBridge.receiveMessage({
  channel: 'ele-editor',
  version: 1,
  type: 'auth:token',
  sender: 'native-app',
  payload: {
    token: accessToken
  }
})
```

全局对象提供以下方法：

| 方法或字段 | 类型 | 说明 |
| --- | --- | --- |
| `channel` | `string` | 固定为 `'ele-editor'`。 |
| `version` | `number` | 当前为 `1`。 |
| `postMessage(type, payload, options)` | `Function` | 对应 `postBridgeMessage()`。 |
| `receiveMessage(message, context)` | `Function` | 注入宿主消息，识别成功返回 `true`。 |
| `subscribe(type, handler)` | `Function` | 对应 `subscribeBridgeMessage()`。 |

`receiveMessage()` 同时兼容标准对象、JSON 字符串和 `{ data: message }` 包装格式。

### 来源白名单

生产环境不要使用 `'*'`。可以通过环境变量配置多个允许来源：

```env
VITE_MESSAGE_ALLOWED_ORIGINS=https://admin.example.com,https://ops.example.com
```

也可以在手动初始化时传入：

```js
const stopBridge = startMessageBridge({
  allowedOrigins: [
    'https://admin.example.com',
    'https://ops.example.com'
  ]
})

// 仅在整个应用不再需要通信时调用
stopBridge()
```

接收白名单会自动包含编辑器自身 origin 和 `document.referrer` 的 origin。发送窗口消息时，
推荐始终显式传入 `targetOrigin`；未传时才会从 referrer、环境变量或当前页面来源推导。

### 通信排查

| 现象 | 检查项 |
| --- | --- |
| `channels` 返回 `[]` | 当前页面是否真的位于 iframe、小程序或 `window.open` 场景。 |
| 后台收不到消息 | `target` 是否正确，`targetOrigin` 是否与后台 origin 完全一致。 |
| 编辑器收不到消息 | 消息是否包含 `channel: 'ele-editor'`、`version: 1` 和有效 `type`。 |
| Token 未生效 | 是否在 `editor:ready` 后发送，字段是否为 `payload.token` 或 `payload.authorization`。 |
| 消息被忽略 | `event.origin` 是否在 `allowedOrigins` 或 `VITE_MESSAGE_ALLOWED_ORIGINS` 中。 |
| 小程序消息延迟 | 检查对应平台 `web-view postMessage` 的触发时机限制。 |

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
| `editor.document` | 统一 JSON 加载、导出和清空插件。 |
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
editor.panBy(40, -20)
```

`panBy(deltaX, deltaY)` 按视口像素增量平移画布，不改变缩放比例和元素文档坐标。完整编辑器已
默认启用“按住空格 + 鼠标左键拖拽”；输入框、文本域和画布文字编辑状态下，空格仍用于正常输入。

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
| `options.fit` | `string` | 否 | `'contain'` | `'contain'`、`'cover'`、`'stretch'` | 保留外框时，新图片在当前外框中的适配方式。 |
| `options.preserveFrame` | `boolean` | 否 | `true` | `true`、`false` | `true` 保持外框；`false` 仅保持中心，按新图比例更新选框。 |

`fit` 行为：

| 值 | `preserveFrame: true` 时的效果 | 是否保持图片比例 | 对齐方式 | 使用场景 |
| --- | --- | --- | --- | --- |
| `'contain'` | 是 | 是 | 水平、垂直居中 | 默认值；完整显示新图片，比例不一致时允许留白。 |
| `'cover'` | 是 | 是 | 水平、垂直居中 | 填满原外框，比例不一致时裁切边缘。 |
| `'stretch'` | 是 | 否 | 填满外框 | 严格铺满原外框，可能拉伸图片。 |

`preserveFrame: false` 时，原节点尺寸作为 contain 的最大范围，新的
`width/height` 按图片原始比例计算。`scaleX/scaleY` 及翻转方向完全沿用替换前的值，
仅补偿节点位置以保持世界中心点不变。选框会自动更新为新图比例，图片不拉伸、不裁切。
编辑器悬浮工具栏的“替换”使用该模式。

替换只修改图片资源和填充模式，不重建节点，因此以下内容保持不变：

- `elementId`、自定义属性和图片角色。
- 旋转、翻转、透明度和缩放。
- 图层顺序、点击穿透状态和选中状态。

`preserveFrame: true` 时还保留 `x`、`y`、`width`、`height`；设为 `false` 时会更新
`x`、`y`、`width`、`height`，但替换前后的世界中心点不变。

新资源会先加载，再一次性替换，避免先以原始尺寸绘制后再次缩放造成闪烁。图片锁定时
不会替换，需要先解锁。`File` 和 `Blob` 产生的临时 URL 由图片插件统一释放。

### `editor.replaceImage(target, source, options)`

替换指定图片节点，不要求先选中节点，也不会改变当前选区。该方法适合生产 H5 页面先按
自定义属性查询模板槽位，再替换对应图片：

```js
const imageUrl = await customerPictureApi.upload(file)
const targets = editor.getElementsByAttribute('image.description', '原图替换')

await Promise.all(
  targets.map((target) => editor.replaceImage(target, imageUrl, {
    fit: 'contain',
    allowLocked: true
  }))
)
```

| 参数 | 类型 | 必填 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `target` | `Image` | 是 | 无 | 核心查询 API 返回的图片节点 | 要替换的原图片节点。 |
| `source` | `string \| File \| Blob` | 是 | 无 | 图片 URL、SVG、`File`、`Blob` | 新图片来源。生产页应优先传上传后的永久 URL。 |
| `options` | `Object` | 否 | `{}` | 普通对象 | 替换配置。 |
| `options.fit` | `string` | 否 | `'contain'` | `'contain'`、`'cover'`、`'stretch'` | 图片在原节点外框中的适配方式。 |
| `options.allowLocked` | `boolean` | 否 | `false` | `true`、`false` | 是否允许替换锁定模板槽位；仅生产端固定槽位应设为 `true`。 |
| `options.preserveFrame` | `boolean` | 否 | `true` | `true`、`false` | 是否保留目标节点的原外框。 |

默认不允许修改锁定图片，保持编辑器交互的保护规则。生产 H5 可对已明确标记的固定模板槽位
显式传入 `allowLocked: true`。目标不是图片时抛出 `IMAGE_TARGET_INVALID`，目标锁定且未允许替换
时抛出 `IMAGE_LOCKED`。

`replaceSelectedImage()` 是面向编辑器选区的便捷方法，`replaceImage()` 是面向业务查询结果的
指定节点方法；两者最终使用同一套图片加载、适配、事件通知和临时 URL 清理逻辑。

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

## 生产遮罩与生产文件区域

界面统一显示为“生产文件区域”。为保持已有接入代码兼容，公开 API 和事件中的
`PrintArea`、`printArea` 命名不变；旧 JSON 中名为“打印区域”的节点也会自动升级识别。

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

### 管理生产文件区域

生产文件区域的位置以画板左上角为原点，可以通过画布控制点或 API 调整：

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

### 相对生产文件区域对齐图片或文字

先严格单选一个未锁定的图片或文字，再按元素当前视觉外框与生产文件区域对齐：

```js
editor.alignSelectionToPrintArea('horizontal-center')
editor.alignSelectionToPrintArea('vertical-center')
```

| `alignment` | 类型 | 说明 |
| --- | --- | --- |
| `'left'` | `string` | 元素左边界与生产文件区域左边界对齐。 |
| `'horizontal-center'` | `string` | 元素与生产文件区域水平居中。 |
| `'right'` | `string` | 元素右边界与生产文件区域右边界对齐。 |
| `'top'` | `string` | 元素顶部与生产文件区域顶部对齐。 |
| `'vertical-center'` | `string` | 元素与生产文件区域垂直居中。 |
| `'bottom'` | `string` | 元素底部与生产文件区域底部对齐。 |

对齐只修改元素位置，不改变图片宽高、文字样式、缩放比例、旋转角度或图层顺序，并会进入
撤销历史。没有生产文件区域、没有严格单选图片或文字、或元素已锁定时会抛出对应编辑器错误。

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

该 API 文档位于“生产遮罩与生产文件区域”模块。它按照当前生产文件区域截图，返回一个
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

### `editor.captureCanvas(options)`

截取完整画板范围，不要求存在打印区域。该方法同样使用离屏克隆，不会改变当前编辑器画面，
返回值规则与 `capturePrintArea()` 一致：未传 `upload` 时返回 `File`，传入后返回上传接口结果。

```js
const file = await editor.captureCanvas({
  includeBackground: true,
  includeMask: true,
  type: 'image/png',
  pixelRatio: 1
})
```

上传完整画板：

```js
const imageUrl = await editor.captureCanvas({
  upload: (file) => pictureApi.upload(file)
})
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `includeBackground` | `true` | 是否包含标记为背景图的图片。 |
| `includeMask` | `true` | 是否包含遮罩图。 |
| `type` | `image/png` | 支持 PNG、JPEG 和 WebP。 |
| `quality` | `1` | JPEG/WebP 图片质量，范围 `0-1`。 |
| `pixelRatio` | `1` | 输出像素倍率。 |
| `fileName` | 自动生成 | 文件名，默认以 `canvas-` 开头。 |
| `fill` | 画板背景色 | 没有不透明背景图片时使用的输出底色。 |
| `upload` | 无 | 接收 `File` 的上传函数。 |

完整画板截图始终排除打印区域边框和吸附辅助线；如果需要透明 PNG，可显式传入
`{ fill: undefined }`。通过 `useCanvasEditor()` 调用时，Vue 封装默认使用 `pictureApi.upload`。

### 保存与截图相互独立

“立即保存”只调用 `exportDocument()` 获取统一 JSON，不检测打印区域，也不会自动截图或上传：

```js
const editorJson = editor.exportDocument()
```

打印区域截图是独立的可选业务操作。调用方根据自己的流程决定是否执行：

```js
let printAreaImage = null

if (shouldCapturePrintArea) {
  printAreaImage = await editor.capturePrintArea({
    includeBackground: false,
    includeMask: false
  })
}
```

只有调用截图 API 时才需要检查打印区域并展示 Loading。截图不包含背景图、遮罩图、打印区域
边框和吸附辅助线。

## 文本

### 添加文本

```js
const text = await editor.text.add('标题', {
  x: 40,
  y: 80,
  width: 300,
  fontFamily: '字由点字典黑35J',
  fontUrl: 'https://cdn.example.com/fonts/dianzidianhei-35j.ttf',
  fontSize: 32,
  fontWeight: 700,
  fill: '#111827',
  textAlign: 'center',
  lineHeight: 40,
  letterSpacing: 0,
  writingMode: 'x'
})
```

远程自定义字体必须同时传入 `fontFamily` 和 `fontUrl`。`fontFamily` 是渲染名称，`fontUrl`
是浏览器可访问且允许跨域加载的字体文件地址。系统字体不需要 `fontUrl`。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fontFamily` | `string` | 否 | `PingFang SC` | 字体名称；包含空格时内核自动处理 CSS 引号。 |
| `fontUrl` | `string` | 远程字体是 | 无 | 字体文件地址，支持浏览器 `FontFace` 可加载的格式。 |

`editor.text.add()` 会先等待字体注册，再创建和测量文本。`editor.loadDocument()` 也会在还原
场景树前递归预加载 JSON 中的全部字体，因此 `#/editor` 与使用 `CanvasDocumentViewport` 的
H5 页面采用相同字体初始化流程。

导出的文本节点会保留字体地址：

```js
{
  tag: 'Text',
  text: '标题',
  fontFamily: '字由点字典黑35J',
  fontUrl: 'https://cdn.example.com/fonts/dianzidianhei-35j.ttf'
}
```

请始终保存 `editor.exportDocument()` 的完整结果，不要在业务层删除 `fontUrl`；否则其他页面
只能拿到字体名称，无法下载对应字体文件。

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

业务页面需要修改指定文字样式时，使用 Editor 外观方法，不改变当前选区：

```js
const surnameElements = editor.getElementsByAttribute('text.description', '姓')

surnameElements.forEach((element) => {
  editor.updateText(element, {
    fontFamily: '字由点字典宋',
    fontUrl: 'https://cdn.example.com/fonts/dianzidiansong.ttf',
    width: element.width
  })
})
```

`width` 可用于保持当前文字框宽度；不传时，字体变化后 TextPlugin 会按新字体重新测量宽度。

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

### `editor.replaceText(target, content)`

替换指定文本节点，不要求先选中，也不会改变当前选区。适合 H5 表单根据文字描述更新模板：

```js
const yearElements = editor.getElementsByAttribute('text.description', '年')

yearElements.forEach((element) => {
  editor.replaceText(element, '1990')
})
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `target` | `Text` | 是 | 无 | `getElementsByAttribute()` 等查询 API 返回的文本节点。 |
| `content` | `string \| number` | 是 | 无 | 新文本内容，数字会转换为字符串。 |

该方法保留 `elementId`、自定义属性、位置、样式和固定宽度，并返回原文本节点。目标不是文本
节点时抛出 `TEXT_TARGET_INVALID`。

### `editor.replaceTextWithRules(target, content, options?)`

按文本元素的 `attributes.textInput` 和 `attributes.textLayout` 配置过滤并替换内容。
该方法用于 H5 生产页面，原有 `replaceText()` 行为保持不变。

```js
const surname = editor.getElementsByAttribute('text.description', '姓')[0]

editor.replaceTextWithRules(surname, '欧阳')
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `target` | `Text` | 是 | 无 | 目标文本节点。 |
| `content` | `string \| number` | 是 | 无 | 新文本内容。 |
| `options.rules` | `object` | 否 | 元素的 `attributes.textInput` | 临时覆盖输入规则。 |
| `options.layout` | `object` | 否 | 元素的 `attributes.textLayout` | 临时覆盖显示策略。 |

显示策略配置：

```json
{
  "attributes": {
    "textInput": {
      "enabled": true,
      "allowManualNewline": false,
      "maxCharacters": 4,
      "maxLines": 1
    },
    "textLayout": {
      "mode": "single-line",
      "overflow": "shrink-then-visible",
      "minFontSize": 24
    }
  }
}
```

| 字段 | 类型 | 默认值 | 可选值或限制 | 说明 |
| --- | --- | --- | --- | --- |
| `textLayout.mode` | `string` | `wrap` | `wrap`、`single-line`、`vertical` | 自动换行、固定宽度单行适配或单列竖排。 |
| `textLayout.overflow` | `string` | `shrink-then-visible` | `shrink-then-visible` | 先缩小字号，达到最小字号后允许超出。 |
| `textLayout.minFontSize` | `number \| null` | 模板字号的 60% | 大于 `0` | 自动缩小的最小字号。 |

`single-line` 模式会移除换行、保持模板宽度和中心点，并从模板初始字号向下查找可完整
显示内容的最大字号。内容重新变短时会恢复模板字号，不会在上一次缩小结果上继续累计。
达到最小字号仍无法完整显示时，文字保持单行并允许超出，不裁切、不换行。

输入长度继续遵循 `textInput` 的加权规则：中文及非 ASCII 字符计 `2`，ASCII 字符计
`1`。限制“欧阳”两个中文时，`maxCharacters` 应配置为 `4`，不是 `2`。

H5 单列竖行约束：

```json
{
  "attributes": {
    "textInput": {
      "enabled": true,
      "singleVerticalLine": true,
      "maxCharacters": 8
    }
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `textInput.singleVerticalLine` | `boolean` | `false` | 是否限制 H5 用户输入按单列从上到下排列。 |

`singleVerticalLine` 只在 `textInput.enabled: true` 时生效。开启后会移除用户换行、强制使用
`writingMode: "y"`，并禁止换到第二竖列。该约束保持模板字号和元素中心，不执行单行缩小，
同时忽略 `allowManualNewline`、`maxCharactersPerLine` 和 `maxLines`；内容长度只由
`maxCharacters` 控制。

低层调用 `editor.replaceTextWithLayout(target, content, { layout: { mode: 'vertical' } })` 仍可
直接执行同样的单列竖排能力，主要用于不经过 H5 输入规则的业务场景。

输入已经由调用方过滤时，也可以使用 `editor.replaceTextWithLayout(target, content)` 只执行
显示策略。

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

### `editor.layer.getList()`

```js
const layers = editor.layer.getList()
```

常用操作：

```js
editor.layer.select(layerId)
editor.layer.remove(layerId)
editor.layer.toggleLock(layerId)
editor.layer.toggleVisibility(layerId)
editor.layer.togglePointerThrough(layerId)
editor.layer.hover(layerId)
editor.layer.hover(null)
```

按面板从上到下的顺序排序：

```js
editor.layer.reorder(orderedLayerIds)
```

### `editor.layer.toggleVisibility(id)`

切换图层显示状态。隐藏只修改 `visible`，不会删除元素，也不会改变图层顺序、锁定状态、
自定义属性或 JSON 数据。隐藏中的图层仍会保留在图层列表，可以再次调用该方法恢复显示。

### `editor.layer.reorder(orderedIds)`

`orderedIds` 按面板从上到下排列。插件会转换为 Leafer 场景树顺序，并同步选区和画板覆盖层。

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

推荐通过 Editor 外观 API 查询。以下四个方法始终返回数组，没有匹配结果时返回 `[]`：

```js
const allElements = editor.getAllElements()
const maskElements = editor.getElementsByRole('mask')
const backgroundElements = editor.getElementsByRole('background')
const imageElements = editor.getElementsByType('image')
const textElements = editor.getElementsByType('text')
```

#### `editor.getAllElements()`

返回当前画布全部业务元素，递归包含组合中的子元素。运行时辅助线和编辑器控制节点不会返回。

#### `editor.getElementsByRole(role)`

按业务角色精确匹配元素，例如 `background`、`mask`、`ai-variable`。始终返回数组。

#### `editor.getElementsByType(type)`

按 `customType`、Leafer `tag` 或构造函数名称匹配，类型大小写不敏感，例如 `image`、`text`、
`group`。

#### `editor.getElementsByAttribute(path, value)`

按自定义属性路径和值查询元素，例如：

```js
const replaceableImages = editor.getElementsByAttribute('image.description', '原图替换')
const surnameTexts = editor.getElementsByAttribute('text.description', '姓')
```

`path` 相对于元素的 `attributes` 对象，不需要写 `attributes.` 前缀。没有匹配结果时返回 `[]`。

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

## 统一编辑器文档

统一文档由 `canvas-editor-core` 的 `DocumentPlugin` 管理。`version=1` 文档可保留画板、
图层顺序、组合层级、锁定状态、交互状态、变换、稳定 `elementId` 和自定义属性。

```js
const editor = createEditor({ view: container })

await editor.loadDocument(documentJson)
const savedDocument = editor.exportDocument()
```

### `editor.loadDocument(document, options)`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `document` | `object \| string` | 是 | 无 | `version=1` 文档对象或 JSON 字符串。 |
| `options.interactive` | `boolean` | 否 | 保留 JSON | 统一覆盖节点的 `draggable`、`editable`、`hittable`。 |
| `options.productionVisibility` | `'preserve' \| 'hidden'` | 否 | `'preserve'` | 保留或隐藏打印区域等生产辅助节点。 |

图片会在替换场景前预加载。任意图片加载失败时，原文档保持不变。

### `editor.exportDocument()`

返回可再次传给 `loadDocument()` 的普通对象。顶层元素坐标以画板左上角为原点，组合子元素
继续使用组合内部坐标。

```js
const json = JSON.stringify(editor.exportDocument(), null, 2)
```

### 完整编辑器中加载

`CanvasWorkspace` 只监听 props 并调用 composable，不解析 JSON。

```vue
<CanvasWorkspace
  :editor="editor"
  :document="documentData"
  :document-options="{ productionVisibility: 'preserve' }"
  :fit-options="{ viewportRatio: 0.8, expandZoomRange: true }"
/>
```

也可以直接调用：

```js
await editor.loadDocument(documentData)
editor.fitArtboardToView({ viewportRatio: 0.8, expandZoomRange: true })
```

### 生产业务页面中加载

`CanvasDocumentViewport` 只创建核心实例、调用文档 API 并负责容器尺寸适配。是否允许选择、
拖动和缩放由调用方通过文档字段或 `loadOptions.interactive` 决定。

```vue
<CanvasDocumentViewport
  ref="viewportRef"
  :document="documentData"
  :load-options="{ productionVisibility: 'hidden' }"
  @loaded="onDocumentLoaded"
/>
```

业务页面通过核心 API 应用自己的展示策略：

```js
function onDocumentLoaded({ editor }) {
  editor.arrangeLayersByRole({
    back: ['background'],
    front: ['mask']
  })

  editor.setElementsVisibilityByAttribute('image.description', '鼠', {
    exclusive: true
  })
}
```

`arrangeLayersByRole()` 和 `setElementsVisibilityByAttribute()` 只改变当前运行时状态；
`loadDocument()` 本身始终按 JSON 顺序无损还原。

### 生肖 H5 模板路由

生肖生产页面使用查询参数接收模板主键：

```text
# 回显模板 ID 1001
#/h5-page/chinese-zodiac?templateId=1001

# 带分销商请求头回显模板
#/h5-page/chinese-zodiac?templateId=1001&partnerId=10

# 微信小程序 web-view 初始化时传入 Token
#/h5-page/chinese-zodiac?templateId=1001&token=ACCESS_TOKEN

# 保存成功后跳转到指定微信小程序页面
#/h5-page/chinese-zodiac?templateId=1001&productInfoId=2807&skuId=516&redirectPath=subPackage2/home/productDetail/orderDetails
```

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `templateId` | 查询参数 | 正整数 | 是 | 自定义模板主键；请求 `/customer/api/customTemplate/{templateId}`。 |
| `partnerId` | 查询参数 | 正整数 | 否 | 写入模板详情请求的 `X-Partner-Id` 请求头。 |
| `token` | 查询参数 | 字符串 | 否 | 小程序初始化 Token；兼容 `authorization` 和 `Authorization`，读取后立即从 URL 删除。 |
| `designName` | 查询参数 | 字符串 | 否 | 用户设计名称；未传时使用当前业务页面名称。 |
| `redirectPath` | 查询参数 | 小程序主包或分包页面路径 | 否 | 保存成功后通过 `wx.miniProgram.redirectTo()` 跳转，例如 `subPackage2/home/productDetail/orderDetails`。 |

正式约定使用查询参数 `templateId`，不使用含义模糊的 `id`。H5 生产页面的模板读取和截图上传
统一使用 `/customer/api`，后台编辑器继续使用 `/admin/api`。接口返回的 `content` 会先经过
统一文档校验，再交给 `CanvasDocumentViewport` 还原；没有 `templateId` 或接口失败时显示页面
错误状态，不初始化画布，也不会使用本地模拟数据。截图上传地址为
`/customer/api/localStorage/pictures`。

当 `redirectPath` 存在时，页面保存成功后优先调用微信小程序 `redirectTo`；没有参数时继续
执行原有的微信小程序返回上一页逻辑。普通浏览器调试时，站内路径和 HTTP(S) 地址会作为
回退跳转目标。H5 URL 中的业务参数会自动追加到小程序目标地址；`templateId`、`partnerId`、
`designName`、Token 和 `redirectPath` 等 H5 内部参数不会透传。若目标地址已包含同名参数，
以目标地址中的参数为准。

例如：

```text
H5 URL:
#/h5-page/chinese-zodiac?templateId=3&productInfoId=2807&skuId=516&skuCustomId=2074&quantity=1&redirectPath=subPackage2/home/productDetail/orderDetails

微信小程序最终跳转：
/subPackage2/home/productDetail/orderDetails?productInfoId=2807&skuId=516&skuCustomId=2074&quantity=1
```

### 保存 H5 用户设计

所有生产 H5 页面点击保存时统一调用：

```http
POST /customer/api/customTemplate
Authorization: Bearer <H5_TOKEN>
X-Partner-Id: 10
Content-Type: application/json
```

调用代码：

```js
const result = await saveH5CustomDesign(editor, {
  templateId: route.query.templateId,
  designName: route.query.designName || '生肖定制',
  partnerId: route.query.partnerId
})
```

请求 DTO：

| 字段 | 类型 | 必填 | 来源 |
| --- | --- | --- | --- |
| `content` | `string` | 是 | `editor.exportDocument()` 返回的统一 JSON，经 `JSON.stringify()` 转换。 |
| `designName` | `string` | 否 | 路由 `designName` 或当前业务页面名称。 |
| `previewImgUrl` | `string` | 是 | `captureCanvas()` 完整画板截图上传地址，包含背景图和遮罩图。 |
| `productImgUrl` | `string` | 否 | `capturePrintArea()` 打印区域截图上传地址，不包含背景图和遮罩图；没有打印区域时不发送。 |
| `templateId` | `number` | 是 | 路由 `templateId`，表示用户设计基于哪个后台模板。 |

保存顺序固定为：导出 JSON → 上传完整画板截图 → 按需上传打印区域截图 → POST 用户设计 →
发送 `H5_PAGE_SAVED` 消息 → 按 `redirectPath` 跳转微信小程序页面。任一步失败都会停止保存和
跳转，并由页面 Loading/错误状态反馈。

### 图片文字定制 H5 路由

原图定制和音乐款定制共用同一套生产运行时，只通过页面配置区分业务标识：

```text
# 原图定制
#/h5-page/original-customization?templateId=1001

# 音乐款定制
#/h5-page/music-customization?templateId=1001
```

两类模板使用相同的元素标记约定：

| 元素 | 自定义属性路径 | 属性值 | 页面行为 |
| --- | --- | --- | --- |
| 可替换图片 | `image.description` | `原图替换` | 图片上传成功后保持节点位置、尺寸、层级和变换属性，只替换资源。 |
| 可替换文字 | `text.description` | `文本替换` | 输入内容实时同步到所有匹配文本节点。 |

页面先通过 `/customer/api/localStorage/pictures` 上传用户图片，取得永久 URL 后再调用
`editor.replaceImage()`。保存成功后通过 `MESSAGE_TYPES.H5_PAGE_SAVED` 将 `page`、
`templateId`、`json`、`previewImgUrl`、`productImgUrl` 和接口返回结果发送给微信小程序。

H5 customer Token 与编辑器 admin Token 完全独立。本地调试 H5 页面时使用：

```env
VITE_H5_TEMPORARY_ACCESS_TOKEN=H5_CUSTOMER_TOKEN
```

H5 `/customer/api/localStorage/pictures` 与 `/customer/api/customTemplate` 共用
`src/views/h5-page/api/customer-client.js` 中的 `customerClient` 和
`VITE_XIAOXIANG_API_BASE_URL`。开发环境下两者都会经过
`/xiaoxiang-api` 代理，避免浏览器跨域限制；上传接口返回的相对图片地址仍按代理目标域名
补全为可持久化的绝对 URL。

## H5 文档测试运行时

本节 API 服务于 `H5PreviewPage` 测试页，不替代 `canvas-editor-core` 的统一文档加载。

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
| `production:selection-aligned` | `{ target, alignment, printArea, bounds }` | 图片或文字完成打印区域对齐。 |
| `layers:changed` | `{ layers }` | 刷新图层列表。 |
| `selection:toolbar-changed` | `{ visible, bounds, locked, disabled }` | 刷新 Vue 选区工具条。 |
| `selection:group-changed` | `{ action, group, children }` | 同步组合或解组后的场景状态。 |
| `element-data:changed` | `{ elementId, attributes }` | 同步业务属性面板。 |
| `artboard:resized` | `{ artboard }` | 同步画板尺寸。 |
| `viewport:zoom-changed` | `{ zoom, previous }` | 同步缩放显示。 |
| `viewport:pan-changed` | `{ x, y, deltaX, deltaY }` | 同步视口平移后的悬浮工具条。 |
| `history:changed` | `{ canUndo, canRedo, restoring }` | 同步设计内容的撤销、重做和恢复状态。 |

订阅者异常由 EventBus 隔离，不会中断其他监听器。组件卸载时必须取消订阅。

## 命令与历史

### 设计内容历史

```js
await editor.undo()
await editor.redo()

editor.history.canUndo
editor.history.canRedo
editor.history.restoring
editor.clearHistory()
```

编辑器默认记录最近 50 步设计内容，包括文字、图片、移动缩放、旋转、删除、
图层顺序、组合、锁定、显隐、自定义属性、画板和打印区域。连续拖动和连续输入
会合并为一步。

`undo()` 和 `redo()` 返回 `Promise<boolean>`：成功恢复时为 `true`，没有可用历史时为
`false`。恢复过程会重新加载统一 JSON 文档，图片或字体资源失效时 Promise 会拒绝。

选区、hover、视口缩放和画板居中不属于设计内容，不进入该历史。加载新的统一 JSON
文档时，旧历史会被清空，新文档成为历史起点。

### 高级显式命令

```js
import { ZoomCommand } from '@/canvas-editor-core/src/index.js'

editor.execute(new ZoomCommand(editor, 1.5))
editor.commands.undo()
editor.commands.redo()
```

`CommandManager` 是独立的高级命令栈，只记录 `editor.execute(command)` 显式执行的命令，
不与顶部“上一步/下一步”按钮共享状态。

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

editor.arrangeLayersByRole({ back: ['background'], front: ['mask'] })
```

### 自定义属性面板

```js
const current = editor.elementData.getSelected() ?? {}

const ratImages = editor.getElementsByAttribute('image.description', '鼠')
editor.setElementsVisibilityByAttribute('image.description', '鼠', { exclusive: true })

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
| `CANVAS_CAPTURE_FAILED` | 完整画板导出或文件生成失败。 |

## API 速查

| 任务 | API |
| --- | --- |
| 创建编辑器 | `createEditor(options)` |
| 调整画板 | `editor.setArtboardSize(width, height)` |
| 适配画板到视口 | `editor.fitArtboardToView(options)` |
| 平移画布 | `editor.panBy(deltaX, deltaY)` |
| 添加图片 | `await editor.image.add(source, options)` |
| 替换选中图片 | `await editor.replaceSelectedImage(source, options)` |
| 替换指定图片 | `await editor.replaceImage(target, source, options)` |
| 读取图片尺寸 | `await editor.image.getSize(source)` |
| 获取选中图片属性 | `editor.getSelectedImageProperties()` |
| 更新选中图片属性 | `editor.updateSelectedImageProperties(properties)` |
| 恢复图片原始尺寸 | `editor.resetSelectedImageSize()` |
| 标记遮罩图 | `editor.markImageAsMask(image, source)` |
| 创建打印区域 | `editor.createPrintArea(options)` |
| 更新打印区域 | `editor.updatePrintArea(properties)` |
| 对齐到打印区域 | `editor.alignSelectionToPrintArea(alignment)` |
| 识别遮罩透明区域 | `await editor.detectPrintAreaFromMask(options)` |
| 截图并上传打印区域 | `await editor.capturePrintArea(options)` |
| 截图并上传完整画板 | `await editor.captureCanvas(options)` |
| 添加文字 | `await editor.text.add(content, options)` |
| 更新文字 | `editor.text.update(target, options)` |
| 更新指定文字样式 | `editor.updateText(target, options)` |
| 替换选中文字 | `editor.replaceSelectedText(content)` |
| 替换指定文字 | `editor.replaceText(target, content)` |
| 按模板规则替换文字 | `editor.replaceTextWithRules(target, content, options?)` |
| 替换 H5 图片 | `await replaceH5Image(document, elementId, source, options)` |
| 替换 H5 文字 | `replaceH5Text(document, elementId, content)` |
| 创建通信消息 | `createBridgeMessage(type, payload, options)` |
| 发送跨端消息 | `postBridgeMessage(type, payload, options)` |
| 订阅跨端消息 | `subscribeBridgeMessage(type, handler)` |
| 注入宿主消息 | `receiveBridgeMessage(message, context)` |
| 发送 Token | `postAccessToken(token, options)` |
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
| 显示/隐藏图层 | `editor.layer.toggleVisibility(id)` |
| 点击穿透 | `editor.layer.togglePointerThrough(id)` |
| 获取全部元素 | `editor.getAllElements()` |
| 按角色获取元素 | `editor.getElementsByRole(role)` |
| 按类型获取元素 | `editor.getElementsByType(type)` |
| 按自定义属性获取元素 | `editor.getElementsByAttribute(path, value)` |
| 写入业务属性 | `editor.elementData.set(target, attributes)` |
| 导出业务属性 | `editor.elementData.export()` |
| 加载编辑器 JSON | `await editor.loadDocument(document, options)` |
| 导出编辑器 JSON | `editor.exportDocument()` |
| 监听事件 | `editor.eventBus.on(name, handler)` |
| 撤销/重做 | `editor.undo()` / `editor.redo()` |
| 销毁编辑器 | `editor.destroy()` |
