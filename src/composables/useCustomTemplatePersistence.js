import { computed, onMounted, reactive, ref } from 'vue'

import { customTemplateApi } from '../api/modules/custom-template.js'
import { resolveCustomTemplateRecord } from '../services/custom-template-document.js'
import { setAccessToken } from '../services/auth-token.js'
import { MESSAGE_TYPES, postBridgeMessage } from '../services/message-bridge.js'

const TOKEN_QUERY_KEYS = ['token', 'authorization', 'Authorization']

/**
 * 管理编辑器路由与自定义模板接口之间的加载、创建和更新流程。
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
  let routeContext = readRouteContext(route)

  const statusText = computed(() => {
    if (loading.value) {
      return '加载中'
    }

    return template.id ? `模板 #${template.id}` : '新建模板'
  })

  /**
   * 根据路由上下文初始化模板。
   *
   * @returns {Promise<Object | null>} 已加载的模板记录。
   */
  async function initialize() {
    if (loading.value) {
      return null
    }

    loading.value = true
    try {
      routeContext = readRouteContext(route)
      applyRouteContext(template, routeContext)
      if (routeContext.id) {
        postLifecycleMessage(
          MESSAGE_TYPES.TEMPLATE_LOADING,
          createTemplatePayload(template, {
            mode: 'edit'
          })
        )
      }
      await applyRouteAuthorization(routeContext, route, router)

      if (!routeContext.id) {
        postLifecycleMessage(
          MESSAGE_TYPES.EDITOR_INITIALIZED,
          createTemplatePayload(template, {
            mode: 'create'
          })
        )
        return null
      }

      const response = await customTemplateApi.detail(routeContext.id, createRequestOptions(template))
      const record = resolveCustomTemplateRecord(response)

      if (!record) {
        throw new Error('模板详情接口未返回有效数据。')
      }
      applyTemplateRecord(template, record, routeContext)
      await loadTemplateContent(editor, record.content)
      editor.fitArtboardToView()
      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_LOADED,
        createTemplatePayload(template, {
          mode: 'edit'
        })
      )
      postLifecycleMessage(
        MESSAGE_TYPES.EDITOR_INITIALIZED,
        createTemplatePayload(template, {
          mode: 'edit'
        })
      )
      return record
    } catch (error) {
      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
        createTemplatePayload(template, {
          error: serializeBridgeError(error)
        })
      )
      notify?.(error?.message || '模板加载失败。', 'error')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存当前编辑器 JSON。
   *
   * 没有 id 时调用 POST，有 id 时调用 PUT。
   *
   * @returns {Promise<{ created: boolean, id: number | null, response: * }>} 保存结果。
   */
  async function save() {
    if (loading.value || saving.value) {
      return null
    }

    saving.value = true
    try {
      if (!editor.ready?.value) {
        throw new Error('编辑器尚未初始化，无法保存模板。')
      }

      const document = editor.exportDocument()

      if (!document) {
        throw new Error('编辑器尚未初始化，无法保存模板。')
      }

      const created = !template.id
      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_SAVING,
        createTemplatePayload(template, {
          action: created ? 'create' : 'update'
        })
      )
      const dto = createSaveDto(template, document)
      const response = created
        ? await customTemplateApi.create(dto, createRequestOptions(template))
        : await customTemplateApi.update(dto, createRequestOptions(template))
      const responseRecord = resolveCustomTemplateRecord(response)

      if (responseRecord) {
        applyTemplateRecord(template, responseRecord, routeContext)
      }

      if (created && !template.id) {
        template.id = resolveTemplateId(response) ?? (await resolveCreatedTemplateId(template))
      }

      if (template.id) {
        await syncRouteTemplateId(route, router, template.id)
      }

      postLifecycleMessage(
        MESSAGE_TYPES.TEMPLATE_SAVED,
        createTemplatePayload(template, {
          action: created ? 'create' : 'update',
          success: true,
          document
        })
      )
      return { created, id: template.id, response }
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

  onMounted(initialize)

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
 * 读取编辑器路由中的模板上下文。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @returns {Object} 归一化的路由上下文。
 */
function readRouteContext(route) {
  return {
    id: normalizeOptionalIdentifier(readRouteValue(route, ['id']), 'id'),
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
 * 将接口记录合并到当前模板状态。
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
 * 创建模板保存 DTO。
 *
 * @param {Object} template 当前模板状态。
 * @param {Object} document 编辑器统一文档。
 * @returns {Object} 后端保存 DTO。
 */
function createSaveDto(template, document) {
  const itemId = normalizeRequiredIdentifier(template.itemId, 'itemId')

  return {
    content: JSON.stringify(document),
    id: template.id ?? 0,
    itemId,
    previewImgUrl: template.previewImgUrl || '',
    templateName: template.templateName || '未命名模板'
  }
}

/**
 * 创建带分销商上下文的请求配置。
 *
 * @param {Object} template 模板状态。
 * @returns {{ partnerId: number | null }} 请求配置。
 */
function createRequestOptions(template) {
  return { partnerId: template.partnerId }
}

/**
 * 在创建接口未直接返回 ID 时通过列表查询补齐。
 *
 * @param {Object} template 当前模板状态。
 * @returns {Promise<number | null>} 新模板 ID。
 */
async function resolveCreatedTemplateId(template) {
  const response = await customTemplateApi.list(
    {
      itemId: template.itemId,
      templateName: template.templateName || undefined,
      userId: template.userId,
      page: 0,
      size: 1,
      sort: ['id,desc']
    },
    createRequestOptions(template)
  )
  const record = resolveTemplateList(response)[0]
  return normalizeOptionalIdentifier(record?.id, 'id')
}

/**
 * 将新建后的模板 ID 写回路由。
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route 当前路由。
 * @param {import('vue-router').Router} router Vue Router 实例。
 * @param {number} id 模板 ID。
 * @returns {Promise<void>}
 */
async function syncRouteTemplateId(route, router, id) {
  const currentId = route.params.id ?? route.query.id

  if (String(currentId ?? '') === String(id)) {
    return
  }

  await router.replace({
    name: route.name,
    params: route.params,
    query: {
      ...route.query,
      id: String(id)
    }
  })
}

/**
 * 从常见新增响应中提取模板 ID。
 *
 * @param {*} value 服务端响应。
 * @param {number} [depth=0] 当前解包深度。
 * @returns {number | null} 模板 ID。
 */
function resolveTemplateId(value, depth = 0) {
  if (depth > 4 || value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return normalizeResponseIdentifier(value)
  }

  if (!isPlainObject(value)) {
    return null
  }

  const ownId = normalizeResponseIdentifier(value.id)
  if (ownId) {
    return ownId
  }

  for (const key of ['data', 'result', 'body']) {
    const id = resolveTemplateId(value[key], depth + 1)

    if (id) {
      return id
    }
  }

  return null
}

/**
 * 宽容解析服务端返回的模板 ID。
 *
 * @param {*} value 服务端原始值。
 * @returns {number | null} 正整数 ID 或 null。
 */
function normalizeResponseIdentifier(value) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

/**
 * 从常见分页响应中提取模板列表。
 *
 * @param {*} value 服务端响应。
 * @param {number} [depth=0] 当前解包深度。
 * @returns {Object[]} 模板列表。
 */
function resolveTemplateList(value, depth = 0) {
  if (Array.isArray(value)) {
    return value
  }
  if (!isPlainObject(value) || depth > 4) {
    return []
  }

  for (const key of ['content', 'list', 'records', 'rows']) {
    if (Array.isArray(value[key])) {
      return value[key]
    }
  }

  for (const key of ['data', 'result', 'body']) {
    const list = resolveTemplateList(value[key], depth + 1)

    if (list.length) {
      return list
    }
  }

  return []
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
 * @returns {number | null} 正整数 ID 或 null。
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
 * @returns {number} 正整数 ID。
 */
function normalizeRequiredIdentifier(value, name) {
  const number = Number(value)

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${name} 必须是正整数。`)
  }

  return number
}

/** @param {*} value 原始值。 @returns {string | null} 非空字符串或 null。 */
function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text || null
}
