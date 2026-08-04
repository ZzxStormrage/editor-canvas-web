import { ChildEvent, PropertyEvent } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'
import { EditorError } from '../../../errors/editor-error.js'
import { getElementDataContainer } from '../../../utils/element-data.js'
import { normalizeTextLayout } from '../../../utils/text-layout.js'

const LAYER_EVENT = 'layers:changed'
const OBSERVED_PROPERTIES = new Set([
  'locked',
  'hittable',
  'visible',
  'hitSelf',
  'hitChildren',
  'name',
  'customType',
  'text',
  'url',
  'fill'
])
const IMAGE_ROLES = new Set(['background', 'mask', 'ai-variable'])
const THUMBNAIL_STABLE_PROPERTIES = new Set([
  'x',
  'y',
  'scaleX',
  'scaleY',
  'locked',
  'visible',
  'hittable',
  'hitSelf',
  'hitChildren',
  'name',
  'customType',
  'draggable',
  'editable'
])
const DEFAULT_THUMBNAIL_SIZE = 80
const THUMBNAIL_CHANGE_DELAY = 120

/**
 * 图层插件 —— 将 Leafer 场景树转换为稳定的图层列表 API。
 *
 * 插件负责场景树监听、排序、锁定、删除、选中和 hover；外部视图层只消费
 * 序列化图层 DTO，不直接操作 contentLayer，保持应用层到内核层的单向依赖。
 */
export class LayerPlugin {
  constructor() {
    /** @private @type {Object | null} */
    this._context = null
    /** @private @type {Map<string, Object>} */
    this._nodes = new Map()
    /** @private @type {WeakMap<Object, string>} */
    this._nodeIds = new WeakMap()
    /** @private @type {number} */
    this._nextNodeId = 1
    /** @private @type {Map<Object, string | string[]>} */
    this._propertyEventIds = new Map()
    /** @private @type {Array<{ target: Object, eventId: string | string[] }>} */
    this._eventBindings = []
    /** @private @type {Function | null} */
    this._unsubscribeElementDataChanged = null
    /** @private @type {WeakMap<Object, number>} */
    this._thumbnailVersions = new WeakMap()
    /** @private @type {Map<string, { version: number, maxSize: number, source: string }>} */
    this._thumbnailCache = new Map()
    /** @private @type {Map<string, Promise<string | null>>} */
    this._thumbnailTasks = new Map()
    /** @private @type {ReturnType<typeof setTimeout> | null} */
    this._thumbnailChangeTimer = null
    /** @private @type {Set<string>} 被手动置顶锁定、需始终保持在最上层的图层 ID。 */
    this._pinnedTopIds = new Set()
    /** @private @type {boolean} 是否正在执行 reorder，用于防止 _restorePinnedOrder 循环。 */
    this._isReordering = false
  }

  /** @returns {string} 插件 ID。 */
  get id() {
    return 'layer'
  }

  /** @returns {string} 插件名称。 */
  get name() {
    return 'Layer'
  }

  /** @returns {string[]} 插件依赖。 */
  get dependencies() {
    return []
  }

  /**
   * 监听内容层结构、节点属性和编辑器选区变化。
   *
   * @param {Object} context 编辑器上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this._context = context
    this._syncNodeListeners()
    this._eventBindings = [
      {
        target: context.contentLayer,
        eventId: context.contentLayer.on_(ChildEvent.ADD, this._handleChildrenChanged, this)
      },
      {
        target: context.contentLayer,
        eventId: context.contentLayer.on_(ChildEvent.REMOVE, this._handleChildrenChanged, this)
      },
      {
        target: context.innerEditor,
        eventId: context.innerEditor?.on_(EditorEvent.SELECT, this._emitChanged, this)
      }
    ].filter((binding) => binding.target && binding.eventId)
    this._unsubscribeElementDataChanged = context.eventBus.on('element-data:changed', this._emitChanged.bind(this))
    this._emitChanged()
  }

  /** @returns {Array<Object>} 从视觉最上层到最下层排列的图层 DTO。 */
  getList() {
    const selected = new Set(this._context?.innerEditor?.list ?? [])

    return [...(this._context?.contentLayer?.children ?? [])]
      .reverse()
      .map((node, index) => this._toLayerItem(node, index, selected.has(node)))
  }

  /**
   * 按需获取图层真实缩略图。图片直接复用原资源，其余节点导出为受控尺寸的 Blob URL。
   *
   * @param {string} id 图层 ID。
   * @param {{ maxSize?: number }} [options={}] 缩略图配置。
   * @returns {Promise<string | null>} 可直接用于 img.src 的缩略图地址。
   * @throws {EditorError} 当 Leafer 导出失败时抛出。
   */
  async getThumbnail(id, options = {}) {
    const layerId = String(id)
    const node = this._nodes.get(layerId)

    if (!node) {
      return null
    }

    if (this._getNodeType(node) === 'image') {
      return this._getImageThumbnailSource(node)
    }

    const maxSize = this._normalizeThumbnailSize(options.maxSize)
    const version = this._getThumbnailVersion(node)
    const cached = this._thumbnailCache.get(layerId)

    if (cached?.version === version && cached.maxSize === maxSize) {
      return cached.source
    }

    const taskKey = `${layerId}:${version}:${maxSize}`
    const activeTask = this._thumbnailTasks.get(taskKey)

    if (activeTask) {
      return await activeTask
    }

    const task = this._exportThumbnail(node, layerId, version, maxSize)
    this._thumbnailTasks.set(taskKey, task)

    try {
      return await task
    } finally {
      this._thumbnailTasks.delete(taskKey)
    }
  }

  /**
   * 根据面板中的从上到下顺序更新场景树 z-index。
   *
   * @param {string[]} orderedIds 图层 ID 列表。
   * @returns {void}
   */
  reorder(orderedIds) {
    const contentLayer = this._context?.contentLayer

    if (!contentLayer || !Array.isArray(orderedIds)) {
      return
    }

    this._isReordering = true

    const orderedNodes = orderedIds.map((id) => this._nodes.get(String(id))).filter(Boolean).reverse()

    orderedNodes.forEach((node, index) => contentLayer.add(node, index))
    this._context.artboard?.syncAllElements?.()

    // 更新置顶锁定：最上层元素（orderedIds[0]）在重排后自动锁定，其余解锁。
    this._pinnedTopIds.clear()
    const topId = orderedIds[0]
    if (topId) {
      this._pinnedTopIds.add(String(topId))
    }

    this._isReordering = false
    this._emitChanged()
    this._context.eventBus.emit('selection:layer-changed', {
      action: 'reorder',
      selected: this._context.innerEditor?.list ?? []
    })
  }

  /**
   * 按业务 role 将顶层元素移动到最底层或最顶层。
   *
   * 未命中的普通图层保持原始相对顺序，适合调用方在无损加载后显式应用展示策略。
   *
   * @param {{ back?: string[], front?: string[] }} [options={}] role 排列配置。
   * @returns {void}
   */
  arrangeByRole(options = {}) {
    const contentLayer = this._context?.contentLayer
    const backRoles = new Set(this._normalizeRoleList(options.back))
    const frontRoles = new Set(this._normalizeRoleList(options.front))
    const backNodes = []
    const middleNodes = []
    const frontNodes = []

    ;(contentLayer?.children ?? []).forEach((node) => {
      const role = this._getImageRole(getElementDataContainer(node)?.attributes)

      if (backRoles.has(role)) {
        backNodes.push(node)
      } else if (frontRoles.has(role)) {
        frontNodes.push(node)
      } else {
        middleNodes.push(node)
      }
    })

    ;[...backNodes, ...middleNodes, ...frontNodes].forEach((node, index) => contentLayer?.add(node, index))
    this._context.artboard?.syncAllElements?.()
    this._emitChanged()
  }

  /** @param {string} id 图层 ID。 */
  select(id) {
    const node = this._nodes.get(String(id))

    if (node) {
      this._context?.innerEditor?.select(node)
    }
  }

  /** @param {string} id 图层 ID。 */
  remove(id) {
    const node = this._nodes.get(String(id))
    const innerEditor = this._context?.innerEditor

    if (!node) {
      return
    }

    if (innerEditor?.hoverTarget === node) {
      innerEditor.hoverTarget = null
    }

    if (innerEditor?.hasItem?.(node)) {
      innerEditor.cancel()
    } else {
      innerEditor?.removeItem?.(node)
    }

    node.remove()
    this._context?.artboard?.syncAllElements?.()
    this._context?.eventBus.emit('selection:deleted', { targets: [node] })
    this._syncNodeListeners()
    this._emitChanged()
  }

  /** @param {string} id 图层 ID。 */
  toggleLock(id) {
    const node = this._nodes.get(String(id))
    const innerEditor = this._context?.innerEditor

    if (!node) {
      return
    }

    node.locked = !node.locked

    if (node.locked && innerEditor?.hasItem?.(node)) {
      innerEditor.cancel()
    }

    innerEditor?.update?.()
    this._emitChanged()
  }

  /**
   * 切换图层可见性，隐藏时保留图层位置、顺序和业务属性。
   *
   * @param {string} id 图层 ID。
   * @returns {void}
   */
  toggleVisibility(id) {
    const node = this._nodes.get(String(id))
    const innerEditor = this._context?.innerEditor

    if (!node) {
      return
    }

    node.visible = node.visible === false

    if (!node.visible) {
      if (innerEditor?.hoverTarget === node) {
        innerEditor.hoverTarget = null
      }
      if (innerEditor?.hasItem?.(node)) {
        innerEditor.cancel()
      }
    }

    node.forceUpdate?.()
    innerEditor?.update?.()
    this._context?.artboard?.syncAllElements?.()
    this._context?.eventBus.emit('element:visibility-changed', {
      elements: [node],
      visible: node.visible !== false
    })
    this._emitChanged()
  }

  /**
   * 切换图片节点的点击穿透状态，只修改命中能力，不改变锁定状态和图层顺序。
   *
   * @param {string} id 图层 ID。
   * @returns {void}
   */
  togglePointerThrough(id) {
    const node = this._nodes.get(String(id))
    const innerEditor = this._context?.innerEditor

    if (!node || this._getNodeType(node) !== 'image') {
      return
    }

    const pointerThrough = this._isPointerThrough(node)
    node.set?.({
      hittable: pointerThrough,
      hitSelf: pointerThrough,
      hitChildren: pointerThrough
    })

    if (!node.hittable) {
      if (innerEditor?.hoverTarget === node) {
        innerEditor.hoverTarget = null
      }
      if (innerEditor?.hasItem?.(node)) {
        innerEditor.cancel()
      }
    }

    node.forceUpdate?.()
    innerEditor?.update?.()
    this._emitChanged()
  }

  /**
   * 使用 @leafer-in/editor 原生 hover 轮廓高亮图层，不修改节点自身样式。
   *
   * @param {string | null} id 图层 ID；null 表示清除高亮。
   * @returns {void}
   */
  hover(id) {
    const innerEditor = this._context?.innerEditor

    if (innerEditor) {
      innerEditor.hoverTarget = id === null || id === undefined ? null : this._nodes.get(String(id)) ?? null
    }
  }

  /** 解绑全部 Leafer 事件。 */
  destroy() {
    this._eventBindings.forEach(({ target, eventId }) => target.off_(eventId))
    this._eventBindings = []
    this._propertyEventIds.forEach((eventId, node) => node.off_(eventId))
    this._propertyEventIds.clear()
    this._unsubscribeElementDataChanged?.()
    this._unsubscribeElementDataChanged = null
    if (this._thumbnailChangeTimer) {
      clearTimeout(this._thumbnailChangeTimer)
      this._thumbnailChangeTimer = null
    }
    this._thumbnailCache.forEach(({ source }) => URL.revokeObjectURL(source))
    this._thumbnailCache.clear()
    this._thumbnailTasks.clear()
    this._nodes.clear()
    this._pinnedTopIds.clear()
    this._context = null
  }

  /** @private */
  _handleChildrenChanged() {
    this._syncNodeListeners()
    this._emitChanged()
    if (!this._isReordering) {
      this._restorePinnedOrder()
    }
  }

  /**
   * 将已锁定的置顶层重新移到 children 末尾（视觉最上层）。
   *
   * @private
   * @returns {void}
   */
  _restorePinnedOrder() {
    if (this._pinnedTopIds.size === 0) {
      return
    }

    const contentLayer = this._context?.contentLayer
    if (!contentLayer || !contentLayer.children?.length) {
      return
    }

    const children = contentLayer.children
    let needsRestore = false

    for (const pinnedId of this._pinnedTopIds) {
      const node = this._nodes.get(pinnedId)
      if (node && children[children.length - 1] !== node) {
        needsRestore = true
        break
      }
    }

    if (!needsRestore) {
      return
    }

    // 将锁定节点移动到 children 末尾（视觉最上层），其余保持相对顺序。
    for (const pinnedId of this._pinnedTopIds) {
      const node = this._nodes.get(pinnedId)
      if (node) {
        const idx = children.indexOf(node)
        if (idx >= 0 && idx < children.length - 1) {
          contentLayer.add(node)
        }
      }
    }

    this._context?.artboard?.syncAllElements?.()
    this._emitChanged()
  }

  /** @private */
  _handlePropertyChanged(event) {
    const layerNode = this._resolveLayerNode(event.target)
    const thumbnailChanged = layerNode && this._shouldInvalidateThumbnail(event, layerNode)

    if (thumbnailChanged) {
      this._invalidateThumbnail(layerNode)
    }

    if (OBSERVED_PROPERTIES.has(event.attrName)) {
      this._emitChanged()
    } else if (thumbnailChanged) {
      this._scheduleThumbnailChanged()
    }
  }

  /** @private */
  _syncNodeListeners() {
    const children = this._context?.contentLayer?.children ?? []
    const currentNodes = new Set(children)

    this._propertyEventIds.forEach((eventId, node) => {
      if (!currentNodes.has(node)) {
        this._clearThumbnailCache(this._getNodeId(node))
        node.off_(eventId)
        this._propertyEventIds.delete(node)
      }
    })

    this._nodes.clear()
    children.forEach((node) => {
      const id = this._getNodeId(node)

      this._nodes.set(id, node)
      if (!this._propertyEventIds.has(node)) {
        this._propertyEventIds.set(node, node.on_(PropertyEvent.CHANGE, this._handlePropertyChanged, this))
      }
    })
  }

  /** @private */
  _emitChanged() {
    this._context?.eventBus.emit(LAYER_EVENT, { layers: this.getList() })
  }

  /** @private */
  _getNodeId(node) {
    const publicId = node.innerId ?? node.id

    if (publicId !== null && publicId !== undefined) {
      return String(publicId)
    }

    if (!this._nodeIds.has(node)) {
      this._nodeIds.set(node, `layer-${this._nextNodeId}`)
      this._nextNodeId += 1
    }

    return this._nodeIds.get(node)
  }

  /** @private */
  _toLayerItem(node, index, selected) {
    const elementData = getElementDataContainer(node, true)
    const customAttributeCount = this._getConfiguredAttributeCount(elementData.attributes)
    const type = this._getNodeType(node)

    return {
      id: this._getNodeId(node),
      elementId: elementData.elementId,
      name: this._getNodeName(node),
      type,
      previewText: type === 'text' ? this._getTextPreview(node) : '',
      thumbnailSource: type === 'image' ? this._getImageThumbnailSource(node) : null,
      thumbnailVersion: this._getThumbnailVersion(node),
      imageRole: type === 'image' ? this._getImageRole(elementData.attributes) : null,
      textLayoutMode: type === 'text' ? this._getTextLayoutMode(elementData.attributes) : null,
      customAttributeCount,
      locked: Boolean(node.locked),
      visible: node.visible !== false,
      pointerThrough: type === 'image' && this._isPointerThrough(node),
      selected,
      order: index
    }
  }

  /** @private */
  _getConfiguredAttributeCount(attributes = {}) {
    let count = 0

    if (typeof attributes.image?.description === 'string' && attributes.image.description.trim()) {
      count += 1
    }

    if (this._getImageRole(attributes)) {
      count += 1
    }

    if (typeof attributes.text?.description === 'string' && attributes.text.description.trim()) {
      count += 1
    }

    // 文本规则可以暂存但关闭；只有启用后才计入已配置属性。
    if (this._isPlainObject(attributes.textInput) && attributes.textInput.enabled === true) {
      count += 1
    }

    if (this._getTextLayoutMode(attributes)) {
      count += 1
    }

    if (this._isPlainObject(attributes.custom)) {
      count += Object.keys(attributes.custom).length
    }

    return count
  }

  /**
   * 规范化 role 列表。
   *
   * @private
   * @param {*} roles role 输入。
   * @returns {string[]} 非空 role。
   */
  _normalizeRoleList(roles) {
    return Array.isArray(roles)
      ? roles.filter((role) => typeof role === 'string' && role.trim()).map((role) => role.trim())
      : []
  }

  /** @private */
  _isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  /** @private */
  _getImageRole(attributes = {}) {
    return IMAGE_ROLES.has(attributes.image?.role) ? attributes.image.role : null
  }

  /** @private @param {Object} attributes 元素属性。 @returns {string | null} 文本显示模式。 */
  _getTextLayoutMode(attributes = {}) {
    if (
      attributes.textInput?.enabled === true
      && attributes.textInput.singleVerticalLine === true
    ) {
      return 'vertical'
    }
    const layout = normalizeTextLayout(attributes.textLayout)
    return layout.mode === 'single-line' || layout.mode === 'vertical' ? layout.mode : null
  }

  /** @private */
  _isPointerThrough(node) {
    return node.hittable === false || node.hitSelf === false || node.hitChildren === false
  }

  /** @private */
  _getNodeName(node) {
    if (node.name || node.customType) {
      return node.name || node.customType
    }

    if (this._getNodeType(node) === 'text') {
      const text = this._getTextPreview(node)

      return text ? text.slice(0, 18) : '文字'
    }

    return this._getNodeType(node) === 'image' ? '图片' : '图层'
  }

  /**
   * @private
   * @param {Object} node Leafer 文本节点。
   * @returns {string} 归一化后的短文本预览。
   */
  _getTextPreview(node) {
    return String(node.__canvasEditorRawText ?? node.text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40)
  }

  /**
   * @private
   * @param {Object} node Leafer 图片节点。
   * @returns {string | null} 可直接复用的图片地址。
   */
  _getImageThumbnailSource(node) {
    const originalSource = this._context?.pluginManager?.get('image')?.getSource?.(node)
    if (originalSource) {
      return originalSource
    }

    const inputFill = node.__?.__input?.fill
    const imagePaint = Array.isArray(inputFill) ? inputFill[0] : inputFill
    const source = node.url ?? imagePaint?.url
    return typeof source === 'string' && source ? source : null
  }

  /**
   * @private
   * @param {Object} node Leafer 图层节点。
   * @param {string} layerId 图层 ID。
   * @param {number} version 开始导出时的视觉版本。
   * @param {number} maxSize 缩略图最大边长。
   * @returns {Promise<string | null>} 生成的 Blob URL；节点已变化时返回 null。
   * @throws {EditorError} 当 Leafer 导出失败时抛出。
   */
  async _exportThumbnail(node, layerId, version, maxSize) {
    try {
      await import('@leafer-in/export')
      const result = await node.export('png', {
        blob: true,
        size: this._getThumbnailExportSize(node, maxSize),
        pixelRatio: 1,
        trim: true,
        padding: 2
      })

      if (result.error || !(result.data instanceof Blob)) {
        throw result.error ?? new Error('图层缩略图没有生成有效图片。')
      }

      if (this._nodes.get(layerId) !== node || this._getThumbnailVersion(node) !== version) {
        return null
      }

      const source = URL.createObjectURL(result.data)
      this._clearThumbnailCache(layerId)
      this._thumbnailCache.set(layerId, { version, maxSize, source })
      return source
    } catch (error) {
      if (error instanceof EditorError) {
        throw error
      }
      throw new EditorError(error.message || '生成图层缩略图失败。', 'LAYER_THUMBNAIL_EXPORT_FAILED')
    }
  }

  /**
   * @private
   * @param {Object} node Leafer 图层节点。
   * @param {number} maxSize 缩略图最大边长。
   * @returns {{ width?: number, height?: number }} 保持宽高比的 Leafer 导出尺寸。
   */
  _getThumbnailExportSize(node, maxSize) {
    const bounds = node.getBounds?.('render', 'local') ?? { width: 1, height: 1 }
    return bounds.width >= bounds.height ? { width: maxSize } : { height: maxSize }
  }

  /**
   * @private
   * @param {number | undefined} value 缩略图最大边长。
   * @returns {number} 限制后的最大边长。
   */
  _normalizeThumbnailSize(value) {
    const size = Number(value)
    return Number.isFinite(size) ? Math.min(160, Math.max(40, Math.round(size))) : DEFAULT_THUMBNAIL_SIZE
  }

  /**
   * @private
   * @param {Object} node Leafer 图层节点。
   * @returns {number} 当前视觉版本。
   */
  _getThumbnailVersion(node) {
    return this._thumbnailVersions.get(node) ?? 0
  }

  /**
   * @private
   * @param {Object} node Leafer 图层节点。
   * @returns {void}
   */
  _invalidateThumbnail(node) {
    this._thumbnailVersions.set(node, this._getThumbnailVersion(node) + 1)
  }

  /**
   * @private
   * @param {PropertyEvent} event Leafer 属性变化事件。
   * @param {Object} layerNode 顶层图层节点。
   * @returns {boolean} 是否需要失效真实缩略图。
   */
  _shouldInvalidateThumbnail(event, layerNode) {
    return event.target !== layerNode || !THUMBNAIL_STABLE_PROPERTIES.has(event.attrName)
  }

  /**
   * @private
   * @param {Object} target 发生属性变化的 Leafer 节点。
   * @returns {Object | null} 所属顶层图层节点。
   */
  _resolveLayerNode(target) {
    const contentLayer = this._context?.contentLayer
    let node = target

    while (node?.parent && node.parent !== contentLayer) {
      node = node.parent
    }

    return node?.parent === contentLayer ? node : null
  }

  /** @private @returns {void} */
  _scheduleThumbnailChanged() {
    if (this._thumbnailChangeTimer) {
      clearTimeout(this._thumbnailChangeTimer)
    }

    this._thumbnailChangeTimer = setTimeout(() => {
      this._thumbnailChangeTimer = null
      this._emitChanged()
    }, THUMBNAIL_CHANGE_DELAY)
  }

  /**
   * @private
   * @param {string} layerId 图层 ID。
   * @returns {void}
   */
  _clearThumbnailCache(layerId) {
    const cached = this._thumbnailCache.get(layerId)

    if (cached) {
      URL.revokeObjectURL(cached.source)
      this._thumbnailCache.delete(layerId)
    }
  }

  /** @private */
  _getNodeType(node) {
    const tag = String(node.tag ?? node.constructor?.name ?? '').toLowerCase()

    if (node.isBranch || tag.includes('group')) return 'group'
    if (tag.includes('text')) return 'text'
    if (tag.includes('image')) return 'image'
    if (tag.includes('rect')) return 'rect'
    return 'shape'
  }
}
