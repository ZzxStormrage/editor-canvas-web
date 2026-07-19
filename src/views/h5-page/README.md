# H5 模板配置与编辑器接入

本文只描述 `src/views/h5-page` 的模板配置、客户侧 API 和编辑器使用方式。核心编辑器完整 API 见项目根目录 `CANVAS_EDITOR_API.md`。

## 页面路由

| 页面 | 路由 |
| --- | --- |
| 百家姓 | `#/h5-page/hundred-family-surnames` |
| 十二生肖 | `#/h5-page/chinese-zodiac` |
| 原图定制 | `#/h5-page/original-customization` |
| 音乐定制 | `#/h5-page/music-customization` |
| 人像定制 | `#/h5-page/portrait-customization` |
| 诗词定制 | `#/h5-page/poetry-customization` |

所有页面使用查询参数加载模板：

```text
#/h5-page/chinese-zodiac?templateId=1001&partnerId=10
```

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `templateId` | 是 | 后台模板正整数 ID。 |
| `partnerId` | 否 | 转换为请求头 `X-Partner-Id`。 |
| `token` | 否 | H5 customer Token；兼容 `authorization`、`Authorization`，读取后从 URL 删除。 |
| `designName` | 否 | 保存的用户设计名称。 |
| `redirectPath` | 否 | 保存成功后跳转的小程序页面。 |

H5 customer Token 与后台编辑器 admin Token 相互独立。本地调试可以配置：

```env
VITE_H5_TEMPORARY_ACCESS_TOKEN=H5_CUSTOMER_TOKEN
```

## 模板配置规则

模板由后台编辑器创建并保存为统一文档 JSON。H5 页面通过元素业务属性识别可定制内容，不依赖图层 ID。

### 通用图片文字模板

适用于原图定制和音乐定制：

| 元素 | 属性路径 | 默认值 | 用途 |
| --- | --- | --- | --- |
| 图片 | `image.description` | `原图替换` | 上传后调用 `editor.replaceImage()` 替换资源。 |
| 文字 | `text.description` | `文本替换` | 输入时调用 `editor.replaceText()` 更新内容。 |

### 百家姓模板

模板文字元素必须配置：

| 元素 | 属性路径 | 值 |
| --- | --- | --- |
| 姓 | `text.description` | `姓` |
| 名 | `text.description` | `名` |

页面会读取这些文字作为初始值，并对所有同名标记同步文字和字体。

### 十二生肖模板

| 元素 | 属性路径 | 值 |
| --- | --- | --- |
| 年 | `text.description` | `年` |
| 月 | `text.description` | `月` |
| 日 | `text.description` | `日` |
| 生肖图片 | `image.description` | `鼠`、`牛`、`虎`、`兔`、`龙`、`蛇`、`马`、`羊`、`猴`、`鸡`、`狗`、`猪` |

切换生肖时，页面调用 `setElementsVisibilityByAttribute()`，仅显示匹配的生肖图层。

### 人像和诗词模板

| 图层 | 属性路径 | 推荐值 | 说明 |
| --- | --- | --- | --- |
| 可替换主图 | `image.role` | `ai-variable` | 通用可变图片标记。 |
| 可替换主图 | `image.description` | `人像替换`、`人像定制`、`AI主题`、`原图替换`、`原图定制` | 未配置 role 时按 description 匹配。 |
| 背景图片 | `image.role` | `background` | 背景替换目标，建议锁定并关闭命中。 |
| 可替换文字 | `text.description` | `文本替换`、`文案替换`、`主标题`、`副标题`、`落款` | 页面按 description 生成输入项。 |
| 打印区域 | 图层名称 | `打印区域` | 可选；存在时保存 `productImgUrl`。 |

图片选项通过路由传入：

```text
aiThemeUrl=https%3A%2F%2Fcdn.example.com%2Fportrait.png
backgroundImageUrl=https%3A%2F%2Fcdn.example.com%2Fbackground.png
```

多个选项使用 URL 编码后的 JSON 数组参数 `aiThemes`、`aiThemeUrls`、`backgroundImages` 或 `backgroundImageUrls`。每项支持：

```js
{
  id: 'portrait-1',
  label: '清新人像',
  url: 'https://cdn.example.com/portrait-1.png',
  selected: true
}
```

## 使用编辑器

生产页面统一使用 `CanvasDocumentViewport`，不要直接创建或保存 Leafer 节点：

```vue
<CanvasDocumentViewport
  ref="viewportRef"
  :document="templateDocument"
  :fit-options="{ padding: 8, viewportRatio: 0.92, expandZoomRange: true }"
  :load-options="{ interactive: false }"
  :zoom-limits="{ minRatio: 1, maxRatio: 2 }"
  @loaded="handleDocumentLoaded"
/>
```

```js
async function handleDocumentLoaded({ editor }) {
  const targets = editor.getElementsByAttribute('image.description', '原图替换')
  const backgrounds = editor.getElementsByRole('background')

  editor.replaceText(textTarget, '新文字')
  await editor.replaceImage(targets[0], imageUrl, { fit: 'contain' })
  editor.arrangeLayersByRole({ back: ['background'], front: ['mask'] })
}
```

常用 API：

| API | 用途 |
| --- | --- |
| `editor.loadDocument(document, options)` | 加载统一模板文档。 |
| `editor.exportDocument()` | 导出当前统一文档。 |
| `editor.getElementsByAttribute(path, value)` | 按 description 等属性查询元素。 |
| `editor.getElementsByRole(role)` | 按图片角色查询元素。 |
| `editor.replaceImage(target, source, options)` | 保持布局和变换，仅替换图片。 |
| `editor.replaceText(target, content)` | 替换文字内容。 |
| `editor.setElementsVisibilityByAttribute(path, value, options)` | 按属性切换元素显示。 |
| `editor.captureCanvas(options)` | 生成完整画板预览图。 |
| `editor.capturePrintArea(options)` | 生成打印区域产品图。 |

## 客户侧 API

接口基础域名使用 `VITE_XIAOXIANG_API_BASE_URL`。

| 功能 | 方法与地址 | 封装 |
| --- | --- | --- |
| 获取模板详情 | `GET /customer/api/customTemplate/{templateId}` | `customerTemplateApi.detail()` |
| 保存用户设计 | `POST /customer/api/customTemplate` | `customerTemplateApi.createDesign()` |
| 上传图片 | `POST /customer/api/localStorage/pictures` | `customerPictureApi.upload()` |

路径可以通过以下环境变量覆盖：

```env
VITE_CUSTOMER_CUSTOM_TEMPLATE_API_PATH=/customer/api/customTemplate
VITE_CUSTOMER_PICTURE_UPLOAD_PATH=/customer/api/localStorage/pictures
```

加载模板：

```js
import { loadH5TemplateDocument } from './services/template-document.js'

const { record, document } = await loadH5TemplateDocument(templateId, {
  partnerId
})
```

上传图片：

```js
import { customerPictureApi } from './api/customer-picture.js'

const imageUrl = await customerPictureApi.upload(file)
```

保存设计：

```js
import { saveH5CustomDesign } from './services/custom-design.js'

const result = await saveH5CustomDesign(editor, {
  templateId,
  partnerId,
  designName: '生肖定制'
})
```

保存流程固定为：

1. `editor.exportDocument()` 导出 JSON。
2. `captureCanvas()` 上传完整预览图。
3. 存在打印区域时调用 `capturePrintArea()` 上传产品图。
4. `POST /customer/api/customTemplate` 保存用户设计。
5. 发送 `h5:page-saved`，再执行小程序返回或 `redirectPath` 跳转。

保存 DTO：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `templateId` | `number` | 原后台模板 ID。 |
| `content` | `string` | `JSON.stringify(editor.exportDocument())`。 |
| `designName` | `string` | 用户设计名称。 |
| `previewImgUrl` | `string` | 完整画板截图地址。 |
| `productImgUrl` | `string` | 可选打印区域截图地址。 |

## 新增模板页面

1. 在 `src/router/index.js` 的 `/h5-page` children 中注册路由。
2. 使用 `useH5TemplateDocument()` 从 `route.query.templateId` 加载文档。
3. 使用 `CanvasDocumentViewport` 渲染，不直接操作底层 Leafer 实例。
4. 使用 `description` 或 `role` 定义稳定的业务标记。
5. 使用 `useH5PageSave()` 或 `saveH5CustomDesign()` 保存，禁止在页面内重复实现 HTTP 和截图流程。
