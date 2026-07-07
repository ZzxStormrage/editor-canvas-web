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
  /** @type {import('../plugins/action-buttons.js').EditorActionButtons} */
  #actionButtons

  // ──────── 只读属性 — 供外部查询 ────────
  get leafer() {
    return this.#leafer
  }
  get stage() {
    return this.#stage
  }
  get contentLayer() {
    return this.#contentLayer
  }
  /** @returns {import('leafer-ui').Leafer} 编辑器覆盖层（sky） */
  get skyLeafer() {
    return this.#skyLeafer
  }
  get state() {
    return this.#state
  }
  get eventBus() {
    return this.#bus
  }
  get pluginManager() {
    return this.#pluginManager
  }
  get image() {
    return this.#pluginManager.get('image')
  }
  get text() {
    return this.#pluginManager.get('text')
  }
  /** @returns {import('@leafer-in/editor').Editor} 图形编辑器实例 */
  get editor() {
    return this.#innerEditor
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
    this.#actionButtons = actionButtons
  }

  // ═══════════════════ 画布尺寸 ═══════════════════

  /**
   * 调整画布尺寸。
   * @param {number} width
   * @param {number} height
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

  /** @param {string} bg — 背景色 */
  setBackground(bg) {
    this.#state.background = bg
    return this
  }

  /** @param {boolean} show — 是否显示网格 */
  setShowGrid(show) {
    this.#state.showGrid = show
    return this
  }

  /** @param {'grid'|'blank'} type — 画布区域类型 */
  setAreaType(type) {
    this.#state.areaType = type
    return this
  }

  /** @param {Object} gridOpts — 网格配置 */
  setGrid(gridOpts = {}) {
    this.#state.grid = { ...this.#state.grid, ...gridOpts }
    return this
  }

  // ═══════════════════ 缩放（委托给 ViewportManager） ═══════════════════

  /** @param {number} z — 缩放级别 */
  setZoom(z) {
    this.#viewport.setZoom(z)
    return this
  }

  /** @param {number} [step] — 步进值 */
  zoomIn(step) {
    this.#viewport.zoomIn(step)
    return this
  }

  /** @param {number} [step] — 步进值 */
  zoomOut(step) {
    this.#viewport.zoomOut(step)
    return this
  }

  /** 重置缩放为初始值 */
  resetZoom() {
    this.#viewport.resetZoom()
    return this
  }

  // ═══════════════════ 命令（预留 undo/redo） ═══════════════════

  /** @returns {import('../commands/CommandManager.js').CommandManager} */
  get commands() {
    return this.#commands
  }

  /**
   * 执行命令并压入历史栈。
   * @param {import('../commands/Command.js').Command} command
   */
  execute(command) {
    this.#commands.execute(command)
    return this
  }

  /** 撤销 */
  undo() {
    this.#commands.undo()
    return this
  }

  /** 重做 */
  redo() {
    this.#commands.redo()
    return this
  }

  // ═══════════════════ 选区（委托给 @leafer-in/editor） ═══════════════════

  /**
   * 选中指定元素。
   * @param {*} target
   */
  select(target) {
    this.#innerEditor?.select(target)
    return this
  }

  /** 取消选中 */
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
   * @param {*} item
   */
  addToSelection(item) {
    this.#innerEditor?.addItem(item)
    return this
  }

  /**
   * 从选中列表中移除元素。
   * @param {*} item
   */
  removeFromSelection(item) {
    this.#innerEditor?.removeItem(item)
    return this
  }

  // ═══════════════════ 生命周期 ═══════════════════

  /** 销毁编辑器，释放所有资源 */
  destroy() {
    if (this.#state.destroyed) return

    this.#actionButtons?.destroy()
    this.#innerEditor?.destroy()
    this.#skyLeafer?.destroy()
    this.#viewport.destroy()
    this.#pluginManager.destroy()
    this.#bus.clear()
    this.#leafer.destroy()
    this.#state.destroyed = true
  }

  // ──────── 语义化别名 ────────

  /** @deprecated — 使用 setZoom */
  zoomTo(z) {
    return this.setZoom(z)
  }

  /** @deprecated — 使用 state.zoom */
  get zoom() {
    return this.#state.zoom
  }
}
