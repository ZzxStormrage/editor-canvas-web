import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import { setAccessToken } from '../services/auth-token.js'
import {
  MESSAGE_TYPES,
  postBridgeMessage,
  subscribeBridgeMessage
} from '../services/message-bridge.js'
import { parsePositiveIntegerId } from '../services/positive-integer-id.js'

const TOKEN_QUERY_KEYS = ['token', 'authorization', 'Authorization']
const TEMPLATE_ID_ROUTE_KEYS = ['id', 'templateId']
const ROUTE_CONTEXT_KEYS = ['id', 'itemId', 'userId', 'partnerId', 'templateName', 'previewImgUrl']
const TEMPLATE_LOAD_TIMEOUT_MS = 15000

/**
 * 通过消息桥接收初始化 JSON，并将保存 JSON 交给外部宿主处理。
 *
 * @param {Object} options 持久化配置。
 * @param {Object} options.editor `useCanvasEditor()` 返回值。
 * @param {import('vue-router').RouteLocationNormalizedLoaded} options.route 当前路由。
 * @param {import('vue-router').Router} options.router Vue Router 实例。
 * @param {(message: string, type: 'success' | 'error') => void} [options.onMessage] 消息方法。
 * @returns {Object} 模板状态和持久化方法。
 */
export function useCustomTemplatePersistence(options) {
  const { editor, route, router } = options
  const notify = typeof options.onMessage === 'function' ? options.onMessage : null
  const loading = ref(false)
  const saving = ref(false)
  const template = reactive(createTemplateState())
  let activeRouteKey = createRoutePersistenceKey(route)
  let currentRouteContext = readRouteContext(route)
  let initializationVersion = 0
  let pendingLoadRequestId = null
  let pendingSaveRequestId = null
  let loadResponseTimer = null
  let isMounted = false
  const unsubscribeTemplateLoad = subscribeBridgeMessage(
    MESSAGE_TYPES.TEMPLATE_LOAD,
    handleTemplateLoadMessage
  )
  const unsubscribeTemplateLoadFailed = subscribeBridgeMessage(
    MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
    handleTemplateLoadFailedMessage
  )
  const unsubscribeTemplateSaved = subscribeBridgeMessage(
    MESSAGE_TYPES.TEMPLATE_SAVED,
    handleTemplateSavedMessage
  )
  const unsubscribeTemplateSaveFailed = subscribeBridgeMessage(
    MESSAGE_TYPES.TEMPLATE_SAVE_FAILED,
    handleTemplateSaveFailedMessage
  )

  const statusText = computed(() => {
    if (loading.value) {
      return '加载中'
    }

    return template.id ? `模板 #${template.id}` : '新建模板'
  })

  /**
   * 根据路由上下文请求宿主提供初始化 JSON。
   *
   * @returns {Promise<{ requestId: string, channels: string[] } | null>} 初始化请求结果。
   */
  async function initialize() {
    const version = ++initializationVersion
    loading.value = true
    clearLoadResponseTimer()
    pendingLoadRequestId = null
    try {
      activeRouteKey = createRoutePersistenceKey(route)
      currentRouteContext = readRouteContext(route)
      resetTemplateState(template)
      applyRouteContext(template, currentRouteContext)
      await applyRouteAuthorization(currentRouteContext, route, router)
      const coreEditor = await editor.whenReady()

      if (version !== initializationVersion) {
        return null
      }

      coreEditor.clearDocument?.()
      const transmission = postBridgeMessage(
        MESSAGE_TYPES.TEMPLATE_LOAD_REQUESTED,
        createTemplatePayload(template)
      )
      pendingLoadRequestId = transmission.message.id

      if (transmission.channels.length === 0 && !currentRouteContext.id) {
        loading.value = false
        postLifecycleMessage(
          MESSAGE_TYPES.EDITOR_INITIALIZED,
          createTemplatePayload(template, {
            mode: 'create'
          })
        )
        return {
          requestId: pendingLoadRequestId,
          channels: transmission.channels
        }
      }

      if (transmission.channels.length === 0) {
        throw new Error('未检测到外部宿主，无法获取模板初始化 JSON。')
      }

      startLoadResponseTimer(pendingLoadRequestId)
      return {
        requestId: pendingLoadRequestId,
        channels: transmission.channels
      }
    } catch (error) {
      if (version === initializationVersion) {
        loading.value = false
        pendingLoadRequestId = null
        postLifecycleMessage(
          MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
          createTemplatePayload(template, {
            error: serializeBridgeError(error)
          })
        )
        notify?.(error?.message || '模板初始化请求失败。', 'error')
      }
      return null
    }
  }

  /**
   * 接收宿主返回的模板上下文和统一 JSON，并还原编辑器。
   *
   * @param {{ payload?: Object }} event 消息订阅事件。
   * @returns {Promise<Object | null>} 已加载的统一文档。
   */
  async function handleTemplateLoadMessage({ payload = {} }) {
    if (!isMatchingRequest(payload.requestId, pendingLoadRequestId)) {
      return null
    }

    const version = initializationVersion
    clearLoadResponseTimer()
    loading.value = true
    try {
      const incomingTemplate = isPlainObject(payload.template) ? payload.template : {}
      const document = payload.document ?? payload.content ?? incomingTemplate.content ?? null
      applyTemplateRecord(template, incomingTemplate, currentRouteContext)
      const coreEditor = await editor.whenReady()

      if (version !== initializationVersion) {
        return null
      }

      coreEditor.clearDocument?.()
      const loadedDocument = await loadTemplateContent(editor, document)
      if (loadedDocument) {
        editor.fitArtboardToView()
      }
      pendingLoadRequestId = null
      loading.value = false
      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_LOADED,
        createTemplatePayload(template, { requestId: payload.requestId ?? null })
      )
      postLifecycleMessage(
        MESSAGE_TYPES.EDITOR_INITIALIZED,
        createTemplatePayload(template, { requestId: payload.requestId ?? null })
      )
      return loadedDocument
    } catch (error) {
      if (version === initializationVersion) {
        pendingLoadRequestId = null
        loading.value = false
        notify?.(error?.message || '宿主模板 JSON 加载失败。', 'error')
        postLifecycleMessage(
          MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
          createTemplatePayload(template, {
            requestId: payload.requestId ?? null,
            error: serializeBridgeError(error)
          })
        )
      }
      return null
    }
  }

  /**
   * 接收宿主返回的初始化失败消息并结束加载状态。
   *
   * @param {{ payload?: Object }} event 消息订阅事件。
   * @returns {void}
   */
  function handleTemplateLoadFailedMessage({ payload = {} }) {
    if (!isMatchingRequest(payload.requestId, pendingLoadRequestId)) {
      return
    }

    pendingLoadRequestId = null
    clearLoadResponseTimer()
    loading.value = false
    notify?.(payload.error?.message || '宿主获取模板 JSON 失败。', 'error')
  }

  /**
   * 导出当前编辑器 JSON，并向外部宿主发送保存请求。
   *
   * @returns {Promise<{ document: Object, messageId: string, channels: string[] } | null>} 发送结果。
   */
  async function save() {
    if (loading.value || saving.value) {
      return null
    }

    saving.value = true
    try {
      await editor.whenReady()

      const document = editor.exportDocument()

      if (!document) {
        throw new Error('编辑器尚未初始化，无法导出保存数据。')
      }

      const transmission = postBridgeMessage(
        MESSAGE_TYPES.TEMPLATE_SAVE_REQUESTED,
        createTemplatePayload(template, {
          action: template.id ? 'update' : 'create',
          document
        })
      )

      if (transmission.channels.length === 0) {
        throw new Error('未检测到外部宿主，当前 JSON 未发送。')
      }

      pendingSaveRequestId = transmission.message.id
      return {
        document,
        messageId: transmission.message.id,
        channels: transmission.channels
      }
    } catch (error) {
      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_SAVE_FAILED,
        createTemplatePayload(template, {
          error: serializeBridgeError(error)
        })
      )
      throw error
    } finally {
      saving.value = false
    }
  }

  /**
   * 接收宿主保存成功回执，并合并新增接口返回的模板 ID 等上下文。
   *
   * @param {{ payload?: Object }} event 消息订阅事件。
   * @returns {void}
   */
  function handleTemplateSavedMessage({ payload = {} }) {
    if (!isMatchingRequest(payload.requestId, pendingSaveRequestId)) {
      return
    }

    if (isPlainObject(payload.template)) {
      applyTemplateRecord(template, payload.template, currentRouteContext)
    }
    pendingSaveRequestId = null
    notify?.('模板已保存。', 'success')
  }

  /**
   * 接收宿主保存失败回执。
   *
   * @param {{ payload?: Object }} event 消息订阅事件。
   * @returns {void}
   */
  function handleTemplateSaveFailedMessage({ payload = {} }) {
    if (!isMatchingRequest(payload.requestId, pendingSaveRequestId)) {
      return
    }

    pendingSaveRequestId = null
    notify?.(payload.error?.message || '宿主保存模板失败。', 'error')
  }

  /**
   * 启动宿主初始化响应超时计时器。
   *
   * @param {string} requestId 初始化请求 ID。
   * @returns {void}
   */
  function startLoadResponseTimer(requestId) {
    clearLoadResponseTimer()
    loadResponseTimer = window.setTimeout(() => {
      if (pendingLoadRequestId !== requestId) {
        return
      }

      pendingLoadRequestId = null
      loading.value = false
      const error = new Error('宿主返回模板 JSON 超时，请重试。')
      notify?.(error.message, 'error')
      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
        createTemplatePayload(template, {
          requestId,
          error: serializeBridgeError(error)
        })
      )
    }, TEMPLATE_LOAD_TIMEOUT_MS)
  }

  /** @returns {void} 清理宿主初始化响应超时计时器。 */
  function clearLoadResponseTimer() {
    if (loadResponseTimer !== null) {
      window.clearTimeout(loadResponseTimer)
      loadResponseTimer = null
    }
  }

  watch(
    () => createRoutePersistenceKey(route),
    (routeKey) => {
      if (isMounted && routeKey !== activeRouteKey) {
        void initialize()
      }
    }
  )

  onMounted(() => {
    isMounted = true
    void initialize()
  })

  onBeforeUnmount(() => {
    clearLoadResponseTimer()
    unsubscribeTemplateLoad()
    unsubscribeTemplateLoadFailed()
    unsubscribeTemplateSaved()
    unsubscribeTemplateSaveFailed()
  })

  return {
    loading,
    saving,
    statusText,
    template,
    initialize,
    save
  }
}

/**
 * 创建不包含 Token 的模板通信数据。
 *
 * @param {Object} template 当前模板状态。
 * @param {Object} [extra={}] 额外业务数据。
 * @returns {Object} 可结构化克隆的通信数据。
 */
function createTemplatePayload(template, extra = {}) {
  return {
    ...extra,
    mode: extra.mode ?? (template.id ? 'edit' : 'create'),
    template: {
      id: template.id,
      itemId: template.itemId,
      userId: template.userId,
      partnerId: template.partnerId,
      templateName: template.templateName,
      previewImgUrl: template.previewImgUrl
    }
  }
}

/**
 * 安全发送编辑器生命周期消息，通信异常不能阻断编辑器流程。
 *
 * @param {string} type 消息类型。
 * @param {Object} payload 通信数据。
 * @returns {{ message: Object, channels: string[] } | null} 发送结果。
 */
function postLifecycleMessage(type, payload) {
  try {
    return postBridgeMessage(type, payload)
  } catch (error) {
    console.warn('Editor lifecycle message failed.', error)
    return null
  }
}

/**
 * 将错误转换为可跨窗口传输的普通对象。
 *
 * @param {*} error 原始错误。
 * @returns {{ code: string, message: string, status: number }} 错误数据。
 */
function serializeBridgeError(error) {
  return {
    code: error?.code ?? 'EDITOR_REQUEST_FAILED',
    message: error?.message || '编辑器请求失败。',
    status: error?.status ?? 0
  }
}

/**
 * 创建空模板状态。
 *
 * @returns {Object} 模板状态。
 */
function createTemplateState() {
  return {
    id: null,
    itemId: null,
    userId: null,
    partnerId: null,
    templateName: '',
    previewImgUrl: ''
  }
}

/**
 * 清空旧模板状态，避免路由切换后沿用上一份模板元数据。
 *
 * @param {Object} target 当前模板状态。
 * @returns {void}
 */
function resetTemplateState(target) {
  Object.assign(target, createTemplateState())
}

/**
 * 创建用于监听模板路由变化的稳定键。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @returns {string} 路由持久化键。
 */
function createRoutePersistenceKey(route) {
  return createContextPersistenceKey({
    id: readRouteValue(route, TEMPLATE_ID_ROUTE_KEYS),
    itemId: readRouteValue(route, ['itemId']),
    userId: readRouteValue(route, ['userId']),
    partnerId: readRouteValue(route, ['partnerId', 'xPartnerId', 'X-Partner-Id']),
    templateName: readRouteValue(route, ['templateName']),
    previewImgUrl: readRouteValue(route, ['previewImgUrl'])
  })
}

/**
 * 将模板路由上下文转换为稳定字符串。
 *
 * @param {Object} context 模板路由上下文。
 * @returns {string} 稳定上下文键。
 */
function createContextPersistenceKey(context) {
  return JSON.stringify(ROUTE_CONTEXT_KEYS.map((key) => String(context[key] ?? '')))
}

/**
 * 读取编辑器路由中的模板上下文。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @returns {Object} 归一化的路由上下文。
 */
function readRouteContext(route) {
  return {
    id: normalizeOptionalIdentifier(readRouteValue(route, TEMPLATE_ID_ROUTE_KEYS), 'templateId'),
    itemId: normalizeOptionalIdentifier(readRouteValue(route, ['itemId']), 'itemId'),
    userId: normalizeOptionalIdentifier(readRouteValue(route, ['userId']), 'userId'),
    partnerId: normalizeOptionalIdentifier(
      readRouteValue(route, ['partnerId', 'xPartnerId', 'X-Partner-Id']),
      'X-Partner-Id'
    ),
    templateName: normalizeOptionalText(readRouteValue(route, ['templateName'])),
    previewImgUrl: normalizeOptionalText(readRouteValue(route, ['previewImgUrl'])),
    authorization: normalizeOptionalText(readRouteValue(route, TOKEN_QUERY_KEYS))
  }
}

/**
 * 读取第一个已设置的路由值。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @param {string[]} keys 兼容字段。
 * @returns {*} 路由原始值。
 */
function readRouteValue(route, keys) {
  for (const key of keys) {
    const value = route.params?.[key] ?? route.query?.[key]

    if (value !== undefined && value !== null && value !== '') {
      return Array.isArray(value) ? value[0] : value
    }
  }

  return null
}

/**
 * 应用路由中显式传入的模板上下文。
 *
 * @param {Object} target 模板状态。
 * @param {Object} context 路由上下文。
 * @returns {void}
 */
function applyRouteContext(target, context) {
  Object.entries(context).forEach(([key, value]) => {
    if (key !== 'authorization' && value !== null) {
      target[key] = value
    }
  })
}

/**
 * 应用路由 Token 并从地址栏清除敏感参数。
 *
 * @param {Object} context 路由上下文。
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @param {import('vue-router').Router} router Vue Router 实例。
 * @returns {Promise<void>}
 */
async function applyRouteAuthorization(context, route, router) {
  if (!context.authorization) {
    return
  }

  setAccessToken(context.authorization)
  const query = { ...route.query }
  TOKEN_QUERY_KEYS.forEach((key) => delete query[key])
  await router.replace({
    name: route.name,
    params: route.params,
    query
  })
}

/**
 * 将宿主返回的模板上下文合并到当前模板状态。
 *
 * 路由显式值优先于接口值。
 *
 * @param {Object} target 模板状态。
 * @param {Object} record 接口模板记录。
 * @param {Object} context 路由上下文。
 * @returns {void}
 */
function applyTemplateRecord(target, record, context) {
  target.id = context.id ?? normalizeOptionalIdentifier(record.id, 'id') ?? target.id
  target.itemId = context.itemId ?? normalizeOptionalIdentifier(record.itemId, 'itemId') ?? target.itemId
  target.userId = context.userId ?? normalizeOptionalIdentifier(record.userId, 'userId') ?? target.userId
  target.partnerId =
    context.partnerId ?? normalizeOptionalIdentifier(record.partnerId, 'partnerId') ?? target.partnerId
  target.templateName = context.templateName ?? normalizeOptionalText(record.templateName) ?? target.templateName
  target.previewImgUrl = context.previewImgUrl ?? normalizeOptionalText(record.previewImgUrl) ?? target.previewImgUrl
}

/**
 * 调用编辑器统一文档 API 加载模板内容。
 *
 * @param {Object} editor `useCanvasEditor()` 返回值。
 * @param {string | Object | null | undefined} content 模板 JSON。
 * @returns {Promise<Object | null>} 加载结果。
 */
async function loadTemplateContent(editor, content) {
  if (content === undefined || content === null || content === '') {
    return null
  }

  return editor.loadDocument(content)
}

/**
 * 判断宿主响应是否属于当前初始化请求。
 *
 * 未携带 requestId 时兼容旧宿主；携带时必须与当前请求一致。
 *
 * @param {*} responseRequestId 宿主响应中的请求 ID。
 * @param {string | null} pendingRequestId 当前等待中的请求 ID。
 * @returns {boolean} 是否应该处理该响应。
 */
function isMatchingRequest(responseRequestId, pendingRequestId) {
  if (responseRequestId === undefined || responseRequestId === null || responseRequestId === '') {
    return Boolean(pendingRequestId)
  }

  return String(responseRequestId) === String(pendingRequestId)
}

/** @param {*} value 待检查值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 归一化可选 ID。
 *
 * @param {*} value 原始值。
 * @param {string} name 字段名。
 * @returns {number | string | null} 正整数 ID 或 null。
 */
function normalizeOptionalIdentifier(value, name) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return normalizeRequiredIdentifier(value, name)
}

/**
 * 归一化必填 ID。
 *
 * @param {*} value 原始值。
 * @param {string} name 字段名。
 * @returns {number | string} 正整数 ID。
 */
function normalizeRequiredIdentifier(value, name) {
  const id = parsePositiveIntegerId(value)

  if (id === null) {
    throw new Error(`${name} 必须是正整数。`)
  }

  return id
}

/** @param {*} value 原始值。 @returns {string | null} 非空字符串或 null。 */
function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text || null
}
