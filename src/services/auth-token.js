import { MESSAGE_TYPES, postBridgeMessage, subscribeBridgeMessage } from './message-bridge.js'

const ACCESS_TOKEN_WAIT_TIMEOUT = 3000
const CONFIGURED_ACCESS_TOKEN = import.meta.env?.VITE_TEMPORARY_ACCESS_TOKEN
let accessToken = CONFIGURED_ACCESS_TOKEN ? normalizeAccessToken(CONFIGURED_ACCESS_TOKEN) : ''
let removeTokenSubscription = null
const authExpiredSubscribers = new Set()
const accessTokenWaiters = new Set()

/**
 * 设置当前运行时 Token。
 *
 * @param {string} token 原始 Token 或 Bearer Token。
 * @returns {string} 去除 Bearer 前缀后的 Token。
 */
export function setAccessToken(token) {
  accessToken = normalizeAccessToken(token)
  accessTokenWaiters.forEach((resolve) => resolve(accessToken))
  accessTokenWaiters.clear()
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
 * 等待宿主传入 Token，避免页面初始化请求抢在 auth:token 之前发出。
 *
 * @param {number} [timeout=ACCESS_TOKEN_WAIT_TIMEOUT] 最大等待时间，单位毫秒。
 * @returns {Promise<string | null>} Token 或超时后的 null。
 */
export function waitForAccessToken(timeout = ACCESS_TOKEN_WAIT_TIMEOUT) {
  if (accessToken) {
    return Promise.resolve(accessToken)
  }

  const waitTimeout =
    Number.isFinite(Number(timeout)) && Number(timeout) >= 0 ? Number(timeout) : ACCESS_TOKEN_WAIT_TIMEOUT

  return new Promise((resolve) => {
    let timer = null
    const finish = (token = null) => {
      if (timer) {
        clearTimeout(timer)
      }
      accessTokenWaiters.delete(finish)
      resolve(token)
    }

    accessTokenWaiters.add(finish)
    timer = setTimeout(() => finish(), waitTimeout)
  })
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
