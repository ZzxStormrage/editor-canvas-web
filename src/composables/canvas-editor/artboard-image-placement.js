/**
 * 计算图片在目标区域内等比完整显示且居中的位置和尺寸。
 *
 * @param {{ width: number, height: number }} imageSize 图片原始尺寸。
 * @param {{ x: number, y: number, width: number, height: number }} bounds 目标区域。
 * @returns {{ x: number, y: number, width: number, height: number }} 图片放置属性。
 */
export function resolveContainedImagePlacement(imageSize, bounds) {
  const imageWidth = positiveNumber(imageSize?.width, 'imageSize.width')
  const imageHeight = positiveNumber(imageSize?.height, 'imageSize.height')
  const boundsWidth = positiveNumber(bounds?.width, 'bounds.width')
  const boundsHeight = positiveNumber(bounds?.height, 'bounds.height')
  const boundsX = finiteNumber(bounds?.x, 'bounds.x')
  const boundsY = finiteNumber(bounds?.y, 'bounds.y')
  const scale = Math.min(boundsWidth / imageWidth, boundsHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return {
    x: boundsX + (boundsWidth - width) / 2,
    y: boundsY + (boundsHeight - height) / 2,
    width,
    height
  }
}

/** @param {*} value 数值。 @param {string} name 参数名。 @returns {number} 有限数值。 */
function finiteNumber(value, name) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw new TypeError(`${name} must be a finite number.`)
  }

  return number
}

/** @param {*} value 数值。 @param {string} name 参数名。 @returns {number} 正数。 */
function positiveNumber(value, name) {
  const number = finiteNumber(value, name)

  if (number <= 0) {
    throw new TypeError(`${name} must be greater than 0.`)
  }

  return number
}
