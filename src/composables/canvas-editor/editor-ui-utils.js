/**
 * 将编辑器像素值归一化为 UI 可用的整数。
 *
 * 该模块只处理数据转换，不读取 Vue 状态或编辑器实例，保持工具层纯净。
 *
 * @param {number | string} value 原始像素值。
 * @param {number} [min=1] 最小值。
 * @returns {number} 归一化后的整数像素值。
 */
export function normalizePixelForUI(value, min = 1) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return min
  }

  return Math.max(min, Math.round(number))
}

/**
 * 将字体字重归一化为表单控件使用的字符串。
 *
 * @param {string | number} value 原始字重。
 * @returns {string} UI 字重值。
 */
export function normalizeFontWeightForUI(value) {
  const weightMap = {
    normal: '400',
    regular: '400',
    medium: '500',
    bold: '700'
  }

  return weightMap[value] ?? String(value ?? '400')
}

/**
 * 根据字号计算默认行高。
 *
 * @param {number | string} fontSize 字号。
 * @returns {number} 默认行高。
 */
export function getDefaultLineHeight(fontSize) {
  return normalizePixelForUI(Number(fontSize) * 1.22)
}

/**
 * 将文本装饰控件转换为 Leafer 文本装饰值。
 *
 * @param {{ underline: boolean, lineThrough: boolean }} options 装饰状态。
 * @returns {'under-delete' | 'under' | 'delete' | 'none'} Leafer 文本装饰值。
 */
export function resolveTextDecoration({ underline, lineThrough }) {
  if (underline && lineThrough) {
    return 'under-delete'
  }

  if (underline) {
    return 'under'
  }

  return lineThrough ? 'delete' : 'none'
}

/**
 * 格式化文件大小。
 *
 * @param {number} size 文件大小，单位 byte。
 * @returns {string} MB 文本。
 */
export function formatFileSize(size) {
  const megabyte = Number(size) / 1024 / 1024

  if (!Number.isFinite(megabyte)) {
    return '0 MB'
  }

  return `${megabyte.toFixed(2)} MB`
}

/**
 * 读取图片文件的真实像素尺寸。
 *
 * @param {File} file 图片文件。
 * @returns {Promise<{ width: number, height: number, size: number }>} 图片信息。
 */
export function readImageFileInfo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        size: file.size
      })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('读取图片尺寸失败'))
    }
    image.src = url
  })
}

/**
 * 判断世界坐标是否落在元素外框内。
 *
 * @param {Object} element Leafer 节点。
 * @param {{ x: number, y: number }} worldPoint Leafer 世界坐标。
 * @param {number} [tolerance=6] 命中容差。
 * @returns {boolean} 是否命中元素外框。
 */
export function isPointInElementBounds(element, worldPoint, tolerance = 6) {
  const bounds = element?.worldBoxBounds

  if (!bounds || !Number.isFinite(worldPoint?.x) || !Number.isFinite(worldPoint?.y)) {
    return false
  }

  return (
    worldPoint.x >= bounds.x - tolerance &&
    worldPoint.x <= bounds.x + bounds.width + tolerance &&
    worldPoint.y >= bounds.y - tolerance &&
    worldPoint.y <= bounds.y + bounds.height + tolerance
  )
}
