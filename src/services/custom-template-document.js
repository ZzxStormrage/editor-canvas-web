import { customTemplateApi } from '../api/modules/custom-template.js'
import { parseEditorDocument } from '../canvas-editor-core/src/utils/editor-document.js'

/**
 * 根据模板 ID 获取并解析统一编辑器文档。
 *
 * @param {string | number} templateId 模板主键。
 * @param {{ partnerId?: string | number | null }} [options={}] 请求上下文。
 * @returns {Promise<{ record: Object, document: Object }>} 模板记录和规范化文档。
 */
export async function loadCustomTemplateDocument(templateId, options = {}) {
  const response = await customTemplateApi.detail(templateId, options)
  const record = resolveCustomTemplateRecord(response)

  if (!record) {
    throw new Error('模板详情接口未返回有效数据。')
  }

  if (record.content === undefined || record.content === null || record.content === '') {
    throw new Error('模板详情中没有可加载的 content。')
  }

  return {
    record,
    document: parseEditorDocument(record.content)
  }
}

/**
 * 从常见响应包装中提取模板记录。
 *
 * @param {*} value 服务端响应。
 * @param {number} [depth=0] 当前解包深度。
 * @returns {Object | null} 模板记录；未找到时返回 null。
 */
export function resolveCustomTemplateRecord(value, depth = 0) {
  if (!isPlainObject(value) || depth > 4) {
    return null
  }

  if (isTemplateRecord(value)) {
    return value
  }

  for (const key of ['data', 'result', 'body']) {
    const record = resolveCustomTemplateRecord(value[key], depth + 1)

    if (record) {
      return record
    }
  }

  return null
}

/** @param {*} value 待检查值。 @returns {boolean} 是否为模板记录。 */
function isTemplateRecord(value) {
  return (
    isPlainObject(value) &&
    (value.id !== undefined ||
      value.itemId !== undefined ||
      value.templateName !== undefined ||
      value.previewImgUrl !== undefined ||
      typeof value.content === 'string' ||
      isPlainObject(value.content))
  )
}

/** @param {*} value 待检查值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
