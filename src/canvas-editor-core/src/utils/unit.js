const DEFAULT_PIXEL_DPI = 300
const MILLIMETERS_PER_INCH = 25.4

/**
 * 将像素按指定 DPI 换算为毫米。
 *
 * @param {number} pixel 像素值。
 * @param {number} [dpi=DEFAULT_PIXEL_DPI] 每英寸像素数。
 * @returns {number} 毫米值。
 */
export function pixelToMillimeter(pixel, dpi = DEFAULT_PIXEL_DPI) {
  const number = Number(pixel)
  const dpiNumber = Number(dpi)

  if (!Number.isFinite(number) || !Number.isFinite(dpiNumber) || dpiNumber <= 0) {
    return 0
  }

  return (number / dpiNumber) * MILLIMETERS_PER_INCH
}

/**
 * 格式化毫米数值。
 *
 * @param {number} value 毫米值。
 * @param {number} [digits=1] 小数位数。
 * @returns {string} 格式化后的毫米文本。
 */
export function formatMillimeter(value, digits = 1) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '0'
  }

  return number.toFixed(digits)
}

export { DEFAULT_PIXEL_DPI }
