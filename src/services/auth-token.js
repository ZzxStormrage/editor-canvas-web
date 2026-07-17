import { createAccessTokenStore, normalizeAccessToken } from './access-token-store.js'
import { MESSAGE_TYPES, postBridgeMessage, subscribeBridgeMessage } from './message-bridge.js'

const adminAccessTokenStore = createAccessTokenStore({
  initialToken: import.meta.env?.VITE_TEMPORARY_ACCESS_TOKEN
})
let removeTokenSubscription = null
const authExpiredSubscribers = new Set()

/**
 * 设置当前运行时 Token。
 *
 * @param {string} token 原始 Token 或 Bearer Token。
 * @returns {string} 去除 Bearer 前缀后的 Token。
 */
export function setAccessToken(token) {
  return adminAccessTokenStore.set(token)
}

/**
 * 获取当前运行时 Token。
 *
 * @returns {string | null} Token。
 */
export function getAccessToken() {
  return adminAccessTokenStore.get()
}

/**
 * 等待宿主传入 Token，避免页面初始化请求抢在 auth:token 之前发出。
 *
 * @param {number} [timeout] 最大等待时间，单位毫秒。
 * @returns {Promise<string | null>} Token 或超时后的 null。
 */
export function waitForAccessToken(timeout) {
  return adminAccessTokenStore.wait(timeout)
}

/**
 * 清空当前运行时 Token。
 *
 * @returns {void}
 */
export function clearAccessToken() {
  adminAccessTokenStore.clear()
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
