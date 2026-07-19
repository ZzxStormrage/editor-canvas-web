import { createAccessTokenStore, normalizeAccessToken } from '../../../services/access-token-store.js'
import {
  MESSAGE_TYPES,
  postBridgeMessage,
  subscribeBridgeMessage
} from '../../../services/message-bridge.js'

const H5_ACCESS_TOKEN_STORAGE_KEY = 'ele-editor:h5-access-token:v1'
const h5AccessTokenStore = createAccessTokenStore({
  initialToken: readCachedH5AccessToken() || import.meta.env?.VITE_H5_TEMPORARY_ACCESS_TOKEN
})
let removeTokenSubscription = null

/** @param {string} token H5 Token。 @returns {string} 标准 Token。 */
export function setH5AccessToken(token) {
  const normalizedToken = h5AccessTokenStore.set(token)
  writeCachedH5AccessToken(normalizedToken)
  return normalizedToken
}

/** @returns {string | null} 当前 H5 Token。 */
export function getH5AccessToken() {
  return h5AccessTokenStore.get()
}

/** @param {number} [timeout] 最大等待时间。 @returns {Promise<string | null>} H5 Token。 */
export function waitForH5AccessToken(timeout) {
  return h5AccessTokenStore.wait(timeout)
}

/** @returns {void} 清空 H5 Token。 */
export function clearH5AccessToken() {
  h5AccessTokenStore.clear()
  removeCachedH5AccessToken()
}

/**
 * 监听宿主单独发送的 H5 Token。
 *
 * @returns {() => void} 取消监听方法。
 */
export function installH5AccessTokenBridge() {
  if (removeTokenSubscription) {
    return removeTokenSubscription
  }

  const unsubscribe = subscribeBridgeMessage(MESSAGE_TYPES.H5_AUTH_TOKEN, ({ payload }) => {
    setH5AccessToken(payload?.token ?? payload?.authorization)
  })

  removeTokenSubscription = () => {
    unsubscribe()
    removeTokenSubscription = null
  }
  return removeTokenSubscription
}

/**
 * 通知小程序 H5 customer 接口登录已过期。
 *
 * @param {Error} error 401 请求错误。
 * @returns {void}
 */
export function notifyH5AuthExpired(error) {
  try {
    postBridgeMessage(
      MESSAGE_TYPES.AUTH_EXPIRED,
      {
        scope: 'h5',
        code: error?.code ?? 'H5_AUTH_EXPIRED',
        message: error?.message || '登录已过期，请重新登录。',
        status: error?.status ?? 401
      },
      { target: 'mini-program', sender: 'h5-page' }
    )
  } catch (bridgeError) {
    console.warn('H5 auth expired message failed.', bridgeError)
  }
}

/**
 * 创建 H5 Token 消息。
 *
 * @param {string} token 原始 Token。
 * @param {Object} [options={}] 消息发送配置。
 * @returns {{ message: Object, channels: string[] }} 发送结果。
 */
export function postH5AccessToken(token, options = {}) {
  return postBridgeMessage(
    MESSAGE_TYPES.H5_AUTH_TOKEN,
    { token: normalizeAccessToken(token) },
    options
  )
}

/** @returns {Storage | null} 当前标签页的安全缓存。 */
function getTokenStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** @returns {string} 已缓存的 H5 Token。 */
function readCachedH5AccessToken() {
  try {
    return getTokenStorage()?.getItem(H5_ACCESS_TOKEN_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/** @param {string} token 标准 Token。 @returns {void} */
function writeCachedH5AccessToken(token) {
  try {
    getTokenStorage()?.setItem(H5_ACCESS_TOKEN_STORAGE_KEY, token)
  } catch {
    // 隐私模式或存储配额限制时仍保留当前内存 Token。
  }
}

/** @returns {void} */
function removeCachedH5AccessToken() {
  try {
    getTokenStorage()?.removeItem(H5_ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    // 存储不可用时内存 Token 已经清除。
  }
}
