import { customerCustomTemplateApi, customerPictureApi } from '../api/index.js'

/**
 * 保存 H5 用户设计。
 *
 * 保存前导出编辑器 JSON，并分别上传完整画板截图和打印区域截图。
 *
 * @param {Object} editor canvas-editor-core 编辑器实例。
 * @param {Object} options 保存配置。
 * @param {string | number} options.templateId 后台模板 ID。
 * @param {string} [options.designName] 用户设计名称。
 * @param {string | number | null} [options.partnerId] 分销商 ID。
 * @returns {Promise<{
 *   editorJson: Object,
 *   previewImgUrl: string,
 *   productImgUrl: string | null,
 *   dto: Object,
 *   response: *
 * }>} 用户设计保存结果。
 */
export async function saveH5CustomDesign(editor, options = {}) {
  assertEditor(editor)
  const templateId = normalizeTemplateId(options.templateId)
  const editorJson = editor.exportDocument()

  if (!editorJson) {
    throw new Error('无法获取当前画布 JSON。')
  }

  const previewImgUrl = await capturePreviewImage(editor)
  const productImgUrl = editor.getPrintAreaProperties()
    ? await captureProductImage(editor)
    : null
  const dto = createDesignDto({
    editorJson,
    templateId,
    designName: options.designName,
    previewImgUrl,
    productImgUrl
  })
  const response = await customerCustomTemplateApi.createDesign(dto, {
    partnerId: normalizeSingleValue(options.partnerId)
  })

  return {
    editorJson,
    previewImgUrl,
    productImgUrl,
    dto,
    response
  }
}

/** @param {Object} editor 编辑器实例。 @returns {Promise<string>} 完整画板截图地址。 */
function capturePreviewImage(editor) {
  return editor.captureCanvas({
    includeBackground: true,
    includeMask: true,
    type: 'image/png',
    quality: 1,
    upload: (file) => customerPictureApi.upload(file)
  })
}

/** @param {Object} editor 编辑器实例。 @returns {Promise<string>} 打印区域截图地址。 */
function captureProductImage(editor) {
  return editor.capturePrintArea({
    includeBackground: false,
    includeMask: false,
    type: 'image/png',
    quality: 1,
    upload: (file) => customerPictureApi.upload(file)
  })
}

/**
 * @param {Object} input DTO 输入。
 * @returns {Object} 接口 DTO。
 */
function createDesignDto(input) {
  return {
    content: JSON.stringify(input.editorJson),
    designName: normalizeOptionalText(input.designName),
    previewImgUrl: input.previewImgUrl,
    ...(input.productImgUrl ? { productImgUrl: input.productImgUrl } : {}),
    templateId: input.templateId
  }
}

/** @param {*} editor 输入值。 @returns {void} */
function assertEditor(editor) {
  if (!editor || typeof editor.exportDocument !== 'function') {
    throw new Error('画布尚未加载完成。')
  }
}

/** @param {*} value 模板 ID。 @returns {number} 正整数模板 ID。 */
function normalizeTemplateId(value) {
  const templateId = Number(Array.isArray(value) ? value[0] : value)

  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    throw new Error('模板 ID 必须是正整数。')
  }

  return templateId
}

/** @param {*} value 输入值。 @returns {string} 可选文本。 */
function normalizeOptionalText(value) {
  const text = normalizeSingleValue(value)
  return typeof text === 'string' ? text.trim() : ''
}

/** @param {*} value 输入值。 @returns {*} 单值。 */
function normalizeSingleValue(value) {
  return Array.isArray(value) ? value[0] : value
}
