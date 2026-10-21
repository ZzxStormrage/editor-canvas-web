import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { setAccessToken } from '../services/auth-token.js'
import {
  normalizeMaterialGroupIds,
  resolveMaterialGroupMessageConfig
} from './canvas-editor/material-group-data.js'
import { resolveAiSubjectMessageConfig } from './canvas-editor/ai-subject-data.js'
import {
  MESSAGE_TYPES,
  postBridgeMessage,
  subscribeBridgeMessage
} from '../services/message-bridge.js'

const TOKEN_QUERY_KEYS = ['token', 'authorization', 'Authorization']

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
  const components = options.components ?? null
  const notify = typeof options.onMessage === 'function' ? options.onMessage : null
  const loading = ref(false)
  const saving = ref(false)
  const template = reactive(createTemplateState())
  let initializationVersion = 0
  let pendingSaveRequestId = null
  let hasReceivedTemplateLoad = false
  const unsubscribeTemplateLoad = subscribeBridgeMessage(
    MESSAGE_TYPES.TEMPLATE_LOAD,
    handleTemplateLoadMessage
  )
  const unsubscribeEditorConfig = subscribeBridgeMessage(
    MESSAGE_TYPES.EDITOR_CONFIG,
    handleEditorConfigMessage
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
   * 初始化空白编辑器；宿主 JSON 作为可选的后续输入。
   *
   * @returns {Promise<void>} 初始化等待流程。
   */
  async function initialize() {
    const version = ++initializationVersion
    loading.value = true
    hasReceivedTemplateLoad = false
    try {
      resetTemplateState(template)
      void editor.setMaterialGroups([])
      const authorization = readRouteAuthorization(route)
      await applyRouteAuthorization(authorization, route, router)
      const coreEditor = await editor.whenReady()

      if (version !== initializationVersion) {
        return null
      }

      coreEditor.clearDocument?.()
      components?.reset?.()
      if (!hasReceivedTemplateLoad) {
        loading.value = false
        postLifecycleMessage(
          MESSAGE_TYPES.EDITOR_INITIALIZED,
          createTemplatePayload(template, { mode: 'create' })
        )
      }
    } catch (error) {
      if (version === initializationVersion) {
        loading.value = false
        postLifecycleMessage(
          MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
          createTemplatePayload(template, {
            error: serializeBridgeError(error)
          })
        )
        notify?.(error?.message || '模板初始化失败。', 'error')
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
    const version = initializationVersion
    hasReceivedTemplateLoad = true
    loading.value = true
    try {
      const incomingTemplate = isPlainObject(payload.template) ? payload.template : {}
      const document = payload.document ?? payload.content ?? incomingTemplate.content ?? null
      const materialGroupConfig = resolveMaterialGroupMessageConfig(payload)
      editor.setAiSubjects(resolveAiSubjectMessageConfig(payload))
      resetTemplateState(template)
      applyTemplateRecord(template, incomingTemplate)
      if (materialGroupConfig.hasMaterialGroupConfig) {
        template.materialGroupIds = materialGroupConfig.materialGroupIds
        void editor.setMaterialGroups(materialGroupConfig.materialGroups, {
          partnerId: template.partnerId,
          activeGroupId: materialGroupConfig.materialGroupId
        })
      }
      const coreEditor = await editor.whenReady()

      if (version !== initializationVersion) {
        return null
      }

      coreEditor.clearDocument?.()
      const loadedDocument = components
        ? await components.load(document)
        : await loadTemplateContent(editor, document)
      if (loadedDocument) {
        editor.fitArtboardToView()
      }
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
   * 接收运行时编辑器配置；当前先支持素材组列表和默认素材组 ID。
   *
   * 该消息只更新应用层配置，不会清空画布、重新导入 JSON 或写入撤销历史。
   *
   * @param {{ payload?: Object }} event 消息订阅事件。
   * @returns {Promise<Object[] | null>} 默认素材组第一页素材。
   */
  async function handleEditorConfigMessage({ payload = {} }) {
    const materialGroupConfig = resolveMaterialGroupMessageConfig(payload)
    editor.setAiSubjects(resolveAiSubjectMessageConfig(payload))
    if (!materialGroupConfig.hasMaterialGroupConfig) {
      return null
    }

    try {
      template.materialGroupIds = materialGroupConfig.materialGroupIds
      const materials = await editor.setMaterialGroups(materialGroupConfig.materialGroups, {
        partnerId: resolveConfigPartnerId(payload, template.partnerId),
        activeGroupId: materialGroupConfig.materialGroupId
      })
      postLifecycleMessage(MESSAGE_TYPES.EDITOR_CONFIG_APPLIED, {
        requestId: payload.requestId ?? null,
        materialGroupId: editor.activeMaterialGroupId.value,
        materialGroups: [...template.materialGroupIds],
        materialGroupCount: editor.materialGroups.value.length
      })
      return materials
    } catch (error) {
      postLifecycleMessage(MESSAGE_TYPES.EDITOR_CONFIG_FAILED, {
        requestId: payload.requestId ?? null,
        error: serializeBridgeError(error)
      })
      notify?.(error?.message || '素材组配置接收失败。', 'error')
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
    loading.value = false
    void editor.setMaterialGroups([])
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

      const document = components?.exportDocument?.() ?? editor.exportDocument()

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
    if (!isMatchingSaveRequest(payload.requestId, pendingSaveRequestId)) {
      return
    }

    if (isPlainObject(payload.template)) {
      applyTemplateRecord(template, payload.template)
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
    if (!isMatchingSaveRequest(payload.requestId, pendingSaveRequestId)) {
      return
    }

    pendingSaveRequestId = null
    notify?.(payload.error?.message || '宿主保存模板失败。', 'error')
  }

  onMounted(() => {
    void initialize()
  })

  onBeforeUnmount(() => {
    unsubscribeTemplateLoad()
    unsubscribeEditorConfig()
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
 * 读取素材请求需要的分销商 ID。
 *
 * @param {Object} payload 编辑器配置消息 payload。
 * @param {string | number | null} fallback 模板中的分销商 ID。
 * @returns {string | number | null} 分销商 ID。
 */
function resolveConfigPartnerId(payload, fallback) {
  const nestedConfig = isPlainObject(payload?.config) ? payload.config : {}
  return nestedConfig.partnerId ?? payload?.partnerId ?? fallback ?? null
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
      materialGroups: [...template.materialGroupIds],
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
    materialGroupIds: [],
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
 * 读取路由中的 Token，不读取模板 ID 或业务模板字段。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @returns {string | null} 运行时 Token。
 */
function readRouteAuthorization(route) {
  return normalizeOptionalText(readRouteValue(route, TOKEN_QUERY_KEYS))
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
 * 应用路由 Token 并从地址栏清除敏感参数。
 *
 * @param {string | null} authorization 运行时 Token。
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @param {import('vue-router').Router} router Vue Router 实例。
 * @returns {Promise<void>}
 */
async function applyRouteAuthorization(authorization, route, router) {
  if (!authorization) {
    return
  }

  setAccessToken(authorization)
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
 * @param {Object} target 模板状态。
 * @param {Object} record 宿主传入的模板元数据。
 * @returns {void}
 */
function applyTemplateRecord(target, record) {
  target.id = normalizeOptionalText(record.id) ?? target.id
  target.itemId = normalizeOptionalText(record.itemId) ?? target.itemId
  target.userId = normalizeOptionalText(record.userId) ?? target.userId
  target.partnerId = normalizeOptionalText(record.partnerId) ?? target.partnerId
  if (
    Object.prototype.hasOwnProperty.call(record, 'materialGroups')
    || Object.prototype.hasOwnProperty.call(record, 'materialGroupId')
    || Object.prototype.hasOwnProperty.call(record, 'materialGroupIds')
  ) {
    target.materialGroupIds = normalizeMaterialGroupIds(
      record.materialGroups ?? record.materialGroupIds ?? record.materialGroupId
    )
  }
  target.templateName = normalizeOptionalText(record.templateName) ?? target.templateName
  target.previewImgUrl = normalizeOptionalText(record.previewImgUrl) ?? target.previewImgUrl
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
 * 判断宿主保存回执是否属于当前保存请求。
 *
 * @param {*} responseRequestId 宿主回执中的请求 ID。
 * @param {string | null} pendingRequestId 当前等待中的保存请求 ID。
 * @returns {boolean} 是否应该处理该回执。
 */
function isMatchingSaveRequest(responseRequestId, pendingRequestId) {
  return Boolean(pendingRequestId) && String(responseRequestId ?? '') === pendingRequestId
}

/** @param {*} value 待检查值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** @param {*} value 原始值。 @returns {string | null} 非空字符串或 null。 */
function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text || null
}
