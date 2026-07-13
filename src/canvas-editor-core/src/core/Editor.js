import { Bounds } from 'leafer-ui'

/**
 * 编辑器外观 —— **外观模式**
 *
 * 为复杂的编辑器子系统提供统一的高层接口。
 * Editor 本身不实现业务逻辑，而是将调用委托给各个子系统：
 *   - ViewportManager → zoom/zoomIn/zoomOut/resetZoom
 *   - CommandManager  → 所有写操作（预留 undo/redo）
 *   - state (Proxy)   → 读操作
 *   - pluginManager   → 插件查询与销毁
 *
 * 设计动机：《JavaScript设计模式与开发实践》第19章
 *   - 当子系统复杂时，外观模式提供一个简单的入口
 *   - 降低调用方与子系统之间的耦合
 *
 * @author zzx
 * @since 2026-07-01
 */
export class Editor {
  /** @type {import('leafer-ui').Leafer} */
  #leafer
  /** @type {import('leafer-ui').Group} */
  #stage
  /** @type {import('leafer-ui').Group} */
  #contentLayer
  /** @type {import('leafer-ui').Leafer} */
  #skyLeafer
  /** @type {Proxy} */
  #state
  /** @type {import('../logic/event-bus.js').EventBus} */
  #bus
  /** @type {import('../plugins/plugin-manager.js').PluginManager} */
  #pluginManager
  /** @type {import('../viewport/ViewportManager.js').ViewportManager} */
  #viewport
  /** @type {import('../commands/CommandManager.js').CommandManager} */
  #commands
  /** @type {import('@leafer-in/editor').Editor} */
  #innerEditor
  /** @type {import('../artboard.js').ArtboardManager} */
  #artboard
  /** @type {import('../plugins/action-buttons.js').EditorActionButtons} */
  #actionButtons

  // ──────── 只读属性 — 供外部查询 ────────
  /** @returns {import('leafer-ui').Leafer} Leafer App 根实例。 */
  get leafer() {
    return this.#leafer
  }

  /** @returns {import('leafer-ui').Group} 缩放容器。 */
  get stage() {
    return this.#stage
  }

  /** @returns {import('leafer-ui').Group} 可编辑内容层。 */
  get contentLayer() {
    return this.#contentLayer
  }
  /** @returns {import('leafer-ui').Leafer} 编辑器覆盖层（sky） */
  get skyLeafer() {
    return this.#skyLeafer
  }
  /** @returns {Proxy} 编辑器状态代理。 */
  get state() {
    return this.#state
  }

  /** @returns {import('../logic/event-bus.js').EventBus} 编辑器事件总线。 */
  get eventBus() {
    return this.#bus
  }

  /** @returns {import('../plugins/plugin-manager.js').PluginManager} 插件管理器。 */
  get pluginManager() {
    return this.#pluginManager
  }

  /** @returns {import('../plugins/feature-plugins/image/image-plugin.js').ImagePlugin} 图片插件。 */
  get image() {
    return this.#pluginManager.get('image')
  }

  /** @returns {import('../plugins/feature-plugins/text/text-plugin.js').TextPlugin} 文本插件。 */
  get text() {
    return this.#pluginManager.get('text')
  }
  /** @returns {import('../plugins/feature-plugins/layer/layer-plugin.js').LayerPlugin} 图层插件。 */
  get layer() {
    return this.#pluginManager.get('layer')
  }
  /** @returns {import('../plugins/feature-plugins/element-data/element-data-plugin.js').ElementDataPlugin} 元素业务属性插件。 */
  get elementData() {
    return this.#pluginManager.get('elementData')
  }
  /** @returns {import('@leafer-in/editor').Editor} 图形编辑器实例 */
  get editor() {
    return this.#innerEditor
  }
  /** @returns {import('../artboard.js').ArtboardManager} 白色画板管理器 */
  get artboard() {
    return this.#artboard
  }

  /**
   * @param {*} leafer
   * @param {*} stage
   * @param {*} contentLayer
   * @param {import('leafer-ui').Leafer} skyLeafer — 编辑器覆盖层
   * @param {Proxy} state
   * @param {*} bus
   * @param {*} pluginManager
   * @param {*} viewport
   * @param {*} commandManager
   * @param {import('@leafer-in/editor').Editor} innerEditor
   * @param {import('../artboard.js').ArtboardManager} artboard
   * @param {import('../plugins/action-buttons.js').EditorActionButtons} actionButtons
   */
  constructor(
    leafer,
    stage,
    contentLayer,
    skyLeafer,
    state,
    bus,
    pluginManager,
    viewport,
    commandManager,
    innerEditor,
    artboard,
    actionButtons
  ) {
    this.#leafer = leafer
    this.#stage = stage
    this.#contentLayer = contentLayer
    this.#skyLeafer = skyLeafer
    this.#state = state
    this.#bus = bus
    this.#pluginManager = pluginManager
    this.#viewport = viewport
    this.#commands = commandManager
    this.#innerEditor = innerEditor
    this.#artboard = artboard
    this.#actionButtons = actionButtons
  }

  // ═══════════════════ 画布尺寸 ═══════════════════

  /**
   * 调整画布尺寸。
   *
   * @param {number} width 画布宽度。
   * @param {number} height 画布高度。
   * @returns {Editor} 当前编辑器实例。
   */
  resize(width, height) {
    const w = Number(width)
    const h = Number(height)
    this.#leafer.resize(new Bounds(0, 0, w, h))
    this.#skyLeafer?.resize(new Bounds(0, 0, w, h))
    this.#state.width = w
    this.#state.height = h
    return this
  }

  // ═══════════════════ 背景与网格 ═══════════════════

  /**
   * 设置画布背景色。
   *
   * @param {string} bg 背景色。
   * @returns {Editor} 当前编辑器实例。
   */
  setBackground(bg) {
    this.#state.background = bg
    return this
  }

  /**
   * 设置是否显示网格背景。
   *
   * @param {boolean} show 是否显示网格。
   * @returns {Editor} 当前编辑器实例。
   */
  setShowGrid(show) {
    this.#state.showGrid = show
    return this
  }

  /**
   * 设置画布区域类型。
   *
   * @param {'grid' | 'blank'} type 画布区域类型。
   * @returns {Editor} 当前编辑器实例。
   */
  setAreaType(type) {
    this.#state.areaType = type
    return this
  }

  /**
   * 合并更新网格配置。
   *
   * @param {Object} gridOpts 网格配置。
   * @returns {Editor} 当前编辑器实例。
   */
  setGrid(gridOpts = {}) {
    this.#state.grid = { ...this.#state.grid, ...gridOpts }
    return this
  }

  /**
   * 调整当前白色画板尺寸。
   *
   * @param {number} width 画板宽度。
   * @param {number} height 画板高度。
   * @returns {Editor} 当前编辑器实例。
   */
  setArtboardSize(width, height) {
    this.#artboard?.resize(width, height)
    return this
  }

  // ═══════════════════ 缩放（委托给 ViewportManager） ═══════════════════

  /**
   * 设置缩放级别。
   *
   * @param {number} z 缩放级别。
   * @returns {Editor} 当前编辑器实例。
   */
  setZoom(z) {
    this.#viewport.setZoom(z)
    return this
  }

  /**
   * 放大画布。
   *
   * @param {number} [step] 步进值。
   * @returns {Editor} 当前编辑器实例。
   */
  zoomIn(step) {
    this.#viewport.zoomIn(step)
    return this
  }

  /**
   * 缩小画布。
   *
   * @param {number} [step] 步进值。
   * @returns {Editor} 当前编辑器实例。
   */
  zoomOut(step) {
    this.#viewport.zoomOut(step)
    return this
  }

  /**
   * 重置缩放为初始值。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  resetZoom() {
    this.#viewport.resetZoom()
    return this
  }

  /**
   * 按当前画布可视区域缩放画板并居中。
   *
   * @param {number | { padding?: number, viewportRatio?: number, expandZoomRange?: boolean }} [options] 适配选项。
   * @returns {Editor} 当前编辑器实例。
   */
  fitArtboardToView(options) {
    this.#viewport.fitArtboardToView(options)
    return this
  }

  /**
   * 不改变缩放，仅将画板居中到当前可视区域。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  centerArtboard() {
    this.#viewport.centerArtboard()
    return this
  }

  // ═══════════════════ 命令（预留 undo/redo） ═══════════════════

  /** @returns {import('../commands/CommandManager.js').CommandManager} */
  get commands() {
    return this.#commands
  }

  /**
   * 执行命令并压入历史栈。
   *
   * @param {import('../commands/Command.js').Command} command 命令实例。
   * @returns {Editor} 当前编辑器实例。
   */
  execute(command) {
    this.#commands.execute(command)
    return this
  }

  /**
   * 撤销一步历史。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  undo() {
    this.#commands.undo()
    return this
  }

  /**
   * 重做一步历史。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  redo() {
    this.#commands.redo()
    return this
  }

  // ═══════════════════ 选区（委托给 @leafer-in/editor） ═══════════════════

  /**
   * 选中指定元素。
   *
   * @param {*} target Leafer 元素。
   * @returns {Editor} 当前编辑器实例。
   */
  select(target) {
    this.#innerEditor?.select(target)
    return this
  }

  /**
   * 取消当前选中。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  deselect() {
    this.#innerEditor?.cancel()
    return this
  }

  /** @returns {Array} 当前选中的元素列表 */
  get selectedElements() {
    return this.#innerEditor?.list ?? []
  }

  /** @returns {boolean} 是否正在编辑中 */
  get isEditing() {
    return this.#innerEditor?.editing ?? false
  }

  /** @returns {boolean} 是否多选 */
  get isMultipleSelect() {
    return this.#innerEditor?.multiple ?? false
  }

  /**
   * 添加元素到选中列表。
   *
   * @param {*} item Leafer 元素。
   * @returns {Editor} 当前编辑器实例。
   */
  addToSelection(item) {
    this.#innerEditor?.addItem(item)
    return this
  }

  /**
   * 从选中列表中移除元素。
   *
   * @param {*} item Leafer 元素。
   * @returns {Editor} 当前编辑器实例。
   */
  removeFromSelection(item) {
    this.#innerEditor?.removeItem(item)
    return this
  }

  /**
   * 执行当前选区的层级操作。
   *
   * @param {'front' | 'forward' | 'backward' | 'back'} action 层级动作。
   * @returns {Editor} 当前编辑器实例。
   */
  runLayerAction(action) {
    this.#actionButtons?.runLayerAction(action)
    return this
  }

  /**
   * 关闭当前选区的层级菜单。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  closeLayerMenu() {
    this.#actionButtons?.closeLayerMenu()
    return this
  }

  // ═══════════════════ 生命周期 ═══════════════════

  /**
   * 销毁编辑器，释放所有资源。
   *
   * @returns {void}
   */
  destroy() {
    if (this.#state.destroyed) return

    this.#actionButtons?.destroy()
    this.#artboard?.destroy()
    this.#viewport.destroy()
    this.#pluginManager.destroy()
    this.#bus.clear()
    this.#leafer.destroy()
    this.#state.destroyed = true
  }

  // ──────── 语义化别名 ────────

  /**
   * @deprecated 使用 setZoom()。
   * @param {number} z 缩放级别。
   * @returns {Editor} 当前编辑器实例。
   */
  zoomTo(z) {
    return this.setZoom(z)
  }

  /** @deprecated — 使用 state.zoom */
  get zoom() {
    return this.#state.zoom
  }
}
