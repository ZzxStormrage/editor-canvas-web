/**
 * 从模板初始化消息中读取素材组分页数据。
 *
 * @param {Object} payload `template:load` 消息 payload。
 * @returns {*} 素材组原始分页数据。
 */
export function resolveTemplateMaterialGroups(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return []
  }

  return payload.materialGroups
    ?? payload.materialGroupPage
    ?? payload.materialGroupList
    ?? []
}

/**
 * 从跨端配置消息中读取素材组列表和默认素材组 ID。
 *
 * 支持直接放在 payload，也支持放在 `payload.config`。只传素材组 ID 时会生成可请求的
 * 临时分组，名称优先使用 `materialGroupName`。
 *
 * @param {Object} payload `editor:config` 或 `template:load` 消息 payload。
 * @returns {{ materialGroups: Object[], materialGroupIds: Array<string | number>,
 * materialGroupId: string | number | null,
 * hasMaterialGroupConfig: boolean }} 素材组配置。
 */
export function resolveMaterialGroupMessageConfig(payload) {
  if (!isPlainObject(payload)) {
    return createEmptyMaterialGroupConfig()
  }

  const nestedConfig = isPlainObject(payload.config) ? payload.config : {}
  const templateConfig = isPlainObject(payload.template) ? payload.template : {}
  const configSources = [nestedConfig, payload, templateConfig]
  const materialGroup = resolveConfigValue(configSources, 'materialGroup')
  const rawGroups = resolveConfigValue(configSources, 'materialGroups')
    ?? resolveConfigValue(configSources, 'materialGroupPage')
    ?? resolveConfigValue(configSources, 'materialGroupList')
    ?? (isPlainObject(materialGroup) ? [materialGroup] : [])
  const materialGroupIds = normalizeMaterialGroupIds(
    resolveConfigValue(configSources, 'materialGroupIds')
      ?? resolveConfigValue(configSources, 'materialGroupId')
      ?? materialGroup?.id
  )
  const materialGroupId = normalizePositiveId(
    resolveConfigValue(configSources, 'activeMaterialGroupId')
  ) ?? materialGroupIds[0] ?? null
  const materialGroupName = normalizeText(
    resolveConfigValue(configSources, 'materialGroupName')
      ?? materialGroup?.groupName
      ?? materialGroup?.name
  )
  const materialGroups = normalizeMaterialGroups(rawGroups)

  materialGroupIds.forEach((groupId, index) => {
    appendMissingMaterialGroup(
      materialGroups,
      groupId,
      materialGroupIds.length === 1 || index === 0 ? materialGroupName : null
    )
  })

  return {
    materialGroups,
    materialGroupIds,
    materialGroupId,
    hasMaterialGroupConfig: hasMaterialGroupKeys(payload)
      || hasMaterialGroupKeys(nestedConfig)
      || hasMaterialGroupKeys(templateConfig)
  }
}

/**
 * 归一化单个、数组或逗号分隔的素材组 ID。
 *
 * @param {*} value 素材组 ID 输入。
 * @returns {Array<string | number>} 去重后的有效 ID。
 */
export function normalizeMaterialGroupIds(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.includes(',')
      ? value.split(',')
      : [value]
  const ids = []
  const seen = new Set()

  source.forEach((item) => {
    const id = normalizePositiveId(item)
    const key = String(id ?? '')
    if (id === null || seen.has(key)) {
      return
    }

    seen.add(key)
    ids.push(id)
  })

  return ids
}

/**
 * 归一化宿主传入的素材组列表。
 *
 * @param {*} response 数组、分页对象或 data 包装响应。
 * @returns {Object[]} 可供界面使用的素材组。
 */
export function normalizeMaterialGroups(response) {
  const list = resolvePageList(response)
  const ids = new Set()

  return list.reduce((groups, item) => {
    const id = normalizePositiveId(item?.id)
    const groupName = normalizeText(item?.groupName ?? item?.name)

    if (!id || !groupName || ids.has(id)) {
      return groups
    }

    ids.add(id)
    groups.push({
      ...item,
      id,
      groupName
    })
    return groups
  }, [])
}

/**
 * 归一化素材分页响应。
 *
 * @param {*} response 接口响应。
 * @param {{ page: number, size: number }} pagination 当前请求分页参数。
 * @returns {{ items: Object[], totalElements: number, hasKnownTotal: boolean, hasMore: boolean }}
 * 素材分页结果。
 */
export function normalizeMaterialPage(response, pagination) {
  const payload = resolvePagePayload(response)
  const sourceItems = resolvePageList(payload)
  const ids = new Set()
  const items = sourceItems.reduce((materials, item) => {
    const materialUrl = normalizeText(
      item?.materialUrl ?? item?.imageUrl ?? item?.url ?? item?.ossUrl
    )
    const id = normalizeMaterialId(item, materialUrl)

    if (!materialUrl || ids.has(id)) {
      return materials
    }

    ids.add(id)
    materials.push({
      ...item,
      id,
      materialName: normalizeText(item?.materialName ?? item?.name) ?? '未命名素材',
      materialUrl
    })
    return materials
  }, [])
  const page = normalizeNonNegativeInteger(payload?.number, pagination.page)
  const size = normalizePositiveInteger(payload?.size, pagination.size)
  const rawTotalElements = payload?.totalElements ?? payload?.total
  const hasKnownTotal = isNonNegativeInteger(rawTotalElements)
  const totalElements = normalizeNonNegativeInteger(
    rawTotalElements,
    page * size + items.length
  )
  const hasMore = typeof payload?.last === 'boolean'
    ? !payload.last
    : totalElements > page * size + sourceItems.length
      || (!hasKnownTotal && sourceItems.length >= size)

  return { items, totalElements, hasKnownTotal, hasMore }
}

/**
 * 合并素材分页并按 ID 去重。
 *
 * @param {Object[]} current 已有素材。
 * @param {Object[]} incoming 新一页素材。
 * @returns {Object[]} 合并结果。
 */
export function mergeMaterialPages(current, incoming) {
  const materials = []
  const ids = new Set()
  const source = [...(current ?? []), ...(incoming ?? [])]

  source.forEach((item) => {
    const id = String(item?.id ?? item?.materialUrl ?? '')
    if (!id || ids.has(id)) {
      return
    }

    ids.add(id)
    materials.push(item)
  })
  return materials
}

/** @param {*} value 原始响应。 @returns {*} 实际分页对象。 */
function resolvePagePayload(value) {
  if (Array.isArray(value) || !value || typeof value !== 'object') {
    return value
  }

  if (hasPageList(value)) {
    return value
  }

  return value.data && typeof value.data === 'object' ? value.data : value
}

/** @param {*} value 原始响应。 @returns {Array} 分页列表。 */
function resolvePageList(value) {
  const payload = resolvePagePayload(value)
  if (Array.isArray(payload)) {
    return payload
  }

  return payload?.content ?? payload?.records ?? payload?.list ?? []
}

/**
 * 获取顶层或 config 中的配置字段。
 *
 * @param {Object[]} sources 按优先级排列的配置来源。
 * @param {string} key 字段名。
 * @returns {*} 配置值。
 */
function resolveConfigValue(sources, key) {
  return sources.find((source) => source[key] !== undefined)?.[key]
}

/**
 * 素材组 ID 不在列表中时补充临时分组，确保仍可请求组内素材。
 *
 * @param {Object[]} materialGroups 已归一化分组。
 * @param {string | number | null} materialGroupId 默认素材组 ID。
 * @param {string | null} materialGroupName 素材组名称。
 * @returns {void}
 */
function appendMissingMaterialGroup(materialGroups, materialGroupId, materialGroupName) {
  if (
    materialGroupId === null
    || materialGroups.some((group) => String(group.id) === String(materialGroupId))
  ) {
    return
  }

  materialGroups.push({
    id: materialGroupId,
    groupName: materialGroupName || `素材组 #${materialGroupId}`
  })
}

/** @param {Object} value 配置对象。 @returns {boolean} 是否包含素材组字段。 */
function hasMaterialGroupKeys(value) {
  return [
    'materialGroups',
    'materialGroupPage',
    'materialGroupList',
    'materialGroup',
    'materialGroupId',
    'materialGroupIds',
    'activeMaterialGroupId',
    'materialGroupName'
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key))
}

/**
 * 创建空素材组配置。
 *
 * @returns {{ materialGroups: Object[], materialGroupIds: [], materialGroupId: null,
 * hasMaterialGroupConfig: false }} 空配置。
 */
function createEmptyMaterialGroupConfig() {
  return {
    materialGroups: [],
    materialGroupIds: [],
    materialGroupId: null,
    hasMaterialGroupConfig: false
  }
}

/** @param {Object} value 对象。 @returns {boolean} 是否直接包含分页列表。 */
function hasPageList(value) {
  return Array.isArray(value.content)
    || Array.isArray(value.records)
    || Array.isArray(value.list)
}

/** @param {*} value 原始 ID。 @returns {number | string | null} 有效 ID。 */
function normalizePositiveId(value) {
  const number = Number(value)
  if (Number.isSafeInteger(number) && number > 0) {
    return number
  }

  const text = normalizeText(value)
  return text && text !== '0' ? text : null
}

/** @param {Object} item 素材对象。 @param {string | null} url 图片地址。 @returns {string} 稳定 ID。 */
function normalizeMaterialId(item, url) {
  return String(item?.id ?? url ?? '')
}

/** @param {*} value 原始值。 @returns {string | null} 非空文本。 */
function normalizeText(value) {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()
  return text || null
}

/** @param {*} value 原始值。 @param {number} fallback 回退值。 @returns {number} 非负整数。 */
function normalizeNonNegativeInteger(value, fallback) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback
}

/** @param {*} value 原始值。 @param {number} fallback 回退值。 @returns {number} 正整数。 */
function normalizePositiveInteger(value, fallback) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}

/** @param {*} value 原始值。 @returns {boolean} 是否为非负整数。 */
function isNonNegativeInteger(value) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0
}

/** @param {*} value 原始值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
