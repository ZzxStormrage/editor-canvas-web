const loadedFontFaces = new Map()
const fontFaceRequests = new Map()

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
