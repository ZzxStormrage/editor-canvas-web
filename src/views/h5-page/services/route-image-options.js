import { readRouteValue } from './route-navigation.js'

/**
 * 从 H5 路由参数中读取图片选项。
 *
 * 参数支持单个 URL、重复参数，以及 URL 编码后的 JSON 数组：
 * [{ "id": "theme-1", "label": "水墨", "url": "https://...", "selected": true }]
 *
 * @param {Object} query Vue Router 查询参数。
 * @param {string[]} keys 可接受的参数名，按优先级读取。
 * @param {string} idPrefix 自动 ID 前缀。
 * @returns {{ id: string, label: string, url: string, selected: boolean }[]} 图片选项。
 */
export function readRouteImageOptions(query, keys, idPrefix) {
  const rawValue = keys.map((key) => query?.[key]).find((value) => value != null)
  const entries = parseRouteOptionValue(rawValue)
  const seenUrls = new Set()
  const seenIds = new Set()

  return entries.flatMap((entry, index) => {
    const option = normalizeImageOption(entry, index, idPrefix)
    if (!option || seenUrls.has(option.url)) {
      return []
    }

    if (seenIds.has(option.id)) {
      option.id = `${idPrefix}-${index + 1}`
    }
    seenUrls.add(option.url)
    seenIds.add(option.id)
    return [option]
  })
}

/** @param {*} value 路由参数。 @returns {*[]} 待归一化选项。 */
function parseRouteOptionValue(value) {
  const values = Array.isArray(value) ? value : [readRouteValue(value)]

  return values.flatMap((item) => {
    if (typeof item !== 'string') {
      return item == null ? [] : [item]
    }

    const text = item.trim()
    if (!text) {
      return []
    }

    const parsed = parseJsonValue(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  })
}

/** @param {string} value 路由字符串。 @returns {*} JSON 值或原字符串。 */
function parseJsonValue(value) {
  if (!value.startsWith('[') && !value.startsWith('{')) {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * @param {*} value 原始选项。
 * @param {number} index 选项序号。
 * @param {string} idPrefix ID 前缀。
 * @returns {{ id: string, label: string, url: string, selected: boolean } | null} 图片选项。
 */
function normalizeImageOption(value, index, idPrefix) {
  const source = typeof value === 'string' ? { url: value } : value
  if (!source || typeof source !== 'object') {
    return null
  }

  const url = normalizeImageUrl(source.url ?? source.imageUrl ?? source.src)
  if (!url) {
    return null
  }

  return {
    id: normalizeText(source.id) || `${idPrefix}-${index + 1}`,
    label: normalizeText(source.label ?? source.name ?? source.title)
      || resolveDefaultLabel(idPrefix, index),
    url,
    selected: source.selected === true
  }
}

/** @param {*} value 图片地址。 @returns {string | null} 安全图片地址。 */
function normalizeImageUrl(value) {
  const url = normalizeText(value)
  if (!url || !/^(https?:\/\/|\/)/i.test(url) || url.startsWith('//')) {
    return null
  }

  return url
}

/** @param {*} value 文本值。 @returns {string} 去除首尾空白的文本。 */
function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** @param {string} idPrefix ID 前缀。 @param {number} index 序号。 @returns {string} 默认名称。 */
function resolveDefaultLabel(idPrefix, index) {
  return `${idPrefix === 'background' ? '背景' : '主题'}${index + 1}`
}
