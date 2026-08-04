import { normalizeTextInputRules } from './text-input-rules.js'

/**
 * 根据模板文档和运行时目标生成图片文字定制页的输入项。
 *
 * 输入值优先读取统一文档中的原始文字，避免竖排节点的渲染换行进入表单。
 *
 * @param {Object | null} document 已加载的统一文档。
 * @param {Object[]} targets 运行时文字目标。
 * @param {{ pageId: string, separate?: boolean, textDescription?: string }} options 输入项配置。
 * @returns {Object[]} 与运行时目标顺序一致的输入项。
 */
export function createImageTextFields(document, targets, options) {
  if (!Array.isArray(targets) || targets.length === 0) {
    return []
  }

  const pageId = normalizeTextOption(options?.pageId, 'image-text')
  const textDescription = normalizeTextOption(options?.textDescription, '文本替换')
  const documentTargets = flattenElements(document?.elements).filter((element) => {
    return element.attributes?.text?.description === textDescription
  })
  const shouldSeparate = options?.separate === true && targets.length > 1
  const groups = shouldSeparate
    ? targets.map((target, index) => ({ targets: [target], indexes: [index] }))
    : [{ targets, indexes: targets.map((_target, index) => index) }]

  return groups.map((group, index) => {
    return createTextField(group, index, pageId, documentTargets, shouldSeparate)
  })
}

/**
 * 创建单个文字输入项。
 *
 * @param {{ targets: Object[], indexes: number[] }} group 运行时目标分组。
 * @param {number} index 输入项序号。
 * @param {string} pageId 页面标识。
 * @param {Object[]} documentTargets 文档文字目标。
 * @param {boolean} shouldSeparate 是否分开显示。
 * @returns {Object} 文字输入项。
 */
function createTextField(group, index, pageId, documentTargets, shouldSeparate) {
  const target = group.targets[0]
  const targetIndex = group.indexes[0]
  const documentTarget = documentTargets.find((element) => {
    return element.elementId === target?.elementId
  }) ?? documentTargets[targetIndex]

  return {
    key: String(target?.elementId ?? `text-${index + 1}`),
    inputId: `${pageId}-text-${index + 1}`,
    label: shouldSeparate ? `文本${index + 1}` : '',
    value: String(documentTarget?.text ?? target?.text ?? ''),
    rules: normalizeTextInputRules(documentTarget?.attributes?.textInput),
    targetIndexes: group.indexes
  }
}

/**
 * 递归展开统一文档元素。
 *
 * @param {Object[] | undefined} elements 文档元素。
 * @returns {Object[]} 展平后的元素。
 */
function flattenElements(elements) {
  if (!Array.isArray(elements)) {
    return []
  }

  return elements.flatMap((element) => [element, ...flattenElements(element.children)])
}

/**
 * 归一化文字配置值。
 *
 * @param {*} value 输入值。
 * @param {string} fallback 默认值。
 * @returns {string} 非空字符串。
 */
function normalizeTextOption(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
