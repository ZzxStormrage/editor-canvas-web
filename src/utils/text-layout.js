const TEXT_LAYOUT_MODES = new Set(['wrap', 'single-line', 'vertical'])
const TEXT_LAYOUT_OVERFLOWS = new Set(['shrink-then-visible'])

export const DEFAULT_TEXT_LAYOUT = Object.freeze({
  mode: 'wrap',
  overflow: 'shrink-then-visible',
  minFontSize: null
})

/**
 * 归一化文本显示策略。
 *
 * @param {Object} [source={}] 文本显示配置。
 * @returns {{ mode: 'wrap' | 'single-line' | 'vertical', overflow: 'shrink-then-visible', minFontSize: number | null }}
 * 标准显示策略。
 */
export function normalizeTextLayout(source = {}) {
  const layout = isPlainObject(source) ? source : {}

  return {
    mode: TEXT_LAYOUT_MODES.has(layout.mode) ? layout.mode : DEFAULT_TEXT_LAYOUT.mode,
    overflow: TEXT_LAYOUT_OVERFLOWS.has(layout.overflow)
      ? layout.overflow
      : DEFAULT_TEXT_LAYOUT.overflow,
    minFontSize: normalizeOptionalPositiveNumber(layout.minFontSize)
  }
}

/**
 * 将单行内容中的主动换行移除。
 *
 * @param {*} value 原始文字。
 * @returns {string} 单行文字。
 */
export function normalizeSingleLineText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replaceAll('\n', '')
}

/**
 * 在固定宽度内查找可完整显示文字的最大整数字号。
 *
 * 达到最小字号仍无法完整显示时返回最小字号，由渲染层继续显示溢出内容。
 *
 * @param {Object} options 计算参数。
 * @param {number} options.frameWidth 固定文字区域宽度。
 * @param {number} options.baseFontSize 模板原始字号。
 * @param {number | null | undefined} options.minFontSize 最小字号。
 * @param {(fontSize: number) => number} options.measureWidth 指定字号下的文字宽度测量函数。
 * @returns {number} 应用字号。
 */
export function resolveSingleLineFontSize(options) {
  const frameWidth = normalizePositiveNumber(options?.frameWidth, 1)
  const baseFontSize = normalizePositiveNumber(options?.baseFontSize, 1)
  const defaultMinFontSize = Math.max(1, Math.floor(baseFontSize * 0.6))
  const minFontSize = Math.min(
    baseFontSize,
    normalizePositiveNumber(options?.minFontSize, defaultMinFontSize)
  )
  const measureWidth = typeof options?.measureWidth === 'function'
    ? options.measureWidth
    : () => frameWidth

  if (measureWidth(baseFontSize) <= frameWidth) {
    return baseFontSize
  }

  const minInteger = Math.max(1, Math.ceil(minFontSize))
  const maxInteger = Math.max(minInteger, Math.floor(baseFontSize))
  if (measureWidth(minInteger) > frameWidth) {
    return minInteger
  }

  let low = minInteger
  let high = maxInteger
  let fittedFontSize = minInteger

  while (low <= high) {
    const candidate = Math.floor((low + high) / 2)
    if (measureWidth(candidate) <= frameWidth) {
      fittedFontSize = candidate
      low = candidate + 1
    } else {
      high = candidate - 1
    }
  }

  return fittedFontSize
}

/** @param {*} value 输入值。 @returns {number | null} 正数或 null。 */
function normalizeOptionalPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

/** @param {*} value 输入值。 @param {number} fallback 默认值。 @returns {number} 正数。 */
function normalizePositiveNumber(value, fallback) {
  return normalizeOptionalPositiveNumber(value) ?? fallback
}

/** @param {*} value 输入值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
