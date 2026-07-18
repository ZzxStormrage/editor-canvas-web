# canvas-editor-core 使用说明

本文档说明编辑器的初始化、画板、视口、图片、文本、选区、图层、业务属性、事件和
生命周期，供编辑器页面与业务面板开发使用。

> 在线阅读：启动项目后访问 `#/docs`。完整编辑器示例位于 `#/editor`。

## 阅读路线

| 使用目标 | 建议章节 |
| --- | --- |
| 第一次接入 | “快速开始” → “创建编辑器” → “生命周期” |
| 开发 Vue 面板 | “Vue 应用层” → 对应功能模块 → “事件” |
| 嵌入后台或小程序 | “postMessage 跨端通信” → “Vue 应用层” |
| 添加图片或文字 | “图片” → “文本” → “选择” |
| 替换图片或文字 | “图片” → “文本” → “H5 文档运行时” |
| 开发图层面板 | “图层” → “选择” → “元素业务属性” |
| 查询元素或截图 | “元素业务属性” → “生产遮罩与打印区域” |
| 通过后台打开模板 | “自定义模板路由” → “统一编辑器文档” |
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

完整编辑器页面通过 `#/editor` 接收模板上下文。`id` 存在时会请求模板详情并调用
`editor.loadDocument()` 还原 JSON；没有 `id` 时作为新模板。

```text
# 新建模板
#/editor?itemId=2001&templateName=生肖模板&partnerId=10

# 编辑已有模板，两种 id 写法均支持
#/editor/1001?itemId=2001&partnerId=10
#/editor?id=1001&itemId=2001&partnerId=10
```

路由参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `number` | 编辑时是 | 自定义模板 ID，可放在路径或查询参数。 |
| `itemId` | `number` | 保存时是 | 商品 ID，优先使用路由值，否则使用详情接口值。 |
| `templateName` | `string` | 否 | 模板名；未传且详情中没有时保存为“未命名模板”。 |
| `previewImgUrl` | `string` | 否 | 预览图地址；编辑已有模板时默认保留接口值。 |
| `userId` | `number` | 否 | 新增后回查模板 ID 时用于缩小列表范围。 |
| `partnerId` | `number` | 否 | 写入 `X-Partner-Id` 请求头；兼容 `xPartnerId` 和 `X-Partner-Id`。 |
| `token` | `string` | 否 | 兼容路由鉴权，也支持 `authorization`。读取后会立即从地址栏删除。 |

Token 优先通过 `postMessage` 的 `auth:token` 发送，避免出现在浏览器历史、截图或宿主日志中。
源码不内置生产 Token；本地调试后台编辑器如确实需要临时 admin Token，应通过未提交的
`VITE_TEMPORARY_ACCESS_TOKEN` 环境变量配置。API 请求最多等待 3 秒接收宿主 Token，超时后
按无 Token 请求并由接口返回登录过期提示。

页面使用独立的 `useCustomTemplatePersistence()` 管理持久化，不会把 HTTP 逻辑写入
`canvas-editor-core`。“立即保存”的请求规则：

| 状态 | 请求 | 地址 | 行为 |
| --- | --- | --- | --- |
| 带 `id` 初始化 | `GET` | `https://xiaoxiang.ele007.com/admin/api/customTemplate/{id}` | 读取 `content` 并还原编辑器。 |
| 没有 `id` 保存 | `POST` | `https://xiaoxiang.ele007.com/admin/api/customTemplate` | 新增模板，返回 ID 后写回路由。 |
| 已有 `id` 保存 | `PUT` | `https://xiaoxiang.ele007.com/admin/api/customTemplate` | 修改当前模板。 |
| 模板列表 | `GET` | `https://xiaoxiang.ele007.com/admin/api/customTemplate` | 按条件查询模板，也用于新增后补齐 ID。 |

保存时 `content` 是 `editor.exportDocument()` 结果的 JSON 字符串：

```js
{
  content: JSON.stringify(editor.exportDocument()),
  id: 1001,
  itemId: 2001,
  previewImgUrl: 'https://cdn.example.com/template-preview.png',
  templateName: '生肖模板'
}
```

接口域名使用 `VITE_XIAOXIANG_API_BASE_URL`，默认为
`https://xiaoxiang.ele007.com`；路径可通过 `VITE_CUSTOM_TEMPLATE_API_PATH` 覆盖。
`Authorization` 由 Alova 拦截器统一添加，`X-Partner-Id` 由模板 API 模块添加。

## postMessage 跨端通信

项目通过 `src/services/message-bridge.js` 统一处理编辑器与后台管理系统、iframe、
`window.open` 页面及小程序 `web-view` 的通信。之前需求中出现的 `posstMeagess`、
`posstMegess` 都是历史拼写，代码中的正式方法名是 `postBridgeMessage`。

### 自动初始化

应用入口已经自动启动消息桥，并在通信层加载时发送 `editor:ready`。模板页面会继续发送
初始化、加载和保存生命周期消息：

```js
import {
  MESSAGE_TYPES,
  postBridgeMessage,
  startMessageBridge
} from '@/services/message-bridge.js'

startMessageBridge({ allowedOrigins: '*' })

postBridgeMessage(MESSAGE_TYPES.EDITOR_READY, {
  capabilities: [
    MESSAGE_TYPES.EDITOR_INITIALIZED,
    MESSAGE_TYPES.TEMPLATE_SAVED,
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
| `MESSAGE_TYPES.TEMPLATE_LOADING` | `'template:loading'` | 编辑器 → 宿主 | 开始请求模板详情。 |
| `MESSAGE_TYPES.TEMPLATE_LOADED` | `'template:loaded'` | 编辑器 → 宿主 | 模板 JSON 已成功还原到编辑器。 |
| `MESSAGE_TYPES.TEMPLATE_LOAD_FAILED` | `'template:load-failed'` | 编辑器 → 宿主 | 模板详情请求或 JSON 还原失败。 |
| `MESSAGE_TYPES.TEMPLATE_SAVING` | `'template:saving'` | 编辑器 → 宿主 | 开始调用新增或修改接口。 |
| `MESSAGE_TYPES.TEMPLATE_SAVED` | `'template:saved'` | 编辑器 → 宿主 | 保存接口成功，包含模板 ID 和统一 JSON。 |
| `MESSAGE_TYPES.TEMPLATE_SAVE_FAILED` | `'template:save-failed'` | 编辑器 → 宿主 | 保存接口或 JSON 导出失败。 |
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

### 编辑器向后台管理系统发送

编辑器作为 iframe 嵌入后台时，使用 `parent` 通道。正式页面的保存成功通信已经由
`EditorPage` 自动发送，后台只需要监听 `template:saved`：

```js
postBridgeMessage('document:saved', {
  documentId: 'document-1001',
  json: editorJson
}, {
  target: 'parent',
  targetOrigin: 'https://admin.example.com'
})
```

后台管理系统接收消息时必须同时校验来源和 iframe 窗口：

```js
const editorFrame = document.querySelector('#editor-frame')
const editorOrigin = 'https://editor.example.com'

window.addEventListener('message', (event) => {
  if (event.origin !== editorOrigin) return
  if (event.source !== editorFrame.contentWindow) return

  const message = event.data
  if (message?.channel !== 'ele-editor' || message.version !== 1) return

  if (message.type === 'template:saved') {
    const { id, itemId } = message.payload.template
    console.log('模板保存成功', { id, itemId, json: message.payload.document })
  }
})
```

### 模板生命周期通信示例

初始化时先收到 `editor:ready`，模板页面完成新建或详情还原后收到
`editor:initialized`。保存流程依次为 `template:saving`，成功时为 `template:saved`，失败时为
`template:save-failed`。所有错误事件的 `payload.error` 都是普通对象，方便管理端序列化日志。

```js
const eventHandlers = {
  'editor:initialized': ({ template }) => {
    setEditorLoading(false)
    setCurrentTemplate(template)
  },
  'template:loading': () => setEditorLoading(true),
  'template:saving': () => setSaveLoading(true),
  'template:saved': ({ template, document }) => {
    setSaveLoading(false)
    refreshTemplateList(template.id)
    closeEditorLoading()
    console.log('保存后的统一 JSON', document)
  },
  'template:load-failed': ({ error }) => showError(error.message),
  'template:save-failed': ({ error }) => {
    setSaveLoading(false)
    showError(error.message)
  },
  'auth:expired': () => redirectToLogin()
}

window.addEventListener('message', (event) => {
  if (event.origin !== editorOrigin || event.source !== editorFrame.contentWindow) return

  const message = event.data
  if (message?.channel !== 'ele-editor' || message.version !== 1) return

  const handler = eventHandlers[message.type]
  handler?.(message.payload, message)
})
```

消息 payload 约定：

| 消息 | 关键字段 |
| --- | --- |
| `editor:initialized` | `mode`、`template`。`mode` 为 `'create'` 或 `'edit'`。 |
| `template:loading` | `mode`、`template`。 |
| `template:loaded` | `mode`、`template`。不重复发送完整 JSON。 |
| `template:saving` | `action`、`template`。`action` 为 `'create'` 或 `'update'`。 |
| `template:saved` | `success: true`、`action`、`template`、`document`。 |
| `template:load-failed` / `template:save-failed` | `error.code`、`error.message`、`error.status`。 |

生命周期消息只通知宿主，不改变编辑器保存结果；即使宿主未监听或发送失败，模板接口请求仍然继续。

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

### 消息来源

当前应用入口使用 `startMessageBridge({ allowedOrigins: '*' })`，允许任意后台域名通过
`window.postMessage` 传递 Token 和编辑器消息，不依赖 `document.referrer`。

发送窗口消息时仍建议宿主显式指定编辑器的 `targetOrigin`，避免消息被发送到错误页面。
如果后续需要恢复来源白名单，可以把 `allowedOrigins` 改为域名数组，或使用
`VITE_MESSAGE_ALLOWED_ORIGINS` 配置多个来源。

### 通信排查

| 现象 | 检查项 |
| --- | --- |
| `channels` 返回 `[]` | 当前页面是否真的位于 iframe、小程序或 `window.open` 场景。 |
| 后台收不到消息 | `target` 是否正确，`targetOrigin` 是否与后台 origin 完全一致。 |
| 编辑器收不到消息 | 消息是否包含 `channel: 'ele-editor'`、`version: 1` 和有效 `type`。 |
| Token 未生效 | 是否在 `editor:ready` 后发送，字段是否为 `payload.token` 或 `payload.authorization`。 |
| 消息被忽略 | 消息是否包含正确的 `channel`、`version` 和 `type`；当前不限制来源域名。 |
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
  :fit-options="{ padding: 8, viewportRatio: 0.92, expandZoomRange: true }"
  :load-options="{ productionVisibility: 'hidden' }"
  :zoom-limits="{ minRatio: 1, maxRatio: 2 }"
  @loaded="onDocumentLoaded"
/>
```

`zoomLimits` 默认是 `false`，不会改变完整 Web 编辑器或其他业务页。传入配置后，组件会以每次
适配完成的完整画板比例为基准限制视口缩放；`minRatio: 1` 防止画板缩得小于完整预览，
`maxRatio: 2` 允许最多放大到完整预览的两倍。移动端会在画布区域接管双指缩放，页面其他区域
仍保持正常滚动。生产 H5 如不允许用户选择或拖动模板元素，应同时传入
`:load-options="{ interactive: false }"`。

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

### 人像款定制 H5 模板

人像款定制复用诗词定制页面的主题、背景、文案和保存流程，业务路由为：

```text
# 使用模板原始图片
#/h5-page/portrait-customization?templateId=1001

# 传入单个人像主题和背景图
#/h5-page/portrait-customization?templateId=1001&aiThemeUrl=https%3A%2F%2Fcdn.example.com%2Fportrait.png&backgroundImageUrl=https%3A%2F%2Fcdn.example.com%2Fbackground.png

# 保存成功后返回小程序页面
#/h5-page/portrait-customization?templateId=1001&redirectPath=subPackage2/home/productDetail/orderDetails
```

编辑器模板需要使用以下自定义属性：

| 图层 | 自定义属性 | 推荐值 | 说明 |
| --- | --- | --- | --- |
| 人像图片 | `image.description` | `人像替换` | 人像主题切换时只替换图片资源，保留位置、尺寸、层级和变换。兼容 `人像定制`、`AI主题`、`原图替换`、`原图定制`。 |
| 人像图片 | `image.role` | `ai-variable` | 可选的通用可变图片角色；配置后无需依赖具体 description。 |
| 背景图片 | `image.role` | `background` | 背景选项会替换该图层，建议锁定并关闭点击命中。 |
| 可替换文字 | `text.description` | `文本替换` | 页面生成单行文案输入框；也支持 `文案替换`、`主标题`、`副标题`、`落款`。 |
| 打印区域 | 图层名称 | `打印区域` | 可选；存在时保存流程额外生成不含背景图和遮罩图的 `productImgUrl`。 |

主题和背景选项都由 URL 提供。单个选项分别使用 `aiThemeUrl`、`backgroundImageUrl`；
多个选项使用 URL 编码后的 JSON 数组：

```js
const aiThemes = encodeURIComponent(JSON.stringify([
  {
    id: 'portrait-1',
    label: '清新人像',
    url: 'https://cdn.example.com/portrait-1.png',
    selected: true
  },
  {
    id: 'portrait-2',
    label: '水墨人像',
    url: 'https://cdn.example.com/portrait-2.png'
  }
]))

const backgroundImages = encodeURIComponent(JSON.stringify([
  {
    id: 'background-1',
    label: '浅色背景',
    url: 'https://cdn.example.com/background-1.png',
    selected: true
  }
]))

const url = `#/h5-page/portrait-customization?templateId=1001&aiThemes=${aiThemes}&backgroundImages=${backgroundImages}`
```

每个选项支持 `id`、`label`、`url` 和 `selected`。页面优先选择 `selected: true` 的选项；
没有显式选择时依次匹配模板当前图片 URL、数组第一项。“尝试更多”会返回 `redirectPath`
指定的小程序页面重新选择。

最小模板 JSON 示例：

```json
{
  "version": 1,
  "canvas": {
    "width": 1024,
    "height": 1024,
    "background": "#ffffff"
  },
  "elements": [
    {
      "tag": "Image",
      "name": "背景图",
      "url": "https://cdn.example.com/background.png",
      "x": 0,
      "y": 0,
      "width": 1024,
      "height": 1024,
      "locked": true,
      "hittable": false,
      "attributes": {
        "image": {
          "role": "background"
        }
      }
    },
    {
      "tag": "Image",
      "url": "https://cdn.example.com/portrait.png",
      "x": 112,
      "y": 102,
      "width": 800,
      "height": 800,
      "attributes": {
        "image": {
          "description": "人像替换",
          "role": "ai-variable"
        }
      }
    },
    {
      "tag": "Text",
      "text": "人像款定制",
      "x": 212,
      "y": 760,
      "width": 600,
      "fontSize": 72,
      "textAlign": "center",
      "attributes": {
        "text": {
          "description": "文本替换"
        }
      }
    }
  ]
}
```

Canvas 始终按模板 `canvas.width / canvas.height` 等比缩放并占满 H5 页面宽度；下方操作区
自动占用剩余空间，纵向模板过高时页面允许滚动。图层顺序完全以模板 JSON 为准。

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
| 识别遮罩透明区域 | `await editor.detectPrintAreaFromMask(options)` |
| 截图并上传打印区域 | `await editor.capturePrintArea(options)` |
| 截图并上传完整画板 | `await editor.captureCanvas(options)` |
| 添加文字 | `await editor.text.add(content, options)` |
| 更新文字 | `editor.text.update(target, options)` |
| 更新指定文字样式 | `editor.updateText(target, options)` |
| 替换选中文字 | `editor.replaceSelectedText(content)` |
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
| 点击穿透 | `editor.layer.togglePointerThrough(id)` |
| 获取全部元素 | `editor.getAllElements()` |
| 按角色获取元素 | `editor.getElementsByRole(role)` |
| 按类型获取元素 | `editor.getElementsByType(type)` |
| 写入业务属性 | `editor.elementData.set(target, attributes)` |
| 导出业务属性 | `editor.elementData.export()` |
| 监听事件 | `editor.eventBus.on(name, handler)` |
| 撤销/重做 | `editor.undo()` / `editor.redo()` |
| 销毁编辑器 | `editor.destroy()` |
