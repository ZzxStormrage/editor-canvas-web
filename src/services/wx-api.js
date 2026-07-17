/**
 * 微信小程序 web-view API 兼容层。
 *
 * index.html 通过微信 JSSDK 提供 window.wx.miniProgram，本模块只负责安全调用。
 */
export const wxAPI = Object.freeze({
  /** @returns {boolean} 当前是否存在微信小程序桥。 */
  isSupported() {
    return Boolean(resolveMiniProgramBridge())
  },

  /**
   * 通过微信小程序桥发送原始数据。
   *
   * 标准业务消息优先使用 postBridgeMessage()，此方法只作为底层兼容能力。
   *
   * @param {*} data 可结构化克隆的数据。
   * @returns {boolean} 是否成功调用微信 API。
   */
  postMessage(data) {
    const bridge = resolveMiniProgramBridge()
    if (typeof bridge?.postMessage !== 'function') {
      return false
    }

    try {
      bridge.postMessage({ data })
      return true
    } catch (error) {
      console.warn('WeChat mini program postMessage failed.', error)
      return false
    }
  },

  /**
   * 关闭当前小程序页面并跳转到指定页面。
   *
   * @param {{ url: string }} options 小程序页面路径。
   * @returns {boolean} 是否成功调用微信 API。
   */
  redirectTo(options = {}) {
    const bridge = resolveMiniProgramBridge()
    const url = normalizeMiniProgramPath(options.url)
    if (typeof bridge?.redirectTo !== 'function' || !url) {
      return false
    }

    try {
      bridge.redirectTo({ url })
      return true
    } catch (error) {
      console.warn('WeChat mini program redirectTo failed.', error)
      return false
    }
  },

  /**
   * 返回微信小程序上一页，使 web-view 的 bindmessage 收到已发送数据。
   *
   * @param {{ delta?: number }} [options={}] 返回层级。
   * @returns {boolean} 是否成功调用微信 API。
   */
  navigateBack(options = {}) {
    const bridge = resolveMiniProgramBridge()
    if (typeof bridge?.navigateBack !== 'function') {
      return false
    }

    try {
      bridge.navigateBack({ delta: normalizeDelta(options.delta) })
      return true
    } catch (error) {
      console.warn('WeChat mini program navigateBack failed.', error)
      return false
    }
  }
})

/** @returns {Object | null} 微信小程序桥。 */
function resolveMiniProgramBridge() {
  return globalThis.window?.wx?.miniProgram ?? null
}

/** @param {*} value 返回层级。 @returns {number} 正整数返回层级。 */
function normalizeDelta(value) {
  const delta = Number(value ?? 1)
  return Number.isSafeInteger(delta) && delta > 0 ? delta : 1
}

/** @param {*} value 小程序页面路径。 @returns {string | null} 有效路径。 */
function normalizeMiniProgramPath(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
