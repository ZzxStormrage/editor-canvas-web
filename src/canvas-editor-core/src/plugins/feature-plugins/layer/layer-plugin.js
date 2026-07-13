import { ChildEvent, PropertyEvent } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'
import { getElementDataContainer } from '../../../utils/element-data.js'

const LAYER_EVENT = 'layers:changed'
const OBSERVED_PROPERTIES = new Set(['locked', 'name', 'customType', 'text'])

/**
 * 图层插件 —— 将 Leafer 场景树转换为稳定的图层列表 API。
 *
 * 插件负责场景树监听、排序、锁定、删除、选中和 hover；Vue 层只消费序列化
 * 后的图层 DTO，不直接操作 contentLayer，保持应用层到内核层的单向依赖。
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

    const orderedNodes = orderedIds.map((id) => this._nodes.get(String(id))).filter(Boolean).reverse()

    orderedNodes.forEach((node, index) => contentLayer.add(node, index))
    this._context.artboard?.syncAllElements?.()
    this._emitChanged()
    this._context.eventBus.emit('selection:layer-changed', {
      action: 'reorder',
      selected: this._context.innerEditor?.list ?? []
    })
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
   * 使用 @leafer-in/editor 原生 hover 轮廓高亮图层，不修改节点自身样式。
   *
   * @param {string | null} id 图层 ID；null 表示清除高亮。
   * @returns {void}
   */
  hover(id) {
    const innerEditor = this._context?.innerEditor

    if (innerEditor) {
      innerEditor.hoverTarget = id == null ? null : this._nodes.get(String(id)) ?? null
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
    this._nodes.clear()
    this._context = null
  }

  /** @private */
  _handleChildrenChanged() {
    this._syncNodeListeners()
    this._emitChanged()
  }

  /** @private */
  _handlePropertyChanged(event) {
    if (OBSERVED_PROPERTIES.has(event.attrName)) {
      this._emitChanged()
    }
  }

  /** @private */
  _syncNodeListeners() {
    const children = this._context?.contentLayer?.children ?? []
    const currentNodes = new Set(children)

    this._propertyEventIds.forEach((eventId, node) => {
      if (!currentNodes.has(node)) {
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

    if (publicId != null) {
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
    const customAttributes = elementData.attributes?.custom
    const customAttributeCount = this._isPlainObject(customAttributes) ? Object.keys(customAttributes).length : 0

    return {
      id: this._getNodeId(node),
      elementId: elementData.elementId,
      name: this._getNodeName(node),
      type: this._getNodeType(node),
      customAttributeCount,
      locked: Boolean(node.locked),
      selected,
      order: index
    }
  }

  /** @private */
  _isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  /** @private */
  _getNodeName(node) {
    if (node.name || node.customType) {
      return node.name || node.customType
    }

    if (this._getNodeType(node) === 'text') {
      const text = String(node.__canvasEditorRawText ?? node.text ?? '').replaceAll('\n', ' ').trim()

      return text ? text.slice(0, 18) : '文字'
    }

    return this._getNodeType(node) === 'image' ? '图片' : '图层'
  }

  /** @private */
  _getNodeType(node) {
    const tag = String(node.tag ?? node.constructor?.name ?? '').toLowerCase()

    if (tag.includes('text')) return 'text'
    if (tag.includes('image')) return 'image'
    if (tag.includes('rect')) return 'rect'
    return 'shape'
  }
}
