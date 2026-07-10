import { nextTick, ref, watch } from 'vue'

import {
  getDefaultLineHeight,
  isPointInElementBounds,
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

  /**
   * 处理部分触控板无法触发 Leafer 文本双击编辑的兜底路径。
   *
   * @param {MouseEvent} event DOM 双击事件。
   * @returns {void}
   */
  function handleCanvasDoubleClick(event) {
    const editor = getEditor()

    if (!editor || editor.editor?.innerEditing) {
      return
    }

    const worldPoint = getWorldPointFromDomEvent(editor, event)
    const text = worldPoint ? findTopTextElementAtPoint(editor, worldPoint) : null

    if (text) {
      editor.text.edit(text)
    }
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
    getTextOptions,
    applyTextOptionsToUI,
    addText,
    handleCanvasDoubleClick
  }
}

/**
 * 把浏览器坐标转换为 Leafer 世界坐标。
 *
 * @param {Object} editor Editor 外观实例。
 * @param {MouseEvent} event DOM 双击事件。
 * @returns {{ x: number, y: number } | null} 世界坐标。
 */
function getWorldPointFromDomEvent(editor, event) {
  const clientPoint = {
    clientX: event.clientX,
    clientY: event.clientY
  }
  const tree = editor.leafer?.tree

  return tree?.getWorldPointByClient?.(clientPoint, true) ?? tree?.interaction?.getLocal?.(clientPoint, true) ?? null
}

/**
 * 按场景树层级从上向下查找可编辑文本。
 *
 * @param {Object} editor Editor 外观实例。
 * @param {{ x: number, y: number }} worldPoint 世界坐标。
 * @returns {Object | null} 命中的文本节点。
 */
function findTopTextElementAtPoint(editor, worldPoint) {
  const children = editor.contentLayer?.children ?? []

  for (let index = children.length - 1; index >= 0; index -= 1) {
    const child = children[index]
    const isText = child?.tag === 'Text' || child?.constructor?.name === 'Text'

    if (isText && child.editable !== false && isPointInElementBounds(child, worldPoint)) {
      return child
    }
  }

  return null
}
