import { wxAPI } from './wx-api.js'

const INTERNAL_QUERY_KEYS = new Set([
  'Authorization',
  'authorization',
  'aiThemeUrl',
  'aiThemeUrls',
  'aiThemes',
  'aiSubjectIds',
  'backgroundImageUrl',
  'backgroundImageUrls',
  'backgroundImages',
  'background_img_urls',
  'designName',
  'partnerId',
  'redirectPath',
  'templateId',
  'themeImages',
  'themeFlowId',
  'themeEntryId',
  'themeName',
  'fromH5TryMore',
  'token'
])

/**
 * 读取 H5 页面保存成功后的重定向路径。
 *
 * @param {Object} route Vue Router 当前路由对象。
 * @returns {string | null} 包含业务参数的重定向路径；未传入时返回 null。
 */
export function readH5RedirectPath(route) {
  const path = decodeRedirectPath(readRouteValue(route?.query?.redirectPath))
  return typeof path === 'string' && path.trim() ? appendBusinessQuery(path.trim(), route.query) : null
}

/**
 * 通过微信小程序宿主跳转到 redirectPath 指定的页面。
 *
 * @param {string | null} path 重定向路径。
 * @returns {boolean} 是否已调用 wx.miniProgram.redirectTo。
 */
export function navigateToH5RedirectPath(path) {
  const target = normalizeRedirectPath(path)
  if (!target) {
    return false
  }

  // 购买路径只能交给小程序宿主，不允许回退或交给 H5 Router。
  return wxAPI.redirectTo({ url: target })
}

/** @param {*} value 路由参数值。 @returns {*} 单值。 */
export function readRouteValue(value) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
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
  if (path.startsWith('#/')) {
    return path.slice(1)
  }
  if (path.startsWith('/') && !path.startsWith('//')) {
    return path
  }
  return /^[\w.-]+(?:\/[\w.-]+)+(?:\?.*)?$/.test(path) ? `/${path}` : null
}

/**
 * 仅在路径本身尚未可识别时逐层解码，避免 redirectPath 被路由和 H5 URL
 * 连续编码后无法通过小程序路径校验；一旦得到合法路径即停止，不破坏内部查询参数。
 * @param {*} value 原始回跳路径。
 * @returns {*} 解码后的路径。
 */
function decodeRedirectPath(value) {
  if (typeof value !== 'string') {
    return value
  }

  let path = value.trim()
  for (let i = 0; i < 2 && path && !normalizeRedirectPath(path); i += 1) {
    try {
      const decoded = decodeURIComponent(path)
      if (decoded === path) break
      path = decoded
    } catch {
      break
    }
  }
  return path
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
