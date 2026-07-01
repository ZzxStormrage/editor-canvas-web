/**
 * 创建容器尺寸监听器。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {HTMLElement | HTMLCanvasElement} view 画布挂载容器。
 * @param {Object} editor 编辑器实例上下文。
 * @returns {ResizeObserver | null} 尺寸监听器，环境不支持 ResizeObserver 时返回 null。
 */
export function createResizeObserver(view, editor) {
  if (typeof ResizeObserver === 'undefined') {
    return null
  }

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect

    if (width > 0 && height > 0) {
      editor.resize(width, height)
    }
  })

  observer.observe(view)
  return observer
}

/**
 * 查找 Leafer 文本编辑器 DOM。
 *
 * @returns {HTMLElement | null} 文本编辑器 DOM。
 */
export function getTextEditorElement() {
  const editDom = document.querySelector('.leafer-text-editor')

  return editDom instanceof HTMLElement ? editDom : null
}

/**
 * 把文本样式同步到 Leafer TextEditor 的 contenteditable DOM。
 *
 * @param {Object} options 文本样式配置。
 * @returns {void}
 */
export function applyTextEditorStyle(options = {}) {
  const editDom = getTextEditorElement()

  if (!editDom) {
    return
  }

  const { style } = editDom
  const fontFamily = options.fontFamily ?? 'sans-serif'
  const fontSize = options.fontSize ?? 16
  const fontWeight = options.fontWeight ?? 'normal'
  const fill = options.fill ?? '#000000'
  const textAlign = options.textAlign ?? 'left'
  const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.22)
  const letterSpacing = options.letterSpacing ?? 0
  const textDecoration = options.textDecoration ?? 'none'
  const writingMode = options.writingMode ?? 'x'

  style.fontFamily = fontFamily
  style.fontSize = `${fontSize}px`
  style.fontWeight = String(fontWeight)
  style.fontStyle = options.italic ? 'italic' : 'normal'
  style.color = typeof fill === 'string' ? fill : '#000000'
  style.textAlign = textAlign === 'both' ? 'justify' : textAlign
  style.textDecoration = toCssTextDecoration(textDecoration)
  style.display = 'flex'
  style.flexDirection = 'column'
  style.justifyContent = 'flex-start'
  style.lineHeight = `${lineHeight}px`
  style.letterSpacing = `${letterSpacing}px`
  style.writingMode = writingMode === 'y' || writingMode === 'y-reverse' ? 'vertical-rl' : 'horizontal-tb'
  style.whiteSpace = 'normal'
  style.wordBreak = 'normal'
}

/**
 * 配置 TextEditor 输入层，使其能稳定接收点击和文本选择。
 *
 * @param {HTMLElement} editDom TextEditor DOM。
 * @returns {void}
 */
export function prepareTextEditorInput(editDom) {
  if (!editDom) {
    return
  }

  const { style } = editDom
  style.zIndex = '2147483647'
  style.pointerEvents = 'auto'
  style.cursor = 'text'
  style.userSelect = 'text'
}

/**
 * 阻止事件继续冒泡。
 *
 * @param {Event} event DOM 事件。
 * @returns {void}
 */
export function stopEventPropagation(event) {
  event.stopPropagation()
}

/**
 * 在 TextEditor 创建后的多个时机同步样式，规避插件异步挂载时序。
 *
 * @param {Object} options 文本样式配置。
 * @returns {void}
 */
export function applyTextEditorStyleLater(options = {}) {
  requestAnimationFrame(() => applyTextEditorStyle(options))
  requestAnimationFrame(() => requestAnimationFrame(() => applyTextEditorStyle(options)))
  setTimeout(() => applyTextEditorStyle(options), 80)
}

function toCssTextDecoration(textDecoration) {
  if (textDecoration === 'under-delete') {
    return 'underline line-through'
  }

  if (textDecoration === 'under') {
    return 'underline'
  }

  return textDecoration === 'delete' ? 'line-through' : 'none'
}
