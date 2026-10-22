import { nextTick, reactive, ref, watch } from 'vue'

import { loadFontFace } from '../../index.js'
import {
  getDefaultLineHeight,
  normalizeFontWeightForUI,
  normalizePixelForUI,
  resolveTextDecoration
} from './editor-ui-utils.js'
import { resolveTextWidthPatch } from './text-control-update.js'

const DEFAULT_TEXT = '双击编辑文字'
const DEFAULT_RENDER_FONT_FAMILY = 'PingFang SC'

/**
 * 管理文字面板状态及其与 TextPlugin 的双向同步。
 *
 * 应用层只依赖 Editor 外观 API，不直接操作 TextPlugin 实例，符合核心层的
 * 单向依赖约束。
 *
 * @param {() => import('../../core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @returns {Object} 文字状态和业务操作。
 */
export function useTextControls(getEditor) {
  const textValue = ref(DEFAULT_TEXT)
  const fontFamily = ref('Arial')
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
  const fontOptions = reactive(['Arial', 'PingFang SC', 'Microsoft YaHei', 'sans-serif', 'serif', 'monospace'].map(fontName => ({ fontName })))
  const remoteFonts = new Map()
  let isSyncingControls = false
  /** @returns {Promise<Object[]>} 当前系统字体选项，无网络请求。 */
  async function loadFontList() {
    return fontOptions
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
   * 记录文档携带的字体地址，保证字体面板尚未打开时仍能继续编辑并导出。
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

    const widthPatch = resolveTextWidthPatch(selectedText, writingMode.value)
    editor.text.update({
      text: textValue.value,
      ...getTextOptions(),
      ...widthPatch
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
