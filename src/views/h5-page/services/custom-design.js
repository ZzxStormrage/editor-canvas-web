import { customerPictureApi } from '../api/customer-picture.js'
import { customerTemplateApi } from '../api/customer-template.js'
import { readRouteTemplateId, readRouteValue } from './route-navigation.js'

/**
 * 保存 H5 用户设计。
 *
 * @param {Object} editor canvas-editor-core 编辑器实例。
 * @param {Object} options 保存配置。
 * @param {string | number} options.templateId 后台模板 ID。
 * @param {string} [options.designName] 用户设计名称。
 * @param {string | number | null} [options.partnerId] 分销商 ID。
 * @returns {Promise<Object>} 用户设计保存结果。
 */
export async function saveH5CustomDesign(editor, options = {}) {
  assertEditor(editor)
  const templateId = readRouteTemplateId(options.templateId)
  const editorJson = editor.exportDocument()

  if (!templateId) {
    throw new Error('模板 ID 必须是正整数。')
  }
  if (!editorJson) {
    throw new Error('无法获取当前画布 JSON。')
  }

  const previewImgUrl = await capturePreviewImage(editor)
  const productImgUrl = editor.getPrintAreaProperties()
    ? await captureProductImage(editor)
    : null
  const skuId = readRouteValue(options.skuId)
  const dto = {
    content: JSON.stringify(editorJson),
    designName: normalizeText(options.designName),
    previewImgUrl,
    ...(productImgUrl ? { productImgUrl } : {}),
    ...(skuId ? { skuId } : {}),
    templateId
  }
  const response = await customerTemplateApi.createDesign(dto, {
    partnerId: readRouteValue(options.partnerId)
  })

  return { editorJson, previewImgUrl, productImgUrl, dto, response }
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

/** @param {*} editor 输入值。 @returns {void} */
function assertEditor(editor) {
  if (!editor || typeof editor.exportDocument !== 'function') {
    throw new Error('画布尚未加载完成。')
  }
}

/** @param {*} value 输入值。 @returns {string} 文本。 */
function normalizeText(value) {
  const text = readRouteValue(value)
  return typeof text === 'string' ? text.trim() : ''
}
