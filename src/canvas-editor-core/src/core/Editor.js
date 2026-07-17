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
  /** @returns {import('../plugins/feature-plugins/document/document-plugin.js').DocumentPlugin} 统一文档插件。 */
  get document() {
    return this.#pluginManager.get('document')
  }
  /** @returns {import('../plugins/feature-plugins/production/production-plugin.js').ProductionPlugin} 生产辅助插件。 */
  get production() {
    return this.#pluginManager.get('production')
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

  // ═══════════════════ 图片属性（委托给 ImagePlugin） ═══════════════════

  /**
   * 获取当前单选图片的可编辑属性。
   *
   * @returns {ReturnType<import('../plugins/feature-plugins/image/image-plugin.js').ImagePlugin['getSelectedProperties']>}
   * 图片属性；当前不是单选图片时返回 null。
   */
  getSelectedImageProperties() {
    return this.image?.getSelectedProperties?.() ?? null
  }

  /**
   * 更新当前单选图片属性。
   *
   * @param {Object} properties 图片属性补丁。
   * @returns {Editor} 当前编辑器实例。
   */
  updateSelectedImageProperties(properties) {
    this.image?.updateSelectedProperties?.(properties)
    return this
  }

  /**
   * 将当前单选图片恢复到原始像素尺寸。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  resetSelectedImageSize() {
    this.image?.resetSelectedSize?.()
    return this
  }

  /**
   * 替换当前严格单选图片，保留节点外框、位置和变换属性。
   *
   * @param {string | File | Blob} source 新图片来源。
   * @param {{ fit?: 'contain' | 'cover' | 'stretch' }} [options={}] 替换配置。
   * @returns {Promise<import('leafer-ui').Image> | undefined} 已替换资源的图片节点。
   */
  replaceSelectedImage(source, options = {}) {
    return this.image?.replaceSelected?.(source, options)
  }

  /**
   * 替换指定图片节点，保留节点外框、位置、层级和变换属性。
   *
   * @param {import('leafer-ui').Image} target 指定图片节点。
   * @param {string | File | Blob} source 新图片来源。
   * @param {{ fit?: 'contain' | 'cover' | 'stretch', allowLocked?: boolean }} [options={}]
   * 替换配置。
   * @returns {Promise<import('leafer-ui').Image> | undefined} 已替换资源的图片节点。
   */
  replaceImage(target, source, options = {}) {
    return this.image?.replace?.(target, source, options)
  }

  /**
   * 替换指定文本节点，保留节点样式、位置和固定宽度，不改变当前选区。
   *
   * @param {import('leafer-ui').Text} target 指定文本节点。
   * @param {string | number} content 新文本内容。
   * @returns {import('leafer-ui').Text | null} 已替换内容的文本节点。
   */
  replaceText(target, content) {
    return this.text?.replace?.(target, content) ?? null
  }

  /**
   * 更新指定文本节点样式，不改变当前选区。
   *
   * @param {import('leafer-ui').Text} target 指定文本节点。
   * @param {Object} options 文本样式补丁。
   * @returns {import('leafer-ui').Text | null} 更新后的文本节点。
   */
  updateText(target, options) {
    return this.text?.update?.(target, options, { select: false }) ?? null
  }

  /**
   * 替换当前严格单选文本，保留节点样式、位置和固定宽度。
   *
   * @param {string | number} content 新文本内容。
   * @returns {import('leafer-ui').Text | null} 已替换内容的文本节点。
   */
  replaceSelectedText(content) {
    return this.text?.replaceSelected?.(content) ?? null
  }

  // ═══════════════════ 元素查询（委托给 ElementDataPlugin） ═══════════════════

  /**
   * 获取画布中的全部元素，递归包含组合内子元素。
   *
   * @returns {Object[]} Leafer 元素数组。
   */
  getAllElements() {
    return this.elementData?.getAllElements?.() ?? []
  }

  /**
   * 根据自定义属性中的 role 获取元素。
   *
   * @param {string} role 角色值，例如 background、mask 或 ai-variable。
   * @returns {Object[]} 匹配的 Leafer 元素数组。
   */
  getElementsByRole(role) {
    return this.elementData?.getElementsByRole?.(role) ?? []
  }

  /**
   * 根据元素类型获取元素。
   *
   * @param {string} type 元素类型，例如 image、text、group 或 rect。
   * @returns {Object[]} 匹配的 Leafer 元素数组。
   */
  getElementsByType(type) {
    return this.elementData?.getElementsByType?.(type) ?? []
  }

  /**
   * 根据自定义属性路径和值获取元素。
   *
   * @param {string} path 属性路径。
   * @param {*} value 匹配值。
   * @returns {Object[]} 匹配元素。
   */
  getElementsByAttribute(path, value) {
    return this.elementData?.getElementsByAttribute?.(path, value) ?? []
  }

  /**
   * 根据自定义属性路径和值切换元素显隐。
   *
   * @param {string} path 属性路径。
   * @param {*} value 当前匹配值。
   * @param {{ exclusive?: boolean }} [options={}] 显隐选项。
   * @returns {Object[]} 当前匹配元素。
   */
  setElementsVisibilityByAttribute(path, value, options = {}) {
    return this.elementData?.setVisibilityByAttribute?.(path, value, options) ?? []
  }

  /**
   * 按业务 role 调整顶层图层位置。
   *
   * @param {{ back?: string[], front?: string[] }} [options={}] role 排列配置。
   * @returns {Editor} 当前编辑器实例。
   */
  arrangeLayersByRole(options = {}) {
    this.layer?.arrangeByRole?.(options)
    return this
  }

  // ═══════════════════ 统一文档（委托给 DocumentPlugin） ═══════════════════

  /**
   * 加载统一编辑器文档。
   *
   * @param {string | Object} document JSON 字符串或文档对象。
   * @param {Object} [options={}] 加载选项。
   * @returns {Promise<Object> | undefined} 已加载文档。
   */
  loadDocument(document, options = {}) {
    return this.document?.load?.(document, options)
  }

  /** @returns {Object | null} 当前统一编辑器文档。 */
  exportDocument() {
    return this.document?.export?.() ?? null
  }

  /** @returns {Editor} 当前编辑器实例。 */
  clearDocument() {
    this.document?.clear?.()
    return this
  }

  // ═══════════════════ 生产辅助（委托给 ProductionPlugin） ═══════════════════

  /**
   * 把图片标记为遮罩图。
   *
   * @param {Object} image Leafer 图片节点。
   * @param {File | Blob | string | null} [source=null] 透明区域识别使用的图片来源。
   * @returns {Editor} 当前编辑器实例。
   */
  markImageAsMask(image, source = null) {
    this.production?.markMask?.(image, source)
    return this
  }

  /**
   * 创建或重置打印区域。
   *
   * @param {{ x?: number, y?: number, width?: number, height?: number }} [options={}] 打印区域。
   * @returns {Editor} 当前编辑器实例。
   */
  createPrintArea(options = {}) {
    this.production?.createPrintArea?.(options)
    return this
  }

  /**
   * 获取打印区域画板相对属性。
   *
   * @returns {{ x: number, y: number, width: number, height: number } | null} 打印区域。
   */
  getPrintAreaProperties() {
    return this.production?.getPrintAreaProperties?.() ?? null
  }

  /**
   * 更新打印区域位置和尺寸。
   *
   * @param {{ x?: number, y?: number, width?: number, height?: number }} properties 打印区域。
   * @returns {Editor} 当前编辑器实例。
   */
  updatePrintArea(properties) {
    this.production?.updatePrintArea?.(properties)
    return this
  }

  /**
   * 删除打印区域。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  removePrintArea() {
    this.production?.removePrintArea?.()
    return this
  }

  /**
   * 根据遮罩透明区域自动生成打印区域。
   *
   * @param {{ alphaThreshold?: number, maxAnalysisSize?: number }} [options={}] 识别选项。
   * @returns {Promise<{ x: number, y: number, width: number, height: number }>} 打印区域。
   */
  detectPrintAreaFromMask(options = {}) {
    return this.production?.detectPrintAreaFromMask?.(options)
  }

  /**
   * 截取打印区域并生成 File；传入 upload 时返回上传接口结果。
   *
   * @param {Object} [options={}] 截图和上传选项。
   * @returns {Promise<File | *>} File 或上传结果。
   */
  capturePrintArea(options = {}) {
    return this.production?.capturePrintArea?.(options)
  }

  /**
   * 截取完整画板并生成 File；传入 upload 时返回上传接口结果。
   *
   * @param {Object} [options={}] 截图和上传选项。
   * @returns {Promise<File | *>} File 或上传结果。
   */
  captureCanvas(options = {}) {
    return this.production?.captureCanvas?.(options)
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
   * 获取 Vue 选区工具条所需的状态和世界坐标边界。
   *
   * @returns {ReturnType<import('../plugins/action-buttons.js').EditorActionButtons['getSelectionToolbarState']>}
   * 选区工具条状态。
   */
  getSelectionToolbarState() {
    return this.#actionButtons?.getSelectionToolbarState() ?? {
      visible: false,
      bounds: null,
      locked: false,
      selectionCount: 0,
      canGroup: false,
      canUngroup: false,
      disabled: {
        duplicate: true,
        delete: true,
        layer: true,
        group: true,
        ungroup: true
      }
    }
  }

  /**
   * 切换当前选区锁定状态。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  toggleSelectionLock() {
    this.#actionButtons?.toggleSelectionLock()
    return this
  }

  /**
   * 复制当前选区。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  duplicateSelection() {
    this.#actionButtons?.duplicateSelection()
    return this
  }

  /**
   * 删除当前选区。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  deleteSelection() {
    this.#actionButtons?.deleteSelection()
    return this
  }

  /**
   * 将当前多选节点组合为一个可编辑组。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  groupSelection() {
    this.#actionButtons?.groupSelection()
    return this
  }

  /**
   * 解散当前选中的组合节点。
   *
   * @returns {Editor} 当前编辑器实例。
   */
  ungroupSelection() {
    this.#actionButtons?.ungroupSelection()
    return this
  }

  /**
   * 获取当前选区的层级菜单项。
   *
   * @returns {Array<{ key: string, label: string, shortcut: string, disabled: boolean }>}
   * 层级菜单项。
   */
  getSelectionLayerActions() {
    return this.#actionButtons?.getSelectionLayerActions() ?? []
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
