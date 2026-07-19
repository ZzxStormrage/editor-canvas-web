import { App, Group } from 'leafer-ui'
import '@leafer-in/editor'

import { EventBus } from '../logic/event-bus.js'
import { PluginManager } from '../plugins/plugin-manager.js'
import { registerDefaultPlugins } from '../plugins/index.js'
import { EditorState } from './EditorState.js'
import { createArea, updateArea } from '../area.js'
import { Editor } from './Editor.js'
import { ViewportManager } from '../viewport/ViewportManager.js'
import { CommandManager } from '../commands/CommandManager.js'
import { EditorActionButtons } from '../plugins/action-buttons.js'
import { EditorError } from '../errors/editor-error.js'

import { normalizeInitOptions } from '../utils/options.js'
import { resolveView, resolveSize } from '../utils/view.js'
import { createResizeObserver } from '../utils/dom.js'
import { createEditorSnapHooks } from '../utils/editor-snap.js'
import { ArtboardManager } from '../artboard.js'

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
  #guideLayer // 屏幕坐标辅助层 —— 吸附线不跟随画布缩放
  #area
  #artboard
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

  /**
   * 创建 Leafer App 和官方 Editor 插件实例。
   *
   * @returns {EditorBuilder} 当前构建器实例。
   */
  buildLeafer() {
    const { tree: userTreeOptions, sky: userSkyOptions, ...leaferOptions } = this.#options.leaferOptions ?? {}
    const snapHooks = createEditorSnapHooks({
      getInnerEditor: () => this.#innerEditor,
      getContentLayer: () => this.#contentLayer,
      getGuideLayer: () => this.#guideLayer,
      getState: () => this.#state?.proxy,
      getArtboard: () => this.#artboard,
      editorOptions: this.#options.editor
    })

    this.#leafer = new App({
      ...leaferOptions,
      view: this.#view,
      width: this.#size.width,
      height: this.#size.height,
      fill: 'transparent',
      pixelRatio: this.#options.pixelRatio,
      tree: userTreeOptions ?? { type: 'design' },
      sky: userSkyOptions ?? { hittable: true },
      editor: this.#createOfficialEditorConfig(snapHooks)
    })
    this.#resolveOfficialEditorLayers()
    return this
  }

  /**
   * 解析官方 App({ editor }) 创建出的 tree / sky / editor。
   *
   * @returns {void}
   */
  #resolveOfficialEditorLayers() {
    this.#treeLeafer = this.#leafer.tree
    this.#skyLeafer = this.#leafer.sky
    this.#innerEditor = this.#leafer.editor

    if (!this.#treeLeafer?.add || !this.#skyLeafer?.add || !this.#innerEditor) {
      throw new EditorError('Leafer official App({ editor }) initialization failed.', 'LEAFER_EDITOR_INIT_FAILED')
    }
  }

  // ───────────── 步骤 2：搭建场景树 ─────────────
  //
  // 图层架构（严格对齐 leafer-ui Editor 插件的 sky/tree 模式）：
  //
  //   app (App)
  //   ├── tree (Leafer, type: 'design')
  //   │   ├── area (Group)          ← 背景/网格，不参与缩放
  //   │   ├── stage (Group, scale)  ← 缩放容器
  //   │       └── contentLayer      ← 可编辑元素 (editable: true)
  //   │   └── guideLayer (Group)    ← 矢量吸附线，固定屏幕描边
  //   └── sky (Leafer)
  //       └── Editor 实例           ← @leafer-in/editor
  //
  // Editor 必须挂在独立 Leafer 上，否则缩放会导致控件坐标系错乱。

  /**
   * 搭建背景、缩放容器、内容层和白色画板。
   *
   * @returns {EditorBuilder} 当前构建器实例。
   */
  buildScene() {
    this.#stage = new Group({
      x: 0,
      y: 0,
      scale: this.#options.zoom.initial
    })
    this.#contentLayer = new Group({ x: 0, y: 0 })
    this.#guideLayer = new Group({
      hittable: false,
      editable: false,
      draggable: false
    })
    this.#area = createArea(this.#size, this.#options)
    this.#artboard = new ArtboardManager(this.#options.artboard, this.#size)

    // 内容层挂到缩放容器下
    this.#stage.add(this.#contentLayer)
    this.#artboard.mount(this.#stage, this.#contentLayer)

    // tree / sky 由 leafer-ui App 创建。这里不再把 Group 直接挂到根 App，
    // 保持官方编辑器刷新链路中的 children 全部都是 Leafer 层。
    this.#treeLeafer.add(this.#area, 0)
    this.#treeLeafer.add(this.#stage, 1)
    this.#treeLeafer.add(this.#guideLayer, 2)

    return this
  }

  // ───────────── 步骤 3：创建服务 ─────────────

  /**
   * 创建事件总线、插件管理器、命令管理器和视口服务。
   *
   * @returns {EditorBuilder} 当前构建器实例。
   */
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
        artboard: this.#artboard.options,
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

    this.#viewport = new ViewportManager(this.#leafer, this.#view, this.#stage, this.#state.proxy, this.#eventBus)

    this.#commandManager = new CommandManager(this.#state.proxy, this.#eventBus)

    // 操作按钮（锁定、复制、删除）
    this.#actionButtons = new EditorActionButtons(this.#innerEditor, this.#options.editor.theme, this.#eventBus)

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

  /**
   * 组装最终对外暴露的 Editor 外观实例。
   *
   * @returns {Editor} 编辑器实例。
   */
  buildEditor() {
    const context = {
      leafer: this.#leafer,
      stage: this.#stage,
      contentLayer: this.#contentLayer,
      artboard: this.#artboard,
      skyLeafer: this.#skyLeafer,
      innerEditor: this.#innerEditor,
      eventBus: this.#eventBus,
      state: this.#state.proxy,
      actionButtons: this.#actionButtons,
      pluginManager: this.#pluginManager
    }

    // Bootstrap plugins
    this.#artboard.bootstrap(context)
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
      this.#artboard,
      this.#actionButtons
    )

    // 自动尺寸监听（必须在 Editor 创建后才挂载）
    if (this.#options.autoResize) {
      editor.attachResizeObserver(createResizeObserver(this.#view, editor))
    }

    return editor
  }

  /**
   * 创建传给官方 App({ editor }) 的 Editor 配置。
   *
   * @param {{ beforeMove: Function, beforeRotate: Function }} snapHooks 吸附钩子。
   * @returns {Object} 官方 Editor 配置。
   */
  #createOfficialEditorConfig(snapHooks) {
    return {
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
      hoverStyle: this.#options.editor.hoverStyle,
      hoverPathType: this.#options.editor.hoverPathType,
      selectedStyle: this.#options.editor.selectedStyle,
      selectedPathType: this.#options.editor.selectedPathType,
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
    }
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
