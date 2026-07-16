export const MESSAGE_BRIDGE_CHANNEL = 'ele-editor'
export const MESSAGE_BRIDGE_VERSION = 1
export const MESSAGE_TYPES = Object.freeze({
  EDITOR_READY: 'editor:ready',
  EDITOR_INITIALIZED: 'editor:initialized',
  AUTH_TOKEN: 'auth:token',
  AUTH_EXPIRED: 'auth:expired',
  TEMPLATE_LOADING: 'template:loading',
  TEMPLATE_LOADED: 'template:loaded',
  TEMPLATE_LOAD_FAILED: 'template:load-failed',
  TEMPLATE_SAVING: 'template:saving',
  TEMPLATE_SAVED: 'template:saved',
  TEMPLATE_SAVE_FAILED: 'template:save-failed',
  H5_PAGE_SAVED: 'h5:page-saved'
})

const MESSAGE_TARGETS = new Set(['auto', 'parent', 'opener', 'mini-program'])
const subscribers = new Map()
let stopWindowListener = null
let previousGlobalBridge

/**
 * 创建统一的跨端消息结构。
 *
 * @param {string} type 消息类型。
 * @param {*} [payload={}] 消息数据。
 * @param {Object} [options={}] 消息配置。
 * @param {string} [options.id] 消息 ID。
 * @param {string} [options.sender='editor'] 发送方标识。
 * @returns {Object} 可被结构化克隆的消息对象。
 */
export function createBridgeMessage(type, payload = {}, options = {}) {
  assertMessageType(type)

  return {
    channel: MESSAGE_BRIDGE_CHANNEL,
    version: MESSAGE_BRIDGE_VERSION,
    id: options.id ?? createMessageId(),
    type,
    sender: options.sender ?? 'editor',
    timestamp: Date.now(),
    payload
  }
}

/**
 * 向后台 iframe、opener 或小程序发送统一消息。
 *
 * @param {string} type 消息类型。
 * @param {*} [payload={}] 消息数据。
 * @param {Object} [options={}] 发送配置。
 * @param {'auto' | 'parent' | 'opener' | 'mini-program'} [options.target='auto'] 目标通道。
 * @param {WindowProxy | null} [options.targetWindow] 指定窗口。
 * @param {string} [options.targetOrigin] 窗口目标源。
 * @param {string} [options.sender='editor'] 发送方标识。
 * @returns {{ message: Object, channels: string[] }} 消息和成功调用的通道。
 */
export function postBridgeMessage(type, payload = {}, options = {}) {
  const message = createBridgeMessage(type, payload, options)
  const channels = []

  if (typeof window === 'undefined') {
    return { message, channels }
  }
  if (options.targetWindow) {
    postToWindow(options.targetWindow, options.targetOrigin, message)
    return { message, channels: ['window'] }
  }

  const target = options.target ?? 'auto'
  assertMessageTarget(target)
  if ((target === 'auto' || target === 'mini-program') && postToMiniProgram(message)) {
    return { message, channels: ['mini-program'] }
  }
  if ((target === 'auto' || target === 'parent') && window.parent !== window) {
    postToWindow(window.parent, options.targetOrigin, message)
    channels.push('parent')
    if (target === 'auto') {
      return { message, channels }
    }
  }
  if ((target === 'auto' || target === 'opener') && window.opener && !window.opener.closed) {
    postToWindow(window.opener, options.targetOrigin, message)
    channels.push('opener')
  }

  return { message, channels }
}

/**
 * 订阅指定类型的跨端消息。
 *
 * @param {string} type 消息类型，使用 `*` 监听全部消息。
 * @param {Function} handler 消息处理器。
 * @returns {() => void} 取消订阅方法。
 */
export function subscribeBridgeMessage(type, handler) {
  assertMessageType(type, true)
  if (typeof handler !== 'function') {
    throw new TypeError('Message bridge handler must be a function.')
  }

  const typeSubscribers = subscribers.get(type) ?? new Set()
  typeSubscribers.add(handler)
  subscribers.set(type, typeSubscribers)

  return () => {
    typeSubscribers.delete(handler)
    if (typeSubscribers.size === 0) {
      subscribers.delete(type)
    }
  }
}

/**
 * 接收原生容器或小程序注入的消息。
 *
 * @param {*} rawMessage 原始消息。
 * @param {Object} [context={}] 消息上下文。
 * @returns {boolean} 是否识别并派发了消息。
 */
export function receiveBridgeMessage(rawMessage, context = {}) {
  const message = normalizeBridgeMessage(rawMessage)
  if (!message) {
    return false
  }

  const handlers = [...(subscribers.get(message.type) ?? []), ...(subscribers.get('*') ?? [])]

  handlers.forEach((handler) => {
    try {
      Promise.resolve(handler({ message, payload: message.payload, context })).catch(logHandlerError)
    } catch (error) {
      logHandlerError(error)
    }
  })

  return handlers.length > 0
}

/**
 * 启动窗口消息监听，并暴露 `window.EleEditorBridge` 给原生容器调用。
 *
 * @param {Object} [options={}] 桥接配置。
 * @param {string[] | string} [options.allowedOrigins] 允许接收消息的来源。
 * @returns {() => void} 停止消息桥的方法。
 */
export function startMessageBridge(options = {}) {
  if (typeof window === 'undefined') {
    return () => {}
  }
  if (stopWindowListener) {
    return stopWindowListener
  }

  const allowedOrigins = resolveAllowedOrigins(options.allowedOrigins)
  const handleWindowMessage = (event) => {
    if (isAllowedOrigin(event.origin, allowedOrigins)) {
      receiveBridgeMessage(event.data, {
        origin: event.origin,
        source: event.source,
        transport: 'window'
      })
    }
  }

  window.addEventListener('message', handleWindowMessage)
  exposeGlobalBridge()

  stopWindowListener = () => {
    window.removeEventListener('message', handleWindowMessage)
    restoreGlobalBridge()
    stopWindowListener = null
  }

  return stopWindowListener
}

/**
 * 将消息发送到指定窗口。
 *
 * @param {WindowProxy} targetWindow 目标窗口。
 * @param {string | undefined} targetOrigin 目标源。
 * @param {Object} message 消息对象。
 * @returns {void}
 */
function postToWindow(targetWindow, targetOrigin, message) {
  targetWindow.postMessage(message, targetOrigin || resolveDefaultTargetOrigin())
}

/**
 * 尝试通过 uni 或小程序原生桥发送消息。
 *
 * @param {Object} message 消息对象。
 * @returns {boolean} 是否调用了小程序通道。
 */
function postToMiniProgram(message) {
  const bridge = resolveMiniProgramBridge()
  if (!bridge) {
    return false
  }

  bridge.postMessage({ data: message })
  return true
}

/**
 * 获取当前小程序消息桥。
 *
 * @returns {{ postMessage: Function } | null} 小程序桥。
 */
function resolveMiniProgramBridge() {
  const candidates = [
    window.uni,
    window.wx?.miniProgram,
    window.qq?.miniProgram,
    window.my,
    window.swan?.webView,
    window.tt?.miniProgram,
    window.jd?.miniProgram
  ]

  return candidates.find((bridge) => typeof bridge?.postMessage === 'function') ?? null
}

/**
 * 解析允许接收消息的来源。
 *
 * @param {string[] | string | undefined} configuredOrigins 外部配置。
 * @returns {Set<string>} 来源集合。
 */
function resolveAllowedOrigins(configuredOrigins) {
  const origins = normalizeOriginList(configuredOrigins)
  origins.push(...normalizeOriginList(import.meta.env?.VITE_MESSAGE_ALLOWED_ORIGINS))
  origins.push(window.location.origin)

  const referrerOrigin = resolveReferrerOrigin()
  if (referrerOrigin) {
    origins.push(referrerOrigin)
  }

  return new Set(origins)
}

/**
 * 将来源配置转换为数组。
 *
 * @param {string[] | string | undefined} value 来源配置。
 * @returns {string[]} 来源数组。
 */
function normalizeOriginList(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return values.map(normalizeOrigin).filter(Boolean)
}

/**
 * 将配置地址归一化为浏览器消息事件使用的 origin。
 *
 * @param {*} value 来源地址。
 * @returns {string | null} 标准 origin。
 */
function normalizeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const origin = value.trim()
  if (origin === '*') {
    return origin
  }

  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}

/**
 * 判断消息来源是否允许。
 *
 * @param {string} origin 消息来源。
 * @param {Set<string>} allowedOrigins 允许来源。
 * @returns {boolean} 是否允许。
 */
function isAllowedOrigin(origin, allowedOrigins) {
  return allowedOrigins.has('*') || allowedOrigins.has(origin)
}

/**
 * 获取默认窗口目标源。
 *
 * @returns {string} 目标源。
 */
function resolveDefaultTargetOrigin() {
  const configuredOrigins = normalizeOriginList(import.meta.env?.VITE_MESSAGE_ALLOWED_ORIGINS).filter(
    (origin) => origin !== '*'
  )

  return resolveReferrerOrigin() || configuredOrigins[0] || window.location.origin
}

/**
 * 获取嵌入页面来源。
 *
 * @returns {string | null} 来源地址。
 */
function resolveReferrerOrigin() {
  if (!document.referrer) {
    return null
  }

  try {
    return new URL(document.referrer).origin
  } catch {
    return null
  }
}

/**
 * 归一化外部消息。
 *
 * @param {*} rawMessage 原始消息。
 * @returns {Object | null} 标准消息。
 */
function normalizeBridgeMessage(rawMessage) {
  let message = parseMessageValue(rawMessage)

  if (message?.data?.channel === MESSAGE_BRIDGE_CHANNEL) {
    message = message.data
  }
  if (
    !message ||
    message.channel !== MESSAGE_BRIDGE_CHANNEL ||
    message.version !== MESSAGE_BRIDGE_VERSION ||
    typeof message.type !== 'string'
  ) {
    return null
  }

  return message
}

/**
 * 解析字符串或对象消息。
 *
 * @param {*} value 原始值。
 * @returns {Object | null} 消息对象。
 */
function parseMessageValue(value) {
  if (typeof value !== 'string') {
    return value && typeof value === 'object' ? value : null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * 暴露原生容器可调用的全局桥。
 *
 * @returns {void}
 */
function exposeGlobalBridge() {
  previousGlobalBridge = window.EleEditorBridge
  window.EleEditorBridge = Object.freeze({
    channel: MESSAGE_BRIDGE_CHANNEL,
    version: MESSAGE_BRIDGE_VERSION,
    postMessage: postBridgeMessage,
    receiveMessage: receiveBridgeMessage,
    subscribe: subscribeBridgeMessage
  })
}

/**
 * 恢复启动消息桥前的全局对象。
 *
 * @returns {void}
 */
function restoreGlobalBridge() {
  if (previousGlobalBridge === undefined) {
    delete window.EleEditorBridge
  } else {
    window.EleEditorBridge = previousGlobalBridge
  }
  previousGlobalBridge = undefined
}

/**
 * 创建消息 ID。
 *
 * @returns {string} 消息 ID。
 */
function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * 校验消息类型。
 *
 * @param {string} type 消息类型。
 * @param {boolean} [allowWildcard=false] 是否允许通配符。
 * @returns {void}
 */
function assertMessageType(type, allowWildcard = false) {
  if (typeof type !== 'string' || !type.trim() || (!allowWildcard && type === '*')) {
    throw new TypeError('Message bridge type must be a non-empty string.')
  }
}

/**
 * 校验消息目标通道。
 *
 * @param {string} target 目标通道。
 * @returns {void}
 */
function assertMessageTarget(target) {
  if (!MESSAGE_TARGETS.has(target)) {
    throw new TypeError(`Unsupported message bridge target: ${target}.`)
  }
}

/**
 * 记录消息处理器异常。
 *
 * @param {*} error 原始错误。
 * @returns {void}
 */
function logHandlerError(error) {
  console.error('Message bridge handler failed.', error)
}
