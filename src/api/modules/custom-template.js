import { xiaoxiangClient } from '../clients/xiaoxiang-client.js'

const CUSTOM_TEMPLATE_ENDPOINT = import.meta.env?.VITE_CUSTOM_TEMPLATE_API_PATH || '/admin/api/customTemplate'

/**
 * 自定义模板设计接口模块。
 */
export const customTemplateApi = createCustomTemplateApi(CUSTOM_TEMPLATE_ENDPOINT)

/**
 * 创建指定业务前缀的自定义模板接口模块。
 *
 * @param {string} endpoint 接口路径。
 * @param {string} [namePrefix='customTemplate'] Alova 方法名前缀。
 * @returns {Object} 自定义模板接口。
 */
export function createCustomTemplateApi(endpoint, namePrefix = 'customTemplate') {
  const apiEndpoint = normalizeEndpoint(endpoint)

  return Object.freeze({
    /** @param {Object} [params={}] 查询参数。 @param {Object} [options={}] 请求上下文。 @returns {import('alova').Method} */
    list(params = {}, options = {}) {
      return xiaoxiangClient.Get(apiEndpoint, {
        name: `${namePrefix}.list`,
        params: normalizeQueryParams(params),
        headers: createRequestHeaders(options)
      })
    },

    /** @param {string | number} id 模板 ID。 @param {Object} [options={}] 请求上下文。 @returns {import('alova').Method} */
    detail(id, options = {}) {
      return xiaoxiangClient.Get(createDetailURL(apiEndpoint, id), {
        name: `${namePrefix}.detail`,
        headers: createRequestHeaders(options)
      })
    },

    /** @param {Object} dto 模板 DTO。 @param {Object} [options={}] 请求上下文。 @returns {import('alova').Method} */
    create(dto, options = {}) {
      return xiaoxiangClient.Post(apiEndpoint, assertTemplateDto(dto), {
        name: `${namePrefix}.create`,
        headers: createRequestHeaders(options)
      })
    },

    /** @param {Object} dto 模板 DTO。 @param {Object} [options={}] 请求上下文。 @returns {import('alova').Method} */
    update(dto, options = {}) {
      const payload = assertTemplateDto(dto)
      normalizePositiveInteger(payload.id, 'customTemplate.id')

      return xiaoxiangClient.Put(apiEndpoint, payload, {
        name: `${namePrefix}.update`,
        headers: createRequestHeaders(options)
      })
    }
  })
}

/**
 * 创建详情请求地址。
 *
 * @param {string | number} id 模板 ID。
 * @returns {string} 详情地址。
 */
function createDetailURL(endpoint, id) {
  return `${endpoint}/${normalizePositiveInteger(id, 'customTemplate.id')}`
}

/** @param {string} value 接口路径。 @returns {string} 规范接口路径。 */
function normalizeEndpoint(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Custom template endpoint must be a non-empty string.')
  }

  return value.trim().replace(/\/$/, '')
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
