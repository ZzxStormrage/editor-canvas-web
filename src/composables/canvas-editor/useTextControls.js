import { nextTick, ref, watch } from 'vue'

import { customFontApi } from '../../api/modules/custom-font.js'
import {
  getDefaultLineHeight,
  normalizeFontWeightForUI,
  normalizePixelForUI,
  resolveTextDecoration
} from './editor-ui-utils.js'

const DEFAULT_TEXT = '双击编辑文字'

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
  const fontFamily = ref('PingFang SC')
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
  const fontOptions = [
    'PingFang SC',
    'Microsoft YaHei',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Courier New'
  ]
  let isSyncingControls = false
  let fontListRequest = null

  /**
   * 请求并打印字体列表接口的原始响应。
   *
   * 字段结构确认前不修改 fontOptions，避免影响当前字体选择和文本渲染流程。
   * 同一次请求未结束时复用 Promise，防止下拉框重复触发并发请求。
   *
   * @returns {Promise<*>} 服务端原始响应；请求失败时返回错误响应数据或 null。
   */
  function loadFontList() {
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
    try {
      const response = await customFontApi.list()
      console.log('[customFontApi.list] response:', response)
      return response
    } catch (error) {
      const errorResponse = error?.data ?? null
      console.log('[customFontApi.list] error response:', errorResponse)
      console.error('[customFontApi.list] request failed:', error)
      return errorResponse
    }
  }

  /** @returns {Object} 当前 TextPlugin 配置。 */
  function getTextOptions() {
    return {
      fontFamily: fontFamily.value,
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
    fontSize.value = normalizePixelForUI(options.fontSize ?? fontSize.value)
    fontWeight.value = normalizeFontWeightForUI(options.fontWeight ?? fontWeight.value)
    textColor.value = typeof options.fill === 'string' ? options.fill : textColor.value
    textAlign.value = options.textAlign ?? textAlign.value
    letterSpacing.value = normalizePixelForUI(options.letterSpacing ?? 0, 0)
    lineHeight.value = normalizePixelForUI(options.lineHeight ?? getDefaultLineHeight(options.fontSize ?? fontSize.value))
    italic.value = Boolean(options.italic)
    underline.value = options.textDecoration === 'under' || options.textDecoration === 'under-delete'
    lineThrough.value = options.textDecoration === 'delete' || options.textDecoration === 'under-delete'
    writingMode.value = options.writingMode ?? 'x'

    await nextTick()
    isSyncingControls = false
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

    editor.text.update({
      text: textValue.value,
      ...getTextOptions()
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
    fontOptions,
    loadFontList,
    getTextOptions,
    applyTextOptionsToUI,
    addText
  }
}
