/**
 * 微信小程序 web-view API 封装。
 * 当前业务明确运行在微信小程序中，导航只使用 wx.miniProgram。
 */
export const wxAPI = Object.freeze({
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
  }
})

/**
 * 获取微信小程序桥。
 * @returns {Object | null} 宿主桥。
 */
function resolveMiniProgramBridge() {
  return globalThis.window?.wx?.miniProgram ?? null
}

/** @param {*} value 小程序页面路径。 @returns {string | null} 有效路径。 */
function normalizeMiniProgramPath(value) {
  if (typeof value !== 'string') {
    return null
  }

  const path = value.trim()
  return path.startsWith('/') && !path.startsWith('//') ? path : null
}
