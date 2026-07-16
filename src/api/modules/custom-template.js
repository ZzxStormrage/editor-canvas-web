import { xiaoxiangClient } from '../clients/xiaoxiang-client.js'

const CUSTOM_TEMPLATE_ENDPOINT = import.meta.env?.VITE_CUSTOM_TEMPLATE_API_PATH || '/admin/api/customTemplate'

/**
 * 自定义模板设计接口模块。
 */
export const customTemplateApi = Object.freeze({
  /**
   * 查询自定义模板列表。
   *
   * @param {Object} [params={}] Swagger 定义的列表查询参数。
   * @param {{ partnerId?: string | number | null }} [options={}] 请求上下文。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  list(params = {}, options = {}) {
    return xiaoxiangClient.Get(CUSTOM_TEMPLATE_ENDPOINT, {
      name: 'customTemplate.list',
      params: normalizeQueryParams(params),
      headers: createRequestHeaders(options)
    })
  },

  /**
   * 查询自定义模板详情。
   *
   * @param {string | number} id 模板 ID。
   * @param {{ partnerId?: string | number | null }} [options={}] 请求上下文。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  detail(id, options = {}) {
    return xiaoxiangClient.Get(createDetailURL(id), {
      name: 'customTemplate.detail',
      headers: createRequestHeaders(options)
    })
  },

  /**
   * 新增自定义模板。
   *
   * @param {Object} dto 模板保存 DTO。
   * @param {{ partnerId?: string | number | null }} [options={}] 请求上下文。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  create(dto, options = {}) {
    return xiaoxiangClient.Post(CUSTOM_TEMPLATE_ENDPOINT, assertTemplateDto(dto), {
      name: 'customTemplate.create',
      headers: createRequestHeaders(options)
    })
  },

  /**
   * 修改自定义模板。
   *
   * @param {Object} dto 必须包含 id 的模板保存 DTO。
   * @param {{ partnerId?: string | number | null }} [options={}] 请求上下文。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  update(dto, options = {}) {
    const payload = assertTemplateDto(dto)
    normalizePositiveInteger(payload.id, 'customTemplate.id')

    return xiaoxiangClient.Put(CUSTOM_TEMPLATE_ENDPOINT, payload, {
      name: 'customTemplate.update',
      headers: createRequestHeaders(options)
    })
  }
})

/**
 * 创建详情请求地址。
 *
 * @param {string | number} id 模板 ID。
 * @returns {string} 详情地址。
 */
function createDetailURL(id) {
  return `${CUSTOM_TEMPLATE_ENDPOINT}/${normalizePositiveInteger(id, 'customTemplate.id')}`
}

/**
 * 创建可选分销商请求头。
 *
 * @param {{ partnerId?: string | number | null }} options 请求上下文。
 * @returns {Object} 请求头。
 */
function createRequestHeaders(options = {}) {
  const partnerId = options.partnerId

  if (partnerId === undefined || partnerId === null || partnerId === '') {
    return {}
  }

  return {
    'X-Partner-Id': normalizePositiveInteger(partnerId, 'X-Partner-Id')
  }
}

/**
 * 删除未设置的查询参数。
 *
 * @param {Object} params 原始查询参数。
 * @returns {Object} 可发送的查询参数。
 */
function normalizeQueryParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('customTemplate.list(params) requires an object.')
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

/**
 * 校验模板保存 DTO。
 *
 * @param {Object} dto 模板 DTO。
 * @returns {Object} 原 DTO。
 */
function assertTemplateDto(dto) {
  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    throw new TypeError('Custom template dto must be an object.')
  }

  if (typeof dto.content !== 'string') {
    throw new TypeError('Custom template dto.content must be a JSON string.')
  }

  return dto
}

/**
 * 将 ID 归一化为正整数。
 *
 * @param {string | number} value 原始 ID。
 * @param {string} name 参数名。
 * @returns {number} 正整数 ID。
 */
function normalizePositiveInteger(value, name) {
  const number = Number(value)

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${name} must be a positive integer.`)
  }

  return number
}
