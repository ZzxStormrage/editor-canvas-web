const loadedFontFaces = new Map()
const fontFaceRequests = new Map()
const FONT_WEIGHT_VALUES = Object.freeze({
  thin: 100,
  'extra-light': 200,
  light: 300,
  normal: 400,
  medium: 500,
  'semi-bold': 600,
  bold: 700,
  'extra-bold': 800,
  black: 900
})
const MEDIUM_WEIGHT_STROKE_RATIO = 0.02
const BOLD_WEIGHT_STROKE_RATIO = 0.045

/**
 * 计算单文件远程字体的视觉字重补偿描边。
 *
 * 字体接口目前只提供一个静态字体文件，无法保证浏览器生成 500/700 字重。
 * 本方法只为远程字体提供补偿，系统字体继续使用浏览器原生字重。
 *
 * @param {number | string} fontSize 字号。
 * @param {number | string} fontWeight 字重。
 * @param {string | undefined | null} fontUrl 远程字体地址。
 * @returns {number} 补偿描边宽度；0 表示无需补偿。
 */
export function resolveSyntheticFontWeightStroke(fontSize, fontWeight, fontUrl) {
  if (!normalizeFontUrl(fontUrl)) {
    return 0
  }

  const size = Number(fontSize)
  const weight = normalizeFontWeight(fontWeight)
  if (!Number.isFinite(size) || size <= 0 || weight < 500) {
    return 0
  }

  const isBold = weight >= 700
  const ratio = isBold ? BOLD_WEIGHT_STROKE_RATIO : MEDIUM_WEIGHT_STROKE_RATIO
  const minimum = isBold ? 0.65 : 0.3
  return Number(Math.min(3, Math.max(minimum, size * ratio)).toFixed(2))
}

/**
 * 从导出数据中恢复文字原有描边，移除运行时字重补偿。
 *
 * @param {Object} renderData Leafer 序列化数据。
 * @param {Object} [original={}] 应用补偿前的文字描边。
 * @returns {Object} 已清理的序列化数据。
 */
export function sanitizeSyntheticFontWeightData(renderData, original = {}) {
  for (const key of ['stroke', 'strokeWidth', 'strokeAlign']) {
    if (original[key] === undefined) {
      delete renderData[key]
    } else {
      renderData[key] = original[key]
    }
  }

  return renderData
}

/**
 * 加载并注册浏览器字体。
 *
 * 相同字体名和 URL 只加载一次；同名字体更换 URL 时会替换旧 FontFace。
 *
 * @param {string | undefined} fontFamily 字体名称。
 * @param {string | undefined} fontUrl 字体文件地址。
 * @returns {Promise<boolean>} 是否存在可加载字体且已完成注册。
 */
export async function loadFontFace(fontFamily, fontUrl) {
  const family = normalizeFontFamilyName(fontFamily)
  const url = normalizeFontUrl(fontUrl)

  if (!family || !url || typeof globalThis.FontFace !== 'function' || !globalThis.document?.fonts) {
    return false
  }

  const loaded = loadedFontFaces.get(family)
  if (loaded?.url === url) {
    return true
  }

  const requestKey = `${family}\u0000${url}`
  if (!fontFaceRequests.has(requestKey)) {
    fontFaceRequests.set(requestKey, createFontFaceRequest(family, url, requestKey))
  }

  await fontFaceRequests.get(requestKey)
  return true
}

/**
 * 递归加载统一编辑器文档中的全部远程字体。
 *
 * @param {Object[]} [elements=[]] 文档元素列表。
 * @returns {Promise<void>} 全部字体注册完成。
 */
export async function loadDocumentFonts(elements = []) {
  const fontSources = new Map()

  visitElements(elements, (element) => {
    if (String(element?.tag ?? '').toLowerCase() !== 'text') {
      return
    }

    const family = normalizeFontFamilyName(element.fontFamily)
    const url = normalizeFontUrl(element.fontUrl)
    if (family && url && !fontSources.has(family)) {
      fontSources.set(family, url)
    }
  })

  await Promise.all([...fontSources].map(([family, url]) => loadFontFace(family, url)))
}

/**
 * 创建字体加载请求并维护全局缓存。
 *
 * @private
 * @param {string} family 字体名称。
 * @param {string} url 字体文件地址。
 * @param {string} requestKey 请求缓存键。
 * @returns {Promise<void>} 字体注册请求。
 */
async function createFontFaceRequest(family, url, requestKey) {
  try {
    const fontFace = await new globalThis.FontFace(family, `url(${JSON.stringify(url)})`).load()
    const previous = loadedFontFaces.get(family)

    if (previous?.fontFace && previous.fontFace !== fontFace) {
      globalThis.document.fonts.delete(previous.fontFace)
    }

    globalThis.document.fonts.add(fontFace)
    loadedFontFaces.set(family, { fontFace, url })
  } finally {
    fontFaceRequests.delete(requestKey)
  }
}

/**
 * 递归遍历文档元素。
 *
 * @private
 * @param {Object[]} elements 文档元素。
 * @param {(element: Object) => void} visitor 节点访问器。
 * @returns {void}
 */
function visitElements(elements, visitor) {
  if (!Array.isArray(elements)) {
    return
  }

  elements.forEach((element) => {
    visitor(element)
    visitElements(element?.children, visitor)
  })
}

/**
 * 清理 CSS 字体名称外层引号。
 *
 * @private
 * @param {*} value 字体名称。
 * @returns {string} FontFace 可使用的字体名称。
 */
function normalizeFontFamilyName(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/^(['"])(.*)\1$/, '$2').trim()
}

/**
 * 归一化字体文件地址。
 *
 * @private
 * @param {*} value 字体地址。
 * @returns {string} 清理后的字体地址。
 */
function normalizeFontUrl(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 将 Leafer 支持的字重值归一化为数值。
 *
 * @private
 * @param {number | string} value 字重。
 * @returns {number} 数值字重。
 */
function normalizeFontWeight(value) {
  if (typeof value === 'string' && FONT_WEIGHT_VALUES[value] !== undefined) {
    return FONT_WEIGHT_VALUES[value]
  }

  const weight = Number(value)
  return Number.isFinite(weight) ? weight : 400
}
