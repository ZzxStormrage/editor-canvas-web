import { EditorError } from '../../../errors/editor-error.js'
import {
  ELEMENT_DATA_KEY,
  getElementDataContainer,
  normalizeElementAttributes
} from '../../../utils/element-data.js'

const DATA_CHANGED_EVENT = 'element-data:changed'

/**
 * 元素业务属性插件。
 *
 * 用独立命名空间保存 H5 所需业务数据，不修改 Leafer 渲染属性，也不参与现有
 * 文字、图片、选区和图层流程。Vue 组件应只调用本插件公开方法。
 */
export class ElementDataPlugin {
  constructor() {
    /** @private @type {Object | null} */
    this._context = null
  }

  /** @returns {string} 插件 ID。 */
  get id() {
    return 'elementData'
  }

  /** @returns {string} 插件名称。 */
  get name() {
    return 'ElementData'
  }

  /** @returns {string[]} 插件依赖。 */
  get dependencies() {
    return []
  }

  /** @param {Object} context 编辑器上下文。 */
  bootstrap(context) {
    this._context = context
  }

  /**
   * 获取元素业务属性快照。
   *
   * @param {Object} [target] Leafer 元素；省略时使用当前单选元素。
   * @returns {Object | null} 业务属性副本。
   */
  get(target) {
    const element = this._resolveTarget(target)
    const container = getElementDataContainer(element)

    return container ? normalizeElementAttributes(container.attributes) : null
  }

  /**
   * 获取元素稳定业务 ID。
   *
   * @param {Object} [target] Leafer 元素；省略时使用当前单选元素。
   * @returns {string | null} elementId。
   */
  getId(target) {
    const element = this._resolveTarget(target)
    return getElementDataContainer(element)?.elementId ?? null
  }

  /**
   * 按稳定 elementId 获取业务属性。
   *
   * @param {string} elementId 元素业务 ID。
   * @returns {Object | null} 业务属性快照。
   */
  getById(elementId) {
    const element = this._findById(elementId)
    return element ? this.get(element) : null
  }

  /**
   * 写入元素业务属性。
   *
   * 默认合并一层字段；replace=true 时整体替换。所有数据必须可以 JSON 序列化。
   *
   * @param {Object} target Leafer 元素；传 null 时使用当前单选元素。
   * @param {Object} attributes 业务属性。
   * @param {{ replace?: boolean }} [options={}] 写入选项。
   * @returns {Object} 更新后的业务属性副本。
   */
  set(target, attributes, options = {}) {
    const element = this._requireTarget(target)
    const container = getElementDataContainer(element, true)
    const normalized = normalizeElementAttributes(attributes)

    container.attributes = options.replace
      ? normalized
      : normalizeElementAttributes({ ...container.attributes, ...normalized })
    this._emitChanged(element, container)
    return normalizeElementAttributes(container.attributes)
  }

  /**
   * 给当前单选元素写入业务属性。
   *
   * @param {Object} attributes 业务属性。
   * @param {{ replace?: boolean }} [options={}] 写入选项。
   * @returns {Object} 更新后的业务属性。
   */
  setSelected(attributes, options = {}) {
    return this.set(null, attributes, options)
  }

  /**
   * 按稳定 elementId 写入业务属性。
   *
   * @param {string} elementId 元素业务 ID。
   * @param {Object} attributes 业务属性。
   * @param {{ replace?: boolean }} [options={}] 写入选项。
   * @returns {Object} 更新后的业务属性。
   */
  setById(elementId, attributes, options = {}) {
    return this.set(this._requireById(elementId), attributes, options)
  }

  /** @returns {Object | null} 当前单选元素的业务属性。 */
  getSelected() {
    return this.get()
  }

  /**
   * 删除一个或多个业务字段。
   *
   * @param {Object} target Leafer 元素；传 null 时使用当前单选元素。
   * @param {string | string[]} keys 字段名。
   * @returns {Object | null} 更新后的业务属性。
   */
  remove(target, keys) {
    const element = this._requireTarget(target)
    const container = getElementDataContainer(element)

    if (!container) {
      return null
    }

    const nextAttributes = { ...container.attributes }
    ;(Array.isArray(keys) ? keys : [keys]).forEach((key) => delete nextAttributes[key])
    container.attributes = nextAttributes
    this._emitChanged(element, container)
    return normalizeElementAttributes(container.attributes)
  }

  /**
   * 删除当前单选元素的业务字段。
   *
   * @param {string | string[]} keys 字段名。
   * @returns {Object | null} 更新后的业务属性。
   */
  removeSelected(keys) {
    return this.remove(null, keys)
  }

  /**
   * 清空元素全部业务属性，但保留稳定 elementId。
   *
   * @param {Object} [target] Leafer 元素；省略时使用当前单选元素。
   * @returns {void}
   */
  clear(target) {
    const element = this._requireTarget(target)
    const container = getElementDataContainer(element)

    if (container) {
      container.attributes = {}
      this._emitChanged(element, container)
    }
  }

  /** 清空当前单选元素的业务属性。 */
  clearSelected() {
    this.clear()
  }

  /**
   * 导出供 H5 消费的元素业务属性列表。
   *
   * 默认忽略未配置业务属性的元素，避免输出无意义数据。
   *
   * @param {{ includeEmpty?: boolean }} [options={}] 导出选项。
   * @returns {Array<{ elementId: string, type: string, attributes: Object }>} 导出记录。
   */
  export(options = {}) {
    return (this._context?.contentLayer?.children ?? []).flatMap((element) => {
      const container = getElementDataContainer(element)

      if (!container || (!options.includeEmpty && Object.keys(container.attributes).length === 0)) {
        return []
      }

      return [
        {
          elementId: container.elementId,
          type: this._getElementType(element),
          attributes: normalizeElementAttributes(container.attributes)
        }
      ]
    })
  }

  /** 清理插件引用。 */
  destroy() {
    this._context = null
  }

  /** @private */
  _resolveTarget(target) {
    if (target) {
      return target
    }

    const selected = this._context?.innerEditor?.list ?? []
    return selected.length === 1 ? selected[0] : null
  }

  /** @private */
  _requireTarget(target) {
    const element = this._resolveTarget(target)

    if (!element) {
      throw new EditorError('Element data requires one target element.', 'ELEMENT_DATA_TARGET_REQUIRED')
    }

    return element
  }

  /** @private */
  _findById(elementId) {
    return (this._context?.contentLayer?.children ?? []).find((element) => {
      return getElementDataContainer(element)?.elementId === elementId
    })
  }

  /** @private */
  _requireById(elementId) {
    const element = this._findById(elementId)

    if (!element) {
      throw new EditorError(`Element data target not found: ${elementId}`, 'ELEMENT_DATA_TARGET_NOT_FOUND')
    }

    return element
  }

  /** @private */
  _emitChanged(element, container) {
    this._context?.eventBus.emit(DATA_CHANGED_EVENT, {
      element,
      elementId: container.elementId,
      attributes: normalizeElementAttributes(container.attributes)
    })
  }

  /** @private */
  _getElementType(element) {
    return String(element?.customType ?? element?.tag ?? element?.constructor?.name ?? 'element')
  }
}

export { ELEMENT_DATA_KEY }
