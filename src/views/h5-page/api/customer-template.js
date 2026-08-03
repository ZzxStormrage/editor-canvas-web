import { createCustomTemplateApi } from '../../../api/modules/custom-template.js'
import { customerClient } from './customer-client.js'

const CUSTOMER_TEMPLATE_ENDPOINT =
  import.meta.env?.VITE_CUSTOMER_CUSTOM_TEMPLATE_API_PATH || '/customer/api/customTemplate'
const templateApi = createCustomTemplateApi(
  CUSTOMER_TEMPLATE_ENDPOINT,
  'customerCustomTemplate',
  customerClient
)

/** H5 生产页面使用的客户侧模板接口。 */
export const customerTemplateApi = Object.freeze({
  ...templateApi,

  /**
   * 基于后台模板保存一条用户自己的设计。
   *
   * @param {Object} dto 用户设计 DTO。
   * @param {Object} [options={}] 请求上下文。
   * @returns {import('alova').Method} 保存请求。
   */
  createDesign(dto, options = {}) {
    return templateApi.create(assertCustomerDesignDto(dto), options)
  }
})

/** @param {*} dto 原始 DTO。 @returns {Object} 规范化 DTO。 */
function assertCustomerDesignDto(dto) {
  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    throw new TypeError('customerTemplate.createDesign(dto) requires an object.')
  }

  const templateId = Number(dto.templateId)
  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    throw new TypeError('customerTemplate.templateId must be a positive integer.')
  }
  if (typeof dto.content !== 'string' || !dto.content.trim()) {
    throw new TypeError('customerTemplate.content must be a JSON string.')
  }

  assertOptionalString(dto.designName, 'designName')
  assertOptionalString(dto.previewImgUrl, 'previewImgUrl')
  assertOptionalString(dto.productImgUrl, 'productImgUrl')
  assertOptionalString(dto.skuId, 'skuId')
  return { ...dto, templateId }
}

/** @param {*} value 输入值。 @param {string} key 字段名。 @returns {void} */
function assertOptionalString(value, key) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new TypeError(`customerTemplate.${key} must be a string.`)
  }
}
