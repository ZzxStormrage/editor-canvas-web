# canvas-editor-core 外部 API 文档

本文档面向接入编辑器的前端开发者，说明如何初始化编辑器、调用图片和文字 API、
维护图层和业务属性、监听事件，以及如何将编辑结果交给移动端 H5 页面渲染。

> 在线阅读：启动项目后访问 `#/docs`。编辑器页面为 `#/editor`，H5 页面为 `#/h5-preview`。

## 阅读路线

| 目标 | 建议阅读 |
| --- | --- |
| 第一次接入编辑器 | “10 分钟快速上手” → “调用边界” → “生命周期” |
| 开发 Vue 面板 | “Vue 应用层调用” → “元素业务属性” → “事件” |
| 添加文字或图片 | “图片” → “文本” → “选择” |
| 开发图层功能 | “图层插件” → “选择” → “事件” |
| 对接移动端 H5 | “移动端 H5 文档协议” → “元素业务属性” |
| 排查问题 | “错误处理与调试” → 对应 API 章节 |

## 10 分钟快速上手

### 1. 准备挂载容器

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

### 2. 创建和销毁编辑器

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

### 3. 添加内容

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

图片添加是异步操作，必须使用 `await` 或处理返回的 Promise。

### 4. 修改当前元素

```js
editor.select(title)

editor.text.update({
  text: '新的活动标题',
  fontSize: 40,
  fill: '#7c3aed'
})
```

### 5. 添加供 H5 使用的业务属性

渲染属性和业务属性必须分开保存。不要把 `action`、埋点或输入规则直接写到
Leafer 的 `x`、`fill` 等渲染数据中。

```js
editor.elementData.set(title, {
  textInput: {
    enabled: true,
    characterSet: 'any',
    allowManualNewline: true,
    allowSymbols: true,
    maxCharactersPerLine: 20,
    maxCharacters: 100,
    maxLines: 4
  }
})
```

## 调用边界

项目分为三层。新增功能时应先确定代码属于哪一层。

| 层级 | 主要目录 | 职责 | 不应该做的事 |
| --- | --- | --- | --- |
| 编辑器内核 | `src/canvas-editor-core` | Leafer 节点、插件、命令、选区、画板 | 引用 Vue 组件或页面状态 |
| Vue 调用层 | `src/composables/canvas-editor` | 将内核 API 转为 `ref` 和业务方法 | 直接修改 Leafer 私有字段 |
| 页面组件 | `src/components`、`src/views` | 表单、按钮、交互展示 | 在模板中操作 `contentLayer.children` |

推荐原则：

1. 页面组件只调用 composable 暴露的方法。
2. composable 通过 `Editor` 外观或插件公开方法操作画布。
3. 只有内核插件可以集中处理 Leafer 节点细节。
4. 组件卸载时必须销毁编辑器和事件订阅。
5. 跨页面传输的数据必须是普通、可 JSON 序列化的对象。

## 模块总览

编辑器对外 API 按职责划分为以下模块。业务代码应优先调用模块公开方法，不跨模块读取
下划线字段、私有字段或 Leafer 内部状态。

| 模块 | 主要入口 | 源码位置 | 负责内容 |
| --- | --- | --- | --- |
| Core | `createEditor()`、`Editor` | `canvas-editor-core/src/core` | 创建实例、统一外观、生命周期 |
| Canvas / Artboard | `editor.resize()`、`editor.artboard` | `core/Editor.js`、`artboard.js` | 外层画布、白色画板、画板边界 |
| Viewport | `editor.setZoom()` | `viewport` | 缩放、居中、适配视口 |
| Selection | `editor.select()` | `core/Editor.js`、`@leafer-in/editor` | 单选、多选、取消选中 |
| Layer | `editor.layer` | `plugins/feature-plugins/layer` | 图层 DTO、排序、锁定、删除、高亮 |
| Image | `editor.image` | `plugins/feature-plugins/image` | URL、File、Blob、SVG 图片创建 |
| Text | `editor.text` | `plugins/feature-plugins/text` | 文字创建、样式更新、原位编辑 |
| EventBus | `editor.eventBus` | `logic/event-bus.js` | 内核向应用层发送状态变化 |
| Command | `editor.commands` | `commands` | 命令执行及撤销重做历史 |
| ElementData | `editor.elementData` | `plugins/feature-plugins/element-data` | 稳定元素 ID 和 H5 业务属性 |
| Vue Adapter | `useCanvasEditor()` | `composables/canvas-editor` | 将内核状态转换为 Vue `ref` 和方法 |
| H5 Document | `exportH5Document()` | `services/h5-document.js` | 导出跨页面、可持久化的 H5 JSON |

### 模块调用关系

```text
Vue 页面 / 面板
    ↓ 调用
useCanvasEditor 与业务 composable
    ↓ 调用
Editor 外观
    ├── Viewport / Command / EventBus
    ├── Artboard / Selection
    └── PluginManager
          ├── ImagePlugin
          ├── TextPlugin
          ├── LayerPlugin
          └── ElementDataPlugin

Editor + ElementData
    ↓ exportH5Document()
移动端 H5 JSON
```

模块之间通过公开 API 和事件协作。比如图层面板删除元素时应调用
`editor.layer.remove(id)`，由 Layer 模块同步选区、画板覆盖层和事件；组件不应只执行
`node.remove()`。

### 返回值约定

| API 类型 | 返回值 | 使用方式 |
| --- | --- | --- |
| `Editor` 设置方法 | 当前 `Editor` 实例 | 可以链式调用，例如 `editor.setZoom(1.2).setShowGrid(false)` |
| 图片新增 | `Promise<Image>` | 必须 `await editor.image.add(...)` |
| 文字新增 | `Promise<Text>` | 必须 `await editor.text.add(...)` |
| 文字更新 | `Text` 节点 | 可继续传给 `select()` 或业务属性插件 |
| 图层查询 | 图层 DTO 数组 | 只用于 UI 展示和调用图层 API，不代表持久化数据 |
| 业务属性查询 | 深拷贝普通对象 | 修改返回对象不会直接修改画布节点 |
| `eventBus.on()` | 取消订阅函数 | 组件卸载时调用该函数 |
| `destroy()` | `void` | 销毁后不要继续复用实例 |

### 命名约定

- `editor.*`：Editor 外观提供的跨模块高层操作。
- `editor.image.*`、`editor.text.*`：具体内容插件。
- `editor.layer.*`：图层面板所需的场景树操作。
- `editor.elementData.*`：与渲染属性隔离的业务数据。
- `editor.eventBus.*`：内核向 Vue 应用层发出的通知。
- `useXxxControls()`：Vue 应用层适配器，不属于内核公开 API。
- 以下划线或 `#` 开头的字段属于内部实现，不应从业务代码调用。

## Vue 应用层调用

当前完整编辑器页面使用 `useCanvasEditor()`。它负责创建编辑器、同步 Vue 状态和
在组件卸载时销毁实例。

```js
import { useCanvasEditor } from '@/composables/useCanvasEditor.js'

const editor = useCanvasEditor()
```

模板中使用组合后的状态和方法：

```vue
<CanvasWorkspace :editor="editor" />

<v-btn @click="editor.addText">添加文字</v-btn>
<v-btn @click="editor.openImagePicker">上传图片</v-btn>
<v-btn @click="editor.zoomIn">放大</v-btn>
```

只有需要接入内核未封装能力时，才使用：

```js
const coreEditor = editor.getEditor()

if (coreEditor) {
  coreEditor.setShowGrid(false)
}
```

`getEditor()` 在组件挂载前可能返回 `null`，调用前必须判断。

## Alova API 请求层

> **Request 模块** · 统一客户端：`alovaClient` · 业务接口：`editorDocumentApi`

请求层与编辑器内核保持隔离。Vue 组件负责收集用户操作和展示请求状态，接口模块负责描述
URL、请求方法与参数，Alova 核心层统一处理基础地址、超时、鉴权和错误。

### 目录职责

| 文件 | 职责 |
| --- | --- |
| `src/api/core/alova-client.js` | 创建 Alova 单例，处理 Token、HTTP 状态和网络错误。 |
| `src/api/core/api-error.js` | 提供统一的 `ApiError`。 |
| `src/api/clients/xiaoxiang-client.js` | 只配置小象后台服务域名，供该域名下的模块复用。 |
| `src/api/modules/editor-document.js` | 编辑器文档接口示例，包含列表、详情、新建、更新和删除。 |
| `src/api/modules/picture.js` | 图片上传接口，负责 `FormData` 和服务端图片地址解析。 |
| `src/api/index.js` | 统一导出，业务代码只从该入口引用。 |

新增业务接口时，在 `src/api/modules/` 下按业务域创建文件，例如
`material.js`、`template.js`，不要把所有接口堆放到 `alova-client.js`。

### 环境配置

客户端从 Vite 环境变量读取基础地址：

```dotenv
VITE_BASE_URL_API = https://pceditor.ele007.com/
VITE_XIAOXIANG_API_BASE_URL = https://xiaoxiang.ele007.com
```

每个后端域名单独创建 `clients/*-client.js`，业务模块只保存接口路径。例如图片服务使用
`https://xiaoxiang.ele007.com` 作为基础地址，上传路径单独保存为
`/admin/api/localStorage/pictures`。不要在组件中拼接完整接口 URL。

编辑器文档示例默认请求 `/editor/documents`。后端路径不一致时，可以增加：

```dotenv
VITE_EDITOR_DOCUMENT_API_PATH = /实际接口路径
```

修改环境变量后需要重启 Vite 开发服务。

### 应用初始化

鉴权配置是可选的，不会假定项目使用哪个 `localStorage` Key。需要鉴权时，在应用入口调用
一次 `configureApiClient()`：

```js
import { configureApiClient } from '@/api/index.js'
import { router } from '@/router/index.js'

configureApiClient({
  getAccessToken: () => localStorage.getItem('access_token'),
  onUnauthorized: () => {
    localStorage.removeItem('access_token')
    router.push('/login')
  }
})
```

调用方已显式传入 `Authorization` 时，请求层不会覆盖。公开接口可以在 Method 配置中设置
`meta: { skipAuth: true }` 跳过 Token。

### 直接调用

模块方法返回 Alova `Method`，它是可等待对象，适合普通异步流程：

```js
import { editorDocumentApi } from '@/api/index.js'

const result = await editorDocumentApi.create({
  name: '活动首页',
  document: editorJson
})

console.log('保存结果', result)
```

### Vue Composition API 调用

页面需要 `loading`、`data` 和 `error` 状态时，使用 Alova 的 `useRequest`：

```js
import { useRequest } from 'alova'

import { editorDocumentApi } from '@/api/index.js'

const {
  loading: saving,
  data: savedDocument,
  error: saveError,
  send: saveDocument
} = useRequest(editorDocumentApi.create, {
  immediate: false
})

async function handleSave(editorJson) {
  return saveDocument({
    name: '活动首页',
    document: editorJson
  })
}
```

### 图片上传调用

`pictureApi.upload(file)` 会创建 `FormData`，以 `file` 字段上传图片，并直接返回服务端图片
地址。服务端返回相对路径时，请求层会自动补全小象后台域名。

```js
import { pictureApi } from '@/api/index.js'

async function uploadImage(file) {
  const imageUrl = await pictureApi.upload(file)
  await editor.image.add(imageUrl)
}
```

图片 Tab 已使用该流程，上传期间按钮进入加载状态，成功后才会把远程图片添加到画布。
请求头会动态读取消息桥收到的 Token；宿主尚未发送时，使用 `src/services/auth-token.js` 中的
临时 Token 保持独立运行能力。

组件不应直接引用 `alovaClient.Post()` 拼装业务接口。这样接口路径变化时只修改对应的
`src/api/modules/` 文件，不会影响页面交互和编辑器核心逻辑。

### 保存编辑器 JSON 示例

```js
import { editorDocumentApi } from '@/api/index.js'
import { exportH5Document } from '@/services/h5-document.js'

async function saveCurrentDocument(editor) {
  const document = await exportH5Document(editor.getEditor())

  return editorDocumentApi.create({
    name: '未命名页面',
    document
  })
}
```

当前 `editorDocumentApi` 是接入结构示例。正式联调时只需要按后端契约调整接口路径、字段
和请求方法，不要把 Leafer 节点或 Editor 实例直接发送到后端。

### 错误处理

HTTP 非 2xx、网络异常、超时和主动取消都会转换为 `ApiError`：

```js
import { ApiError, editorDocumentApi } from '@/api/index.js'

try {
  await editorDocumentApi.detail(documentId)
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.code, error.status, error.request)
  }
  throw error
}
```

默认返回服务端响应体。如果某个接口需要读取状态码或响应头，在 Method 配置中设置
`meta: { responseMode: 'raw' }`，该接口会返回完整 XHR 响应。

## 跨端消息桥

> **Bridge 模块** · 发送：`postBridgeMessage()` · 接收：`subscribeBridgeMessage()`

消息桥用于编辑器与后台 iframe、浏览器 opener、uni-app 和各类小程序 WebView 通信。
业务消息统一使用以下结构，后续新增保存结果、页面状态等消息时只需要增加 `type`：

```js
{
  channel: 'ele-editor',
  version: 1,
  id: '消息唯一 ID',
  type: 'auth:token',
  sender: 'admin',
  timestamp: Date.now(),
  payload: {
    token: 'Bearer ...'
  }
}
```

### 编辑器发送消息

```js
import { postBridgeMessage } from '@/services/message-bridge.js'

postBridgeMessage('editor:saved', {
  documentId: 'document-id'
})
```

默认目标为 `auto`：小程序环境优先调用 `uni.postMessage`，否则发送给 iframe 的
`window.parent`，没有 parent 时再发送给 `window.opener`。指定目标和来源：

```js
postBridgeMessage('editor:saved', payload, {
  target: 'parent',
  targetOrigin: 'https://admin.example.com'
})
```

不要使用 `'*'` 发送 Token 等敏感数据。没有显式传入 `targetOrigin` 时，消息桥优先使用
`document.referrer` 的 origin，其次使用编辑器当前 origin。

### 后台向编辑器传 Token

编辑器启动后会先发送 `editor:ready`，后台收到 ready 后再传 Token，避免消息早于编辑器
监听器初始化：

```js
window.addEventListener('message', (event) => {
  const message = event.data

  if (
    message?.channel === 'ele-editor' &&
    message?.version === 1 &&
    message?.type === 'editor:ready'
  ) {
    event.source.postMessage({
      channel: 'ele-editor',
      version: 1,
      type: 'auth:token',
      sender: 'admin',
      timestamp: Date.now(),
      payload: {
        token: 'Bearer 后台登录 Token'
      }
    }, event.origin)
  }
})
```

收到的 Token 会去除可选的 `Bearer` 前缀并只保存在内存中，不写入 URL 或
`localStorage`。Alova 在每次请求发送前读取最新 Token，因此不需要重建 API 客户端。

### 编辑器内监听消息

```js
import { subscribeBridgeMessage } from '@/services/message-bridge.js'

const unsubscribe = subscribeBridgeMessage('product:selected', ({ payload, context }) => {
  console.log(payload.productId, context.origin)
})

unsubscribe()
```

### 小程序和原生 WebView

编辑器向小程序发送消息仍调用 `postBridgeMessage()`。`uni.webview` 会适配微信、QQ、
支付宝、抖音、百度、京东等容器：

```js
postBridgeMessage('editor:ready', {
  capabilities: ['auth:token']
})
```

支持执行 WebView JavaScript 的原生或 uni 容器，可以调用编辑器暴露的全局接收方法：

```js
window.EleEditorBridge.receiveMessage({
  channel: 'ele-editor',
  version: 1,
  type: 'auth:token',
  sender: 'mini-program',
  timestamp: Date.now(),
  payload: {
    token: 'Bearer 小程序 Token'
  }
})
```

标准微信小程序 `web-view` 的 `postMessage` 主要支持 H5 向小程序发送；如果容器不支持向
H5 执行 JavaScript，需要在打开 WebView 前通过服务端会话完成身份交换，不建议把 Token
直接拼到 URL。

### 来源白名单

消息桥默认允许当前页面 origin 和 `document.referrer` origin。一个部署包需要被多个后台
域名嵌入时，通过环境变量增加白名单：

```dotenv
VITE_MESSAGE_ALLOWED_ORIGINS = https://admin-a.example.com,https://admin-b.example.com
```

应用启动入口已经完成以下初始化，页面组件不需要重复监听 Token：

```js
configureApiClient({ getAccessToken })
installAuthTokenBridge()
startMessageBridge()
```

## 常见业务流程

### 上传背景图

背景图以图片原始像素宽高同步画板尺寸。上传完成后画板自动缩放为当前
`workspace-stage` 可用区域的 80%，并保持水平、垂直居中。

```js
const imageSize = await editor.image.getSize(file)
const background = await editor.image.add(file, {
  width: imageSize.width,
  height: imageSize.height,
  lockRatio: false
})

editor.setArtboardSize(imageSize.width, imageSize.height)
editor.fitArtboardToView({
  viewportRatio: 0.8,
  expandZoomRange: true
})
```

应用层已经通过 `editor.openBackgroundImagePicker()` 和
`editor.handleBackgroundImageChange(event)` 封装完整流程。页面组件只负责触发文件
选择，不需要读取图片尺寸、修改节点或计算工作区缩放。

### 图层列表

图层 UI 不应直接排序 `contentLayer.children`，应调用图层插件：

```js
const layers = editor.layer.getList()
editor.layer.reorder(layers.map((item) => item.id))
editor.layer.toggleLock(layers[0].id)
editor.layer.remove(layers[0].id)
```

### H5 预览

项目中的 `exportH5Document()` 会将画板内容转为稳定协议，并把坐标原点转换到画板
左上角。不要直接把完整 Leafer 实例写入 `localStorage` 或发送给后端。

```js
import { exportH5Document } from '@/services/h5-document.js'

const payload = await exportH5Document(editor.getEditor())
await api.saveTemplate(payload)
```

## 错误处理与调试

内核参数错误通常抛出 `EditorError`。业务代码应保留错误码，用户界面展示可理解的
提示，控制台记录原始错误。

```js
import { EditorError } from '@/canvas-editor-core/src/index.js'

try {
  await editor.image.add(file)
} catch (error) {
  if (error instanceof EditorError) {
    console.error(error.code, error.message)
  }
  throw error
}
```

常见排查项：

- 编辑器没有显示：检查挂载容器是否有宽高、`view` 是否存在。
- API 没反应：确认组件已经挂载，`getEditor()` 不是 `null`。
- 图片没有加载：检查 URL、跨域策略或 Blob 是否仍然有效。
- H5 页面图片失效：使用 `exportH5Document()`，它会把 Blob URL 转为 Data URL。
- Vue 状态没有更新：确认是否订阅了对应 `eventBus` 事件。
- 选区行为异常：不要直接修改 `innerEditor.list`，使用 `select()` / `deselect()`。

### 常用错误码

| 模块 | 错误码 | 含义及处理建议 |
| --- | --- | --- |
| Core | `INIT_OPTIONS_REQUIRED` | 初始化参数不是对象，检查 `createEditor(options)` 调用。 |
| Core | `VIEW_REQUIRED` | 未提供挂载容器。 |
| Core | `VIEW_NOT_FOUND` | 字符串选择器没有找到 DOM。 |
| Core | `EDITOR_DESTROYED` | 实例已销毁，需要重新创建，不能继续调用旧引用。 |
| Canvas | `AREA_TYPE_INVALID` | `areaType` 只能是 `grid` 或 `blank`。 |
| Canvas | `SHOW_GRID_INVALID` | `showGrid` 必须是布尔值。 |
| Artboard | `ARTBOARD_SIZE_INVALID` | 画板宽高或最小宽高不是正数。 |
| Viewport | `ZOOM_RANGE_INVALID` | `zoom.min` 大于 `zoom.max`。 |
| Image | `IMAGE_SOURCE_INVALID` | 图片来源不是 URL、SVG 字符串、`File` 或 `Blob`。 |
| Image | `IMAGE_ADD_FAILED` | 图片读取或节点创建失败，继续检查 URL、跨域和文件内容。 |
| Text | `TEXT_VALUE_INVALID` | 文本内容不是字符串或数字。 |
| Text | `TEXT_TARGET_INVALID` | `text.update()` 的目标不是 Text 节点。 |
| Text | `TEXT_SELECTION_REQUIRED` | 调用省略目标的更新方法时，没有选中文字。 |
| Text | `TEXT_ALIGN_INVALID` | 文本对齐值不在支持范围。 |
| Text | `TEXT_WRITING_MODE_INVALID` | 文字方向不是 `x`、`y` 或 `y-reverse`。 |
| ElementData | `ELEMENT_DATA_TARGET_REQUIRED` | 当前不是单选状态，且调用时没有传目标节点。 |
| ElementData | `ELEMENT_DATA_TARGET_NOT_FOUND` | 指定 `elementId` 已不存在。 |
| Plugin | `PLUGIN_DUPLICATED` | 相同 ID 的插件被重复注册。 |

## API 速查

| 任务 | 推荐 API |
| --- | --- |
| 创建编辑器 | `createEditor(options)` |
| 调整画板 | `editor.setArtboardSize(width, height)` |
| 适配画板到视口 | `editor.fitArtboardToView(options)` |
| 添加图片 | `await editor.image.add(source, options)` |
| 添加文字 | `await editor.text.add(content, options)` |
| 更新文字 | `editor.text.update(target, options)` |
| 选择/取消选择 | `editor.select(target)` / `editor.deselect()` |
| 获取图层 | `editor.layer.getList()` |
| 排序图层 | `editor.layer.reorder(ids)` |
| 写入业务属性 | `editor.elementData.set(target, attributes)` |
| 导出业务属性 | `editor.elementData.export()` |
| 监听变化 | `editor.eventBus.on(eventName, handler)` |
| 销毁编辑器 | `editor.destroy()` |

## 核心层初始化示例

当前项目是 Vite + Vue，运行后可在 `#/editor` 查看完整接入示例。

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

> **Core 模块** · 入口：`createEditor()` / `init()` · 源码：`canvas-editor-core/src/index.js`

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

> **Core 模块** · 外观对象：`Editor` · 源码：`canvas-editor-core/src/core/Editor.js`

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
| `editor.layer` | 图层插件实例。 |
| `editor.elementData` | 元素业务属性插件实例。 |
| `editor.editor` | Leafer 官方 Editor 实例。 |
| `editor.artboard` | 内层白色画板管理器。 |
| `editor.commands` | 命令管理器。 |
| `editor.selectedElements` | 当前选中的元素列表。 |
| `editor.isEditing` | 是否处于编辑中。 |
| `editor.isMultipleSelect` | 是否多选。 |
| `editor.zoom` | 当前缩放值，兼容旧代码，推荐读 `editor.state.zoom`。 |

## 画布与画板

> **Canvas / Artboard 模块** · 入口：`editor.*` / `editor.artboard` · 源码：`core/Editor.js`、`artboard.js`

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

> **Viewport 模块** · 入口：`editor.setZoom()` 等 · 源码：`canvas-editor-core/src/viewport`

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

### `editor.fitArtboardToView(options)`

自动计算缩放和位移，使白色画板完整显示在当前编辑器容器中。

```js
editor.fitArtboardToView()
editor.fitArtboardToView(32)
editor.fitArtboardToView({ viewportRatio: 0.8 })
```

数字参数保持兼容，表示画板与视口边缘保留的像素间距。对象参数：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `padding` | `number` | `0` | 可用视口四周预留的像素。 |
| `viewportRatio` | `number` | `1` | 画板最长边占可用视口的比例，范围 `0.05-1`。 |
| `expandZoomRange` | `boolean` | `false` | 是否扩展缩放上下限以精确达到目标比例。 |

上传背景图使用 `{ viewportRatio: 0.8, expandZoomRange: true }`，确保任意图片尺寸都能
以工作区 80% 的比例居中显示。

### `editor.centerArtboard()`

保持当前缩放不变，只将画板移动到视口中心。

```js
editor.centerArtboard()
```

### `editor.zoomTo(zoom)`

`setZoom(zoom)` 的兼容别名，新代码推荐使用 `setZoom()`。

## 选择

> **Selection 模块** · 入口：`editor.select()` / `editor.deselect()` · 底层：`@leafer-in/editor`

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

## 图层插件

> **Layer 模块** · 命名空间：`editor.layer` · 源码：`plugins/feature-plugins/layer`

图层能力通过 `editor.layer` 调用。图层 ID 是运行时图层标识；跨页面、跨保存周期的
业务身份应使用元素业务属性插件维护的 `elementId`。

### `editor.layer.getList()`

返回从视觉最上层到最下层排列的图层 DTO，不直接暴露 Vue 组件需要修改的节点。

```js
const layers = editor.layer.getList()

// [{
//   id,
//   elementId,
//   name,
//   type,
//   imageRole,
//   customAttributeCount,
//   locked,
//   pointerThrough,
//   selected,
//   order
// }]
```

### `editor.layer.reorder(orderedIds)`

按照面板中从上到下的 ID 顺序更新场景树层级。

```js
editor.layer.reorder(['top-layer-id', 'middle-layer-id', 'bottom-layer-id'])
```

拖拽过程中建议只更新 Vue 草稿数组，拖拽结束后调用一次 `reorder()`，避免频繁修改场景树。

### `editor.layer.select(id)`

通过图层 ID 选中画布元素。

```js
editor.layer.select(layer.id)
```

### `editor.layer.remove(id)`

删除指定图层，并同步选区、画板覆盖层和图层事件。

```js
editor.layer.remove(layer.id)
```

不要在 Vue 组件中直接调用 `node.remove()`，否则容易遗漏选区和业务事件同步。

### `editor.layer.toggleLock(id)`

切换图层锁定状态。锁定当前选中元素时会自动退出选区。

```js
editor.layer.toggleLock(layer.id)
```

### `editor.layer.togglePointerThrough(id)`

切换图片的点击穿透状态。开启后画布点击会命中图片下方的元素，但不会改变图片的
图层顺序、锁定状态、坐标或尺寸。

```js
editor.layer.togglePointerThrough(imageLayer.id)
```

该方法只对图片图层生效。图层面板仍可通过 ID 操作该图片。

### `editor.layer.hover(id)`

使用 Leafer Editor 的原生 hover 轮廓高亮指定图层，不修改节点自身描边。

```js
editor.layer.hover(layer.id)
editor.layer.hover(null) // 清除高亮
```

## 图片

> **Image 模块** · 命名空间：`editor.image` · 源码：`plugins/feature-plugins/image`

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

### `editor.image.getSize(source)`

读取 URL、SVG、`File` 或 `Blob` 的原始像素尺寸，不创建画布节点。

```js
const { width, height } = await editor.image.getSize(file)
editor.setArtboardSize(width, height)
```

图片解析由 Image 模块统一完成。Vue 组件不应重复创建临时 `<img>` 或自行维护 Blob URL。

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

> **Text 模块** · 命名空间：`editor.text` · 源码：`plugins/feature-plugins/text`

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

> **EventBus 模块** · 命名空间：`editor.eventBus` · 源码：`logic/event-bus.js`

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
| `viewport:zoom-source` | 记录缩放来源后 | `{ source, zoom }` |
| `viewport:transform-end` | 手势缩放或变换结束后 | `{ zoom }` |
| `canvas:resized` | 外层画布尺寸变化后 | `{ width, height }` |
| `canvas:background-changed` | 背景色变化后 | `{ background }` |
| `canvas:grid-visibility-changed` | 网格显隐变化后 | `{ showGrid }` |
| `canvas:area-type-changed` | 区域类型变化后 | `{ areaType }` |
| `canvas:grid-changed` | 网格配置变化后 | `{ grid }` |
| `artboard:resized` | 白色画板尺寸变化后 | `{ artboard }` |
| `history:changed` | 命令历史变化后 | `{ canUndo, canRedo }` |
| `layers:changed` | 图层增删、重排、锁定或属性变化后 | `{ layers }` |
| `element-data:changed` | 元素业务属性写入、删除或清空后 | `{ element, elementId, attributes }` |
| `selection:deleted` | 通过编辑器动作或图层面板删除元素后 | `{ targets }` |
| `selection:layer-changed` | 选区或图层层级发生变化后 | `{ action, selected }` |
| `selection:layer-menu-open` | 请求 Vue 打开层级菜单 | `{ x, y, actions }` |
| `selection:layer-menu-close` | 请求关闭层级菜单 | `undefined` |

## 命令与历史

> **Command 模块** · 命名空间：`editor.commands` · 源码：`canvas-editor-core/src/commands`

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

## 元素业务属性

> **ElementData 模块** · 命名空间：`editor.elementData` · 源码：`plugins/feature-plugins/element-data`

元素业务属性用于保存 H5 运行时所需的数据，例如跳转链接、商品 ID、埋点标识、
交互动作和业务组件配置。它与 Leafer 的 `x`、`fill`、`locked` 等渲染属性隔离，
不会改变现有画布编辑流程。

每个通过文字或图片插件创建的元素都会自动获得稳定 `elementId`。业务属性必须是
可 JSON 序列化的普通对象，不允许函数、DOM、Date、Map、循环引用等运行时对象。

### 推荐数据结构

```js
// 图片元素
{
  image: {
    description: '红色礼盒正面展示图',
    role: 'background'
  }
}

// 文本元素
{
  textInput: {
    enabled: true,
    characterSet: 'latin',
    allowManualNewline: true,
    allowSymbols: true,
    maxCharactersPerLine: 20,
    maxCharacters: 100,
    maxLines: 5
  }
}
```

图片 `role` 只允许以下值：

| 值 | 图层标记 | 用途 |
| --- | --- | --- |
| `background` | 背景 | 生产背景图；通过上传背景图创建时自动写入。 |
| `mask` | 遮罩 | 标记为生产遮罩图。 |
| `ai-variable` | AI | 标记为 AI 可变图片。 |

图片用途属于业务标记，不会自动改变图层层级。点击穿透属于 Leafer 命中属性，使用
`editor.layer.togglePointerThrough(id)` 单独控制。

`characterSet: 'latin'` 表示只允许英文字母、数字和空格；`'any'` 表示不限制
中英文。自动换行由 `maxCharactersPerLine` 控制，`allowManualNewline` 只控制
用户是否可以主动输入换行。

不要把元素位置、颜色、字号等画布渲染属性重复写入业务属性。这些仍由 Leafer
节点和对应插件负责，避免形成两份互相冲突的数据源。

### `editor.elementData.setSelected(attributes, options)`

给当前单选元素写入业务属性。默认浅合并顶层字段，`replace: true` 时整体替换。

```js
editor.elementData.setSelected({
  action: { type: 'navigate', url: '/pages/activity/index' },
  tracking: { eventName: 'activity_click' }
})
```

### `editor.elementData.getSelected()`

获取当前单选元素的业务属性副本。未配置时返回 `null`。

```js
const attributes = editor.elementData.getSelected()
```

### `editor.elementData.removeSelected(keys)`

删除当前单选元素的一个或多个顶层字段。

```js
editor.elementData.removeSelected(['tracking', 'business'])
```

### `editor.elementData.clearSelected()`

清空当前单选元素的业务属性，但保留稳定 `elementId`。

### `editor.elementData.getById(elementId)` / `setById(elementId, attributes)`

适合图层面板、批量属性配置等不依赖当前选区的业务场景。

### `editor.elementData.export(options)`

导出供 H5 消费的元素业务属性列表。默认忽略未配置属性的元素。

```js
const h5ElementData = editor.elementData.export()

// [
//   {
//     elementId: 'V1StGXR8_Z5jdHi6B-myT',
//     type: 'Text',
//     attributes: {
//       action: { type: 'navigate', url: '/pages/activity/index' }
//     }
//   }
// ]
```

如需导出空属性元素：

```js
editor.elementData.export({ includeEmpty: true })
```

### Vue 组件调用

`useCanvasEditor()` 已提供不暴露 Leafer 节点的应用层方法：

```js
editor.setSelectedElementAttributes({
  action: { type: 'navigate', url: '/pages/product/detail?id=1001' }
})

const current = editor.getSelectedElementAttributes()
const payload = editor.exportElementAttributes()
```

插件会发送 `element-data:changed` 事件，属性面板需要响应外部变化时可以订阅：

```js
const unsubscribe = editor.eventBus.on('element-data:changed', (payload) => {
  console.log(payload.elementId, payload.attributes)
})
```

复制元素时会复制业务属性，但会生成新的 `elementId`，避免 H5 页面出现重复身份。

## 生命周期

> **Core 生命周期** · 入口：`editor.destroy()` · 组件卸载时必须调用

### `editor.destroy()`

销毁编辑器，组件卸载时必须调用。

```js
onBeforeUnmount(() => {
  editor?.destroy()
})
```

## 高级导出

> **扩展 API** · 面向自定义插件、命令和测试；普通页面优先使用 `createEditor()` 返回的外观实例

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
| `ElementDataPlugin` | 元素业务属性插件。 |
| `ELEMENT_DATA_KEY` | 元素业务数据内部存储键；普通业务不应直接使用。 |
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

## 移动端 H5 文档协议

> **H5 Document 模块** · 入口：`exportH5Document()` · 源码：`src/services/h5-document.js`

编辑器页面位于 `#/editor`，移动端只读预览页面位于 `#/h5-preview`。
点击编辑器顶部的“H5 预览”后，会将当前画板导出为普通 JSON 并交给 H5 页面渲染。

```js
{
  version: 1,
  canvas: {
    width: 375,
    height: 667,
    background: '#ffffff'
  },
  elements: [
    {
      tag: 'Text',
      x: 24,
      y: 80,
      width: 327,
      text: '活动标题',
      fontSize: 32,
      elementId: 'stable-element-id',
      attributes: {
        textInput: {
          enabled: true,
          characterSet: 'any',
          allowManualNewline: true,
          allowSymbols: true,
          maxCharactersPerLine: 20,
          maxCharacters: 100,
          maxLines: 4
        }
      }
    }
  ]
}
```

- 元素坐标以画板左上角为原点，与编辑器工作区中的缩放和居中位置无关。
- 图片 Blob URL 在导出时转成 Data URL，避免页面跳转后资源失效。
- H5 页面也可以在“导入或查看 JSON”中接收后端返回的同结构数据。
- `textInput.enabled=true` 的文字元素会渲染为 H5 输入控件，其余元素保持只读展示。
