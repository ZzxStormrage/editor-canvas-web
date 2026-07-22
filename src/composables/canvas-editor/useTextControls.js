import { nextTick, reactive, ref, watch } from 'vue'

import { customFontApi } from '../../api/modules/custom-font.js'
import { loadFontFace } from '../../canvas-editor-core/src/index.js'
import {
  getDefaultLineHeight,
  normalizeFontWeightForUI,
  normalizePixelForUI,
  resolveTextDecoration
} from './editor-ui-utils.js'

const DEFAULT_TEXT = '双击编辑文字'
const DEFAULT_RENDER_FONT_FAMILY = 'PingFang SC'

/**
 * 管理文字面板状态及其与 TextPlugin 的双向同步。
 *
 * 应用层只依赖 Editor 外观 API，不直接操作 TextPlugin 实例，符合核心层的
 * 单向依赖约束。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @returns {Object} 文字状态和业务操作。
 */
export function useTextControls(getEditor) {
  const textValue = ref(DEFAULT_TEXT)
  const fontFamily = ref('')
  const fontSize = ref(36)
  const fontWeight = ref('400')
  const textColor = ref('#1f2937')
  const textAlign = ref('center')
  const letterSpacing = ref(0)
  const lineHeight = ref(44)
  const italic = ref(false)
  const underline = ref(false)
  const lineThrough = ref(false)
  const writingMode = ref('x')
  const fontListLoading = ref(false)
  const fontOptions = reactive([])
  const remoteFonts = new Map()
  let isSyncingControls = false
  let fontListRequest = null
  let fontListResponse = null
  let isFontListLoaded = false

  /**
   * 请求并应用字体列表接口数据。
   *
   * 同一次请求未结束时复用 Promise，防止下拉框重复触发并发请求。
   *
   * @returns {Promise<*>} 服务端原始响应；请求失败时返回错误响应数据或 null。
   */
  function loadFontList() {
    if (isFontListLoaded) {
      return Promise.resolve(fontListResponse)
    }

    if (!fontListRequest) {
      fontListRequest = requestFontList().finally(() => {
        fontListRequest = null
      })
    }

    return fontListRequest
  }

  /**
   * 执行字体列表请求。
   *
   * @private
   * @returns {Promise<*>} 服务端原始响应或错误响应数据。
   */
  async function requestFontList() {
    fontListLoading.value = true

    try {
      const response = await customFontApi.list()
      fontListResponse = response
      isFontListLoaded = true
      applyFontResponse(response)
      return response
    } catch (error) {
      const errorResponse = error?.data ?? null
      console.error('[customFontApi.list] request failed:', error)
      return errorResponse
    } finally {
      fontListLoading.value = false
    }
  }

  /**
   * 将字体接口返回的数据合并到下拉选项，并记录远程字体地址。
   *
   * @param {*} response 字体接口响应。
   * @returns {void}
   */
  function applyFontResponse(response) {
    resolveFontRecords(response).forEach((font) => {
      const fontName = typeof font.fontName === 'string' ? font.fontName.trim() : ''
      const fontUrl = typeof font.fontUrl === 'string' ? font.fontUrl.trim() : ''
      const imageUrl = typeof font.imageUrl === 'string' ? font.imageUrl.trim() : ''

      if (!fontName) {
        return
      }

      const option = {
        id: font.id,
        fontName,
        fontUrl,
        imageUrl
      }
      const existingOption = fontOptions.find((item) => item.fontName === fontName)

      if (existingOption) {
        Object.assign(existingOption, option)
      } else {
        fontOptions.push(option)
      }

      if (fontUrl) {
        remoteFonts.set(fontName, option)
      }

      if (!fontFamily.value) {
        fontFamily.value = fontName
      }
    })
  }

  /**
   * 从接口常见包装中提取字体记录数组。
   *
   * @param {*} value 接口响应。
   * @param {number} [depth=0] 当前解包深度。
   * @returns {Object[]} 字体记录数组。
   */
  function resolveFontRecords(value, depth = 0) {
    if (depth > 4) {
      return []
    }

    if (Array.isArray(value)) {
      return value.filter((item) => item && typeof item === 'object')
    }

    if (!value || typeof value !== 'object') {
      return []
    }

    for (const key of ['data', 'result', 'body', 'list', 'content', 'records']) {
      const records = resolveFontRecords(value[key], depth + 1)

      if (records.length) {
        return records
      }
    }

    return []
  }

  /**
   * 按需加载当前选中的远程字体。
   *
   * @param {string} fontName 字体名称。
   * @returns {Promise<void>} 字体加载结果。
   */
  function ensureFontLoaded(fontName) {
    const font = remoteFonts.get(fontName)
    return loadFontFace(fontName, font?.fontUrl).catch((error) => {
      console.warn(`Font loading failed: ${fontName}`, error)
    })
  }

  /** @returns {Object} 当前 TextPlugin 配置。 */
  function getTextOptions() {
    const fontUrl = remoteFonts.get(fontFamily.value)?.fontUrl

    return {
      fontFamily: fontFamily.value || DEFAULT_RENDER_FONT_FAMILY,
      ...(fontUrl ? { fontUrl } : {}),
      fontSize: fontSize.value,
      fontWeight: Number(fontWeight.value),
      italic: italic.value,
      fill: textColor.value,
      textAlign: textAlign.value,
      textDecoration: resolveTextDecoration({
        underline: underline.value,
        lineThrough: lineThrough.value
      }),
      letterSpacing: letterSpacing.value,
      lineHeight: lineHeight.value,
      writingMode: writingMode.value
    }
  }

  /**
   * 将选中文字的样式快照同步到表单控件。
   *
   * @param {Object} options TextPlugin 提供的样式快照。
   * @returns {Promise<void>}
   */
  async function applyTextOptionsToUI(options) {
    if (!options) {
      return
    }

    isSyncingControls = true
    textValue.value = options.text ?? ''
    fontFamily.value = options.fontFamily ?? fontFamily.value
    rememberDocumentFont(options.fontFamily, options.fontUrl)
    fontSize.value = normalizePixelForUI(options.fontSize ?? fontSize.value)
    fontWeight.value = normalizeFontWeightForUI(options.fontWeight ?? fontWeight.value)
    textColor.value = typeof options.fill === 'string' ? options.fill : textColor.value
    textAlign.value = options.textAlign ?? textAlign.value
    letterSpacing.value = normalizePixelForUI(options.letterSpacing ?? 0, 0)
    lineHeight.value = normalizePixelForUI(
      options.lineHeight ?? getDefaultLineHeight(options.fontSize ?? fontSize.value)
    )
    italic.value = Boolean(options.italic)
    underline.value = options.textDecoration === 'under' || options.textDecoration === 'under-delete'
    lineThrough.value = options.textDecoration === 'delete' || options.textDecoration === 'under-delete'
    writingMode.value = options.writingMode ?? 'x'

    await nextTick()
    isSyncingControls = false
  }

  /**
   * 记录文档携带的字体地址，保证字体列表尚未请求时仍能继续编辑并导出。
   *
   * @param {string | undefined} fontName 字体名称。
   * @param {string | undefined} fontUrl 字体地址。
   * @returns {void}
   */
  function rememberDocumentFont(fontName, fontUrl) {
    if (typeof fontName !== 'string' || !fontName.trim() || typeof fontUrl !== 'string' || !fontUrl.trim()) {
      return
    }

    remoteFonts.set(fontName, {
      ...(remoteFonts.get(fontName) ?? {}),
      fontName,
      fontUrl: fontUrl.trim()
    })
  }

  /** @returns {Promise<void>} */
  async function addText() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    await editor.text.add(textValue.value || DEFAULT_TEXT, getTextOptions())
  }

  /** @returns {void} */
  function updateSelectedText() {
    const editor = getEditor()
    const selectedText = editor?.text.getSelected()

    if (!editor || isSyncingControls || !selectedText) {
      return
    }

    if ((textValue.value ?? '').trim() === '') {
      selectedText.remove()
      editor.deselect()
      return
    }

    // 面板会提交完整样式快照，显式保留选框宽度，让左中右对齐只改变框内排版。
    const selectedWidth = Number(selectedText.width)
    editor.text.update({
      text: textValue.value,
      ...getTextOptions(),
      ...(Number.isFinite(selectedWidth) && selectedWidth > 0 ? { width: selectedWidth } : {})
    })
  }

  watch(fontSize, (nextFontSize, previousFontSize) => {
    if (isSyncingControls) {
      return
    }

    if (lineHeight.value === getDefaultLineHeight(previousFontSize)) {
      lineHeight.value = getDefaultLineHeight(nextFontSize)
    }
  })

  watch(fontFamily, (nextFontFamily) => {
    void ensureFontLoaded(nextFontFamily).then(() => {
      if (fontFamily.value === nextFontFamily) {
        updateSelectedText()
      }
    })
  })

  watch(
    [
      textValue,
      fontFamily,
      fontSize,
      fontWeight,
      textColor,
      textAlign,
      letterSpacing,
      lineHeight,
      italic,
      underline,
      lineThrough,
      writingMode
    ],
    updateSelectedText
  )

  return {
    textValue,
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    textAlign,
    letterSpacing,
    lineHeight,
    italic,
    underline,
    lineThrough,
    writingMode,
    fontListLoading,
    fontOptions,
    loadFontList,
    getTextOptions,
    applyTextOptionsToUI,
    addText
  }
}
