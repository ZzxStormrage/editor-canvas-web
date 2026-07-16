import { MESSAGE_TYPES, postBridgeMessage, subscribeBridgeMessage } from './message-bridge.js'

// 临时回退 Token，宿主发送 auth:token 后会立即被内存中的新 Token 替换。
const TEMPORARY_ACCESS_TOKEN =
  'eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiI2Nzk4OWMwYjExOTI0MjJhYWIxMGZhOWMwOWY1ZDU3YSIsInN1YiI6ImFkbWluIn0.2e9aE_Naw2JvJWBMab6VFRSp8xuh7n7LqvHYAcAnOA7i-khEfghpq7bp82sOin1hj-msrI9wUix-Uh0wrUFJJw'
let accessToken = TEMPORARY_ACCESS_TOKEN
let removeTokenSubscription = null
const authExpiredSubscribers = new Set()

/**
 * 设置当前运行时 Token。
 *
 * @param {string} token 原始 Token 或 Bearer Token。
 * @returns {string} 去除 Bearer 前缀后的 Token。
 */
export function setAccessToken(token) {
  accessToken = normalizeAccessToken(token)
  return accessToken
}

/**
 * 获取当前运行时 Token。
 *
 * @returns {string | null} Token。
 */
export function getAccessToken() {
  return accessToken || null
}

/**
 * 清空当前运行时 Token。
 *
 * @returns {void}
 */
export function clearAccessToken() {
  accessToken = ''
}

/**
 * 订阅登录过期通知。
 *
 * @param {(error: Error) => void} handler 登录过期处理器。
 * @returns {() => void} 取消订阅方法。
 */
export function subscribeAuthExpired(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Auth expired handler must be a function.')
  }

  authExpiredSubscribers.add(handler)
  return () => authExpiredSubscribers.delete(handler)
}

/**
 * 通知应用当前登录状态已过期。
 *
 * @param {Error} error 401 请求错误。
 * @returns {void}
 */
export function notifyAuthExpired(error) {
  try {
    postBridgeMessage(MESSAGE_TYPES.AUTH_EXPIRED, {
      code: error?.code ?? 'AUTH_EXPIRED',
      message: error?.message || '登录已过期，请重新登录。',
      status: error?.status ?? 401
    })
  } catch (bridgeError) {
    console.warn('Auth expired message failed.', bridgeError)
  }

  authExpiredSubscribers.forEach((handler) => {
    try {
      handler(error)
    } catch (handlerError) {
      console.error('Auth expired handler failed.', handlerError)
    }
  })
}

/**
 * 监听宿主发送的 Token 消息。
 *
 * @returns {() => void} 取消监听方法。
 */
export function installAuthTokenBridge() {
  if (removeTokenSubscription) {
    return removeTokenSubscription
  }

  const unsubscribe = subscribeBridgeMessage(MESSAGE_TYPES.AUTH_TOKEN, ({ payload }) => {
    setAccessToken(payload?.token ?? payload?.authorization)
  })

  removeTokenSubscription = () => {
    unsubscribe()
    removeTokenSubscription = null
  }

  return removeTokenSubscription
}

/**
 * 向宿主或小程序发送 Token 消息。
 *
 * @param {string} token 原始 Token 或 Bearer Token。
 * @param {Object} [options={}] 消息发送配置。
 * @returns {{ message: Object, channels: string[] }} 发送结果。
 */
export function postAccessToken(token, options = {}) {
  return postBridgeMessage(MESSAGE_TYPES.AUTH_TOKEN, { token: normalizeAccessToken(token) }, options)
}

/**
 * 归一化 Token。
 *
 * @param {string} token 原始 Token。
 * @returns {string} 标准 Token。
 */
function normalizeAccessToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new TypeError('Access token must be a non-empty string.')
  }

  return token
    .trim()
    .replace(/^Bearer\s+/i, '')
    .trim()
}
