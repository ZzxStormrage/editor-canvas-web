import { xiaoxiangClient } from '../clients/xiaoxiang-client.js'

const CUSTOM_MATERIAL_GROUP_ENDPOINT = '/admin/api/customMaterialGroup'

/**
 * 素材组接口模块。
 */
export const customMaterialGroupApi = createCustomMaterialGroupApi(
  CUSTOM_MATERIAL_GROUP_ENDPOINT
)

/**
 * 创建素材组接口模块。
 *
 * @param {string} endpoint 接口路径。
 * @param {import('alova').Alova} [client=xiaoxiangClient] 请求客户端。
 * @returns {Object} 素材组接口。
 */
export function createCustomMaterialGroupApi(endpoint, client = xiaoxiangClient) {
  const apiEndpoint = normalizeEndpoint(endpoint)

  return Object.freeze({
    /**
     * 根据素材组 ID 分页查询素材。
     *
     * @param {string | number} groupId 素材组 ID。
     * @param {{ page?: number, size?: number, sort?: string[] | string }} [params={}] 分页参数。
     * @param {{ partnerId?: string | number | null }} [options={}] 请求上下文。
     * @returns {import('alova').Method} Alova Method 实例。
     */
    materials(groupId, params = {}, options = {}) {
      const normalizedGroupId = normalizePositiveInteger(groupId, 'customMaterialGroup.groupId')

      return client.Get(`${apiEndpoint}/${normalizedGroupId}/materials`, {
        name: 'customMaterialGroup.materials',
        params: normalizeMaterialQuery(params),
        headers: createRequestHeaders(options)
      })
    }
  })
}

/** @param {string} value 接口路径。 @returns {string} 规范接口路径。 */
function normalizeEndpoint(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Custom material group endpoint must be a non-empty string.')
  }

  return value.trim().replace(/\/$/, '')
}

/**
 * 归一化素材分页查询参数。
 *
 * @param {Object} params 原始查询参数。
 * @returns {Object} 可发送的查询参数。
 */
function normalizeMaterialQuery(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('customMaterialGroup.materials(params) requires an object.')
  }

  const page = params.page === undefined ? 0 : normalizeNonNegativeInteger(params.page, 'page')
  const size = params.size === undefined ? 20 : normalizePositiveInteger(params.size, 'size')
  const query = { page, size }

  if (params.sort !== undefined && params.sort !== null && params.sort !== '') {
    query.sort = params.sort
  }

  return query
}

/**
 * 创建可选分销商请求头。
 *
 * @param {{ partnerId?: string | number | null }} options 请求上下文。
 * @returns {Object} 请求头。
 */
function createRequestHeaders(options = {}) {
  if (options.partnerId === undefined || options.partnerId === null || options.partnerId === '') {
    return {}
  }

  return {
    'X-Partner-Id': normalizePositiveInteger(options.partnerId, 'X-Partner-Id')
  }
}

/** @param {*} value 原始值。 @param {string} name 字段名。 @returns {number} 正整数。 */
function normalizePositiveInteger(value, name) {
  const number = Number(value)

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${name} must be a positive integer.`)
  }

  return number
}

/** @param {*} value 原始值。 @param {string} name 字段名。 @returns {number} 非负整数。 */
function normalizeNonNegativeInteger(value, name) {
  const number = Number(value)

  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${name} must be a non-negative integer.`)
  }

  return number
}
