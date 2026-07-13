import { nanoid } from 'nanoid'

export const ELEMENT_DATA_KEY = '__eleEditorElementData'
export const ELEMENT_DATA_VERSION = 1

/**
 * 创建元素业务数据容器。
 *
 * elementId 由编辑器维护，attributes 才是业务方可编辑的数据，避免业务字段与
 * Leafer 的 fill、x、locked 等渲染属性发生命名冲突。
 *
 * @param {Object} [attributes={}] 初始业务属性。
 * @returns {{ version: number, elementId: string, attributes: Object }} 数据容器。
 */
export function createElementDataContainer(attributes = {}) {
  return {
    version: ELEMENT_DATA_VERSION,
    elementId: nanoid(),
    attributes: normalizeElementAttributes(attributes)
  }
}

/**
 * 读取并规范化节点上的元素业务数据。
 *
 * @param {Object} element Leafer 元素。
 * @param {boolean} [create=false] 不存在时是否创建容器。
 * @returns {{ version: number, elementId: string, attributes: Object } | null} 数据容器。
 */
export function getElementDataContainer(element, create = false) {
  if (!element || typeof element !== 'object') {
    return null
  }

  const current = element[ELEMENT_DATA_KEY]

  if (current?.elementId && isPlainObject(current.attributes)) {
    return current
  }

  if (!create) {
    return null
  }

  const container = createElementDataContainer(current?.attributes)
  element[ELEMENT_DATA_KEY] = container
  return container
}

/**
 * 深拷贝业务属性，并保证结果可安全 JSON 序列化。
 *
 * @param {Object} attributes 外部业务属性。
 * @returns {Object} 无引用共享的业务属性快照。
 * @throws {TypeError} 非普通对象、循环引用或不可序列化值会抛错。
 */
export function normalizeElementAttributes(attributes) {
  if (!isPlainObject(attributes)) {
    throw new TypeError('Element attributes must be a plain object.')
  }

  assertSerializable(attributes, new WeakSet())
  return JSON.parse(JSON.stringify(attributes))
}

/**
 * 复制业务属性到克隆元素，并生成新的 elementId。
 *
 * @param {Object} source 原元素。
 * @param {Object} target 克隆元素。
 * @returns {void}
 */
export function cloneElementData(source, target) {
  const sourceContainer = getElementDataContainer(source)

  if (sourceContainer && target) {
    target[ELEMENT_DATA_KEY] = createElementDataContainer(sourceContainer.attributes)
  }
}

/** @param {*} value 待判断值。 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * @param {*} value 当前值。
 * @param {WeakSet<Object>} ancestors 当前递归路径。
 * @returns {void}
 */
function assertSerializable(value, ancestors) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError('Element attributes cannot contain non-finite numbers.')
    }
    return
  }

  if (typeof value !== 'object') {
    throw new TypeError(`Element attributes cannot contain ${typeof value} values.`)
  }

  if (ancestors.has(value)) {
    throw new TypeError('Element attributes cannot contain circular references.')
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    throw new TypeError('Element attributes can only contain plain objects and arrays.')
  }

  ancestors.add(value)
  Object.entries(value).forEach(([key, child]) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new TypeError(`Element attribute key is not allowed: ${key}`)
    }
    assertSerializable(child, ancestors)
  })
  ancestors.delete(value)
}
