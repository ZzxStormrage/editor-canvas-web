/**
 * 按业务属性生成带初始显隐状态的 H5 文档副本。
 *
 * 仅修改配置了指定属性路径的元素，背景图、遮罩图及普通元素保持模板状态。
 *
 * @param {Object | null} document 编辑器文档。
 * @param {string} path attributes 内的属性路径。
 * @param {*} value 初始显示值。
 * @returns {Object | null} 无共享引用的文档副本。
 */
export function createDocumentWithAttributeVisibility(document, path, value) {
  if (!document || typeof document !== 'object') {
    return null
  }

  const keys = normalizePath(path)
  const nextDocument = JSON.parse(JSON.stringify(document))
  if (keys.length === 0) {
    return nextDocument
  }

  visitElements(nextDocument.elements, (element) => {
    const currentValue = getValueByPath(element.attributes, keys)
    if (currentValue !== undefined) {
      element.visible = currentValue === value
    }
  })
  return nextDocument
}

/** @param {string} path 属性路径。 @returns {string[]} 路径字段。 */
function normalizePath(path) {
  return typeof path === 'string'
    ? path.split('.').map((key) => key.trim()).filter(Boolean)
    : []
}

/** @param {Object} source 属性对象。 @param {string[]} keys 路径字段。 @returns {*} 属性值。 */
function getValueByPath(source, keys) {
  return keys.reduce((current, key) => current?.[key], source)
}

/** @param {Object[]} elements 元素列表。 @param {(element: Object) => void} visitor 访问器。 @returns {void} */
function visitElements(elements, visitor) {
  const list = elements ?? []
  list.forEach((element) => {
    visitor(element)
    visitElements(element.children, visitor)
  })
}
