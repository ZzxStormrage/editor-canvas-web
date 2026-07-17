const DEFAULT_WAIT_TIMEOUT = 3000

/**
 * 创建独立的内存 Token 存储。
 *
 * @param {{ initialToken?: string, waitTimeout?: number }} [options={}] Token 配置。
 * @returns {{ set: Function, get: Function, clear: Function, wait: Function }} Token 存储。
 */
export function createAccessTokenStore(options = {}) {
  let accessToken = options.initialToken ? normalizeAccessToken(options.initialToken) : ''
  const waitTimeout = normalizeWaitTimeout(options.waitTimeout)
  const waiters = new Set()

  return Object.freeze({
    /** @param {string} token 原始 Token。 @returns {string} 标准 Token。 */
    set(token) {
      accessToken = normalizeAccessToken(token)
      waiters.forEach((resolve) => resolve(accessToken))
      waiters.clear()
      return accessToken
    },

    /** @returns {string | null} 当前 Token。 */
    get() {
      return accessToken || null
    },

    /** @returns {void} */
    clear() {
      accessToken = ''
    },

    /** @param {number} [timeout=waitTimeout] 最大等待时间。 @returns {Promise<string | null>} Token。 */
    wait(timeout = waitTimeout) {
      if (accessToken) {
        return Promise.resolve(accessToken)
      }

      return waitForToken(waiters, normalizeWaitTimeout(timeout, waitTimeout))
    }
  })
}

/**
 * 归一化 Bearer Token。
 *
 * @param {string} token 原始 Token。
 * @returns {string} 去除 Bearer 前缀后的 Token。
 */
export function normalizeAccessToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new TypeError('Access token must be a non-empty string.')
  }

  return token.trim().replace(/^Bearer\s+/i, '').trim()
}

/**
 * 等待 Token 写入。
 *
 * @param {Set<Function>} waiters 等待处理器集合。
 * @param {number} timeout 等待时间。
 * @returns {Promise<string | null>} Token 或 null。
 */
function waitForToken(waiters, timeout) {
  return new Promise((resolve) => {
    let timer = null
    const finish = (token = null) => {
      if (timer) {
        clearTimeout(timer)
      }
      waiters.delete(finish)
      resolve(token)
    }

    waiters.add(finish)
    timer = setTimeout(() => finish(), timeout)
  })
}

/**
 * 归一化等待时间。
 *
 * @param {*} value 原始等待时间。
 * @param {number} [fallback=DEFAULT_WAIT_TIMEOUT] 回退等待时间。
 * @returns {number} 非负等待时间。
 */
function normalizeWaitTimeout(value, fallback = DEFAULT_WAIT_TIMEOUT) {
  const timeout = Number(value ?? fallback)
  return Number.isFinite(timeout) && timeout >= 0 ? timeout : fallback
}
