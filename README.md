# Canvas Editor

基于 Vue、Vuetify 和 LeaferJS 的浏览器画布编辑器。保留完整的工作台布局、主题样式、组件和通用编辑能力，无需后端服务。

支持文字样式、图片导入与替换、背景图、画板尺寸、图层排序与锁定、组合、缩放和平移、撤销重做，以及本地 JSON 文档导入导出。图片以数据地址写入文档，重新打开文件时可继续使用。

## 本地运行

需要 Node.js 22.12 或更高版本。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，进入完整编辑器。顶部“打开 JSON”读取本地文档，“导出 JSON”下载当前文档。图片与背景图均从本机选择；字体列表使用系统字体。

```sh
npm run check       # 静态检查、测试、生产构建、公开文件扫描
npm run build       # 输出可部署的静态站点到 dist/
npm run preview     # 预览生产构建
```

不包含登录认证、业务接口、在线素材库、定制模板、AI 业务、H5 定制页面或生产区流程。应用没有预设的接口地址和令牌。手动导入的文档若包含外部图片或字体地址，浏览器仍会加载相应资源。

## 代码结构

- `src/components/editor-shell/`：原有工作台、通用面板和编辑组件。
- `src/assets/scss/editor-workbench.scss`、`src/config/vuetify-theme.js`：工作台样式与主题。
- `src/composables/`：Vue 状态、画布交互与本地文件操作。
- `src/core/`、`src/plugins/feature-plugins/`、`src/viewport/`：通用画布内核。
- `src/index.js`：内核入口，可在其他浏览器界面中复用。
- `examples/`：独立的轻量内核示例；主页面为完整工作台。

## 导出独立仓库

当前 Git 历史仍可能含旧业务代码与凭证。公开时使用白名单导出的全新仓库，避免推送原仓库历史。

```sh
npm run export:public
cd .public-export/canvas-editor
npm ci
npm run check
```

导出器复制允许公开的源代码、组件、测试和配置，初始化无提交、无远程地址的新 Git 仓库；不复制旧 Git 历史、环境文件、依赖目录、开发工具配置和旧构建产物。目标目录已存在时拒绝覆盖。

## 许可证

许可证草案为 MIT，见 [LICENSE](LICENSE)。发布前由维护者确认源代码权属与署名。依赖说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
