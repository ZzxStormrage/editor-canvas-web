import { setH5AccessToken } from './auth-token.js'

const TOKEN_QUERY_KEYS = ['token', 'authorization', 'Authorization']

/**
 * 消费路由中的 Token 并立即从地址栏移除。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @param {import('vue-router').Router} router Vue Router 实例。
 * @returns {Promise<string | null>} 已应用的 Token。
 */
export async function consumeRouteAccessToken(route, router) {
  const token = readRouteAccessToken(route)
  if (!token) {
    return null
  }

  const normalizedToken = setH5AccessToken(token)
  const query = { ...route.query }
  TOKEN_QUERY_KEYS.forEach((key) => delete query[key])
  await router.replace({
    name: route.name,
    params: route.params,
    query,
    hash: route.hash
  })
  return normalizedToken
}

/**
 * 读取路由中的 Token。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @returns {string | null} 原始 Token。
 */
export function readRouteAccessToken(route) {
  for (const key of TOKEN_QUERY_KEYS) {
    const token = readRouteValue(route.query?.[key])
    if (typeof token === 'string' && token.trim()) {
      return token
    }
  }

  return null
}

/** @param {*} value 路由参数值。 @returns {*} 单值。 */
function readRouteValue(value) {
  return Array.isArray(value) ? value[0] : value
}
