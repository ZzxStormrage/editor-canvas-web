import { wxAPI } from './wx-api.js'

const INTERNAL_QUERY_KEYS = new Set([
  'Authorization',
  'authorization',
  'designName',
  'partnerId',
  'redirectPath',
  'templateId',
  'token'
])

/**
 * 读取 H5 页面保存成功后的重定向路径。
 *
 * @param {Object} route Vue Router 当前路由对象。
 * @returns {string | null} 包含业务参数的重定向路径；未传入时返回 null。
 */
export function readH5RedirectPath(route) {
  const path = readRouteValue(route?.query?.redirectPath)
  return typeof path === 'string' && path.trim()
    ? appendBusinessQuery(path.trim(), route.query)
    : null
}

/**
 * 跳转到 redirectPath 指定的页面。
 *
 * @param {string | null} path 重定向路径。
 * @param {Object} router Vue Router 实例。
 * @returns {Promise<boolean>} 是否已发起跳转。
 */
export async function navigateToH5RedirectPath(path, router) {
  const target = normalizeRedirectPath(path)
  if (!target) {
    return false
  }

  if (wxAPI.redirectTo({ url: target })) {
    return true
  }

  if (/^https?:\/\//i.test(target)) {
    window.location.assign(target)
    return true
  }

  if (!router) {
    return false
  }

  await router.replace(target)
  return true
}

/** @param {*} value 路由参数值。 @returns {*} 单值。 */
export function readRouteValue(value) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

/** @param {*} value 路由模板 ID。 @returns {number | null} 正整数模板 ID。 */
export function readRouteTemplateId(value) {
  const templateId = Number(readRouteValue(value))
  return Number.isSafeInteger(templateId) && templateId > 0 ? templateId : null
}

/** @param {*} value 原始路径。 @returns {string | null} 安全路径。 */
function normalizeRedirectPath(value) {
  if (typeof value !== 'string') {
    return null
  }

  const path = value.trim()
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  if (path.startsWith('#/')) {
    return path.slice(1)
  }
  if (path.startsWith('/') && !path.startsWith('//')) {
    return path
  }
  return /^[\w.-]+(?:\/[\w.-]+)+(?:\?.*)?$/.test(path) ? `/${path}` : null
}

/**
 * @param {string} path 原始跳转路径。
 * @param {Object} query 当前 H5 查询参数。
 * @returns {string} 包含业务参数的跳转路径。
 */
function appendBusinessQuery(path, query = {}) {
  const [basePath, rawQuery = ''] = path.split('?')
  const searchParams = new URLSearchParams(rawQuery)

  Object.entries(query).forEach(([key, value]) => {
    if (INTERNAL_QUERY_KEYS.has(key) || searchParams.has(key)) {
      return
    }

    const values = Array.isArray(value) ? value : [value]
    values.forEach((item) => {
      if (item !== undefined && item !== null && item !== '') {
        searchParams.append(key, String(item))
      }
    })
  })

  const serializedQuery = searchParams.toString()
  return serializedQuery ? `${basePath}?${serializedQuery}` : basePath
}
