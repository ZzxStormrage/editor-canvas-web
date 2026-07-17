import { customerXiaoxiangClient } from '../clients/customer-xiaoxiang-client.js'
import { createCustomTemplateApi } from './custom-template.js'

const CUSTOMER_CUSTOM_TEMPLATE_ENDPOINT =
  import.meta.env?.VITE_CUSTOMER_CUSTOM_TEMPLATE_API_PATH || '/customer/api/customTemplate'

const customerTemplateApi = createCustomTemplateApi(
  CUSTOMER_CUSTOM_TEMPLATE_ENDPOINT,
  'customerCustomTemplate',
  customerXiaoxiangClient
)

/** H5 生产页面使用的客户侧模板接口。 */
export const customerCustomTemplateApi = Object.freeze({
  ...customerTemplateApi,

  /**
   * 基于后台模板保存一条用户自己的设计。
   *
   * @param {Object} dto 用户设计 DTO。
   * @param {Object} [options={}] 请求上下文。
   * @returns {import('alova').Method} 保存请求。
   */
  createDesign(dto, options = {}) {
    return customerTemplateApi.create(assertCustomerDesignDto(dto), options)
  }
})

/**
 * 校验用户设计保存参数。
 *
 * @param {*} dto 原始 DTO。
 * @returns {Object} 规范化 DTO。
 */
function assertCustomerDesignDto(dto) {
  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    throw new TypeError('customerCustomTemplate.createDesign(dto) requires an object.')
  }

  const templateId = Number(dto.templateId)
  if (!Number.isSafeInteger(templateId) || templateId <= 0) {
    throw new TypeError('customerCustomTemplate.templateId must be a positive integer.')
  }

  if (typeof dto.content !== 'string' || !dto.content.trim()) {
    throw new TypeError('customerCustomTemplate.content must be a JSON string.')
  }

  assertOptionalString(dto.designName, 'designName')
  assertOptionalString(dto.previewImgUrl, 'previewImgUrl')
  assertOptionalString(dto.productImgUrl, 'productImgUrl')
  return { ...dto, templateId }
}

/** @param {*} value 输入值。 @param {string} key 字段名。 @returns {void} */
function assertOptionalString(value, key) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new TypeError(`customerCustomTemplate.${key} must be a string.`)
  }
}
