import { Group } from 'leafer-ui'
import { App } from '@leafer-ui/app'
import { Editor as LeaferEditor } from '@leafer-in/editor'

import { DEFAULT_CANVAS_CONFIG } from '../config/index.js'
import { EventBus } from '../logic/event-bus.js'
import { PluginManager } from '../plugins/plugin-manager.js'
import { registerDefaultPlugins } from '../plugins/index.js'
import { EditorState } from './EditorState.js'
import { createArea, updateArea } from '../area.js'
import { Editor } from './Editor.js'
import { ViewportManager } from '../viewport/ViewportManager.js'
import { CommandManager } from '../commands/CommandManager.js'
import { EditorActionButtons } from '../plugins/action-buttons.js'

import { normalizeInitOptions } from '../utils/options.js'
import { resolveView, resolveSize } from '../utils/view.js'
import { createResizeObserver } from '../utils/dom.js'
import { createEditorSnapHooks } from '../utils/editor-snap.js'

/**
 * 编辑器构建器 —— **建造者模式**
 *
 * 将原本 `init()` 中的上帝函数拆分为可链式调用的构建步骤：
 *   1. options  → 归一化参数
 *   2. leafer   → 创建 Leafer 实例
 *   3. scene    → 搭建 stage / contentLayer / area 场景树
 *   4. services → 事件总线、插件、命令、视口
 *   5. build    → 组装 Editor 外观类
 *
 * 设计动机：《JavaScript设计模式与开发实践》第13章
 *   - 将一个复杂对象的构建与表示分离
 *   - 同样的构建过程可以创建不同的表示
 *
 * @author zzx
 * @since 2026-07-01
 */
export class EditorBuilder {
  #options
  #view
  #size

  #leafer // 根 App (tree / sky / editor 官方分层)
  #skyLeafer // 编辑器覆盖层 —— 独立 Leafer，屏幕坐标空间
  #treeLeafer // 内容树层 —— 放置背景、缩放容器和可编辑元素
  #stage
  #contentLayer
  #area
  #innerEditor

  #eventBus
  #pluginManager
  #state
  #viewport
  #commandManager
  #actionButtons

  /**
   * @param {Object} rawOptions — 外部传入的原始选项
   */
  constructor(rawOptions) {
    this.#options = normalizeInitOptions(rawOptions)
    this.#view = resolveView(this.#options.view)
    this.#size = resolveSize(this.#view, this.#options)
  }

  // ───────────── 步骤 1：创建 Leafer ─────────────

  buildLeafer() {
    const { tree: userTreeOptions, sky: userSkyOptions, ...leaferOptions } = this.#options.leaferOptions ?? {}

    this.#leafer = new App({
      ...leaferOptions,
      view: this.#view,
      width: this.#size.width,
      height: this.#size.height,
      fill: 'transparent',
      pixelRatio: this.#options.pixelRatio,
      type: 'design',
      tree: userTreeOptions ?? { type: 'design' },
      sky: userSkyOptions ?? { hittable: true }
    })
    this.#treeLeafer = this.#ensureAppLayer('tree', { type: 'design' })
    this.#skyLeafer = this.#ensureAppLayer('sky', { hittable: true })
    return this
  }

  #ensureAppLayer(name, options) {
    const layer = this.#leafer[name]

    if (layer?.add) {
      return layer
    }

    if (typeof this.#leafer.addLeafer === 'function') {
      const createdLayer = this.#leafer.addLeafer(options)
      this.#leafer[name] = createdLayer
      return createdLayer
    }

    throw new Error(`leafer-ui App layer "${name}" was not created.`)
  }

  // ───────────── 步骤 2：搭建场景树 ─────────────
  //
  // 图层架构（严格对齐 leafer-ui Editor 插件的 sky/tree 模式）：
  //
  //   app (App)
  //   ├── tree (Leafer, type: 'design')
  //   │   ├── area (Group)          ← 背景/网格，不参与缩放
  //   │   └── stage (Group, scale)  ← 缩放容器
  //   │       └── contentLayer      ← 可编辑元素 (editable: true)
  //   └── sky (Leafer)
  //       └── Editor 实例           ← @leafer-in/editor
  //
  // Editor 必须挂在独立 Leafer 上，否则缩放会导致控件坐标系错乱。

  buildScene() {
    this.#stage = new Group({
      x: 0,
      y: 0,
      scale: this.#options.zoom.initial
    })
    this.#contentLayer = new Group({ x: 0, y: 0 })
    this.#area = createArea(this.#size, this.#options)

    // 内容层挂到缩放容器下
    this.#stage.add(this.#contentLayer)

    // tree / sky 由 leafer-ui App 创建。这里不再把 Group 直接挂到根 App，
    // 保持官方编辑器刷新链路中的 children 全部都是 Leafer 层。
    this.#treeLeafer.add(this.#area, 0)
    this.#treeLeafer.add(this.#stage, 1)

    return this
  }

  // ───────────── 步骤 3：创建服务 ─────────────

  buildServices() {
    this.#eventBus = new EventBus()

    this.#state = new EditorState(
      {
        view: this.#view,
        width: this.#size.width,
        height: this.#size.height,
        zoom: this.#options.zoom.initial,
        zoomOptions: this.#options.zoom,
        imageOptions: this.#options.image,
        textOptions: this.#options.text,
        editor: this.#options.editor,
        background: this.#options.background,
        showGrid: this.#options.showGrid,
        areaType: this.#options.areaType,
        grid: this.#options.grid
      },
      this.#eventBus
    )

    this.#pluginManager = new PluginManager()
    registerDefaultPlugins(this.#pluginManager)

    // 创建官方 Editor 实例（@leafer-in/editor），
    // 挂载到独立 skyLeafer 层 —— 屏幕坐标空间。
    const snapHooks = createEditorSnapHooks({
      getInnerEditor: () => this.#innerEditor,
      contentLayer: this.#contentLayer,
      state: this.#state.proxy,
      editorOptions: this.#options.editor
    })

    this.#innerEditor = new LeaferEditor({
      keyEvent: this.#options.editor.keyEvent,
      stroke: this.#options.editor.stroke,
      strokeWidth: this.#options.editor.strokeWidth,
      pointFill: this.#options.editor.pointFill,
      pointSize: this.#options.editor.pointSize,
      pointRadius: this.#options.editor.pointRadius,
      middlePoint: this.#options.editor.middlePoint,
      rotateGap: this.#options.editor.rotateGap,
      circle: this.#options.editor.circle,
      circleDirection: this.#options.editor.circleDirection,
      circleMargin: this.#options.editor.circleMargin,
      moveCursor: this.#options.editor.moveCursor,
      buttonsDirection: this.#options.editor.buttonsDirection,
      buttonsMargin: this.#options.editor.buttonsMargin,
      hideRotatePoints: this.#options.editor.hideRotatePoints,
      hideOnSmall: this.#options.editor.hideOnSmall,
      selector: this.#options.editor.selector,
      editBox: this.#options.editor.editBox,
      hover: this.#options.editor.hover,
      select: this.#options.editor.select,
      openInner: this.#options.editor.openInner,
      multipleSelect: this.#options.editor.multipleSelect,
      boxSelect: this.#options.editor.boxSelect,
      moveable: this.#options.editor.moveable,
      resizeable: this.#options.editor.resizeable,
      flipable: this.#options.editor.flipable,
      rotateable: this.#options.editor.rotateable,
      skewable: this.#options.editor.skewable,
      arrowStep: this.#options.editor.arrowStep,
      arrowFastStep: this.#options.editor.arrowFastStep,
      beforeMove: snapHooks.beforeMove,
      beforeRotate: snapHooks.beforeRotate
    })
    this.#skyLeafer.add(this.#innerEditor)

    this.#viewport = new ViewportManager(this.#leafer, this.#stage, this.#state.proxy, this.#eventBus)

    this.#commandManager = new CommandManager(this.#state.proxy, this.#eventBus)

    // 操作按钮（锁定、复制、删除）
    this.#actionButtons = new EditorActionButtons(this.#innerEditor, this.#options.editor.theme)

    this.#bindAreaState()

    return this
  }

  #bindAreaState() {
    const syncArea = () => {
      const state = this.#state.proxy
      updateArea(
        this.#area,
        { width: state.width, height: state.height },
        {
          background: state.background,
          showGrid: state.showGrid,
          areaType: state.areaType,
          grid: {
            ...state.grid,
            backgroundColor: state.background
          }
        }
      )
    }

    ;[
      'canvas:resized',
      'canvas:background-changed',
      'canvas:grid-visibility-changed',
      'canvas:area-type-changed',
      'canvas:grid-changed'
    ].forEach((eventName) => this.#eventBus.on(eventName, syncArea))
  }

  // ───────────── 步骤 4：组装 Editor ─────────────

  buildEditor() {
    const context = {
      leafer: this.#leafer,
      stage: this.#stage,
      contentLayer: this.#contentLayer,
      skyLeafer: this.#skyLeafer,
      innerEditor: this.#innerEditor,
      eventBus: this.#eventBus,
      state: this.#state.proxy,
      actionButtons: this.#actionButtons
    }

    // Bootstrap plugins
    this.#pluginManager.bootstrap(context)

    // 注入视口缩放交互
    this.#viewport.setupInteraction()

    // 组装 Editor 外观类
    const editor = new Editor(
      this.#leafer,
      this.#stage,
      this.#contentLayer,
      this.#skyLeafer,
      context.state,
      this.#eventBus,
      this.#pluginManager,
      this.#viewport,
      this.#commandManager,
      this.#innerEditor,
      this.#actionButtons
    )

    // 自动尺寸监听（必须在 Editor 创建后才挂载）
    if (this.#options.autoResize) {
      createResizeObserver(this.#view, editor)
    }

    return editor
  }

  /**
   * 一键构建（语法糖）。
   *
   * @returns {Editor}
   */
  build() {
    return this.buildLeafer().buildScene().buildServices().buildEditor()
  }
}
