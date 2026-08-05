/**
 * 调整画板并将现有内容等比适配到新画板。
 *
 * 普通元素使用 contain 策略统一缩放并居中，背景图始终铺满新画板。
 *
 * @param {Object} editor Editor 外观实例。
 * @param {number} width 新画板宽度。
 * @param {number} height 新画板高度。
 * @returns {{ scale: number, bounds: Object }} 内容缩放比和新画板边界。
 */
export function resizeArtboardWithContent(editor, width, height) {
  const targetWidth = positiveNumber(width, 'width')
  const targetHeight = positiveNumber(height, 'height')
  const sourceBounds = normalizeBounds(editor?.artboard?.getContentBounds?.())
  const elements = [...(editor?.contentLayer?.children ?? [])]
  const backgrounds = new Set(editor?.getElementsByRole?.('background') ?? [])
  const snapshots = elements.map((element) => createElementSnapshot(element))

  editor.setArtboardSize(targetWidth, targetHeight)

  const targetBounds = normalizeBounds(editor?.artboard?.getContentBounds?.())
  const scale = Math.min(
    targetBounds.width / sourceBounds.width,
    targetBounds.height / sourceBounds.height
  )
  const offsetX = targetBounds.x + (targetBounds.width - sourceBounds.width * scale) / 2
  const offsetY = targetBounds.y + (targetBounds.height - sourceBounds.height * scale) / 2

  snapshots.forEach((snapshot) => {
    if (backgrounds.has(snapshot.element)) {
      resizeBackground(snapshot.element, targetBounds)
      return
    }

    scaleElement(snapshot, sourceBounds, scale, offsetX, offsetY)
  })

  editor.deselect?.()
  editor.artboard?.syncAllElements?.()

  return { scale, bounds: targetBounds }
}

/**
 * @param {Object} element Leafer 顶层元素。
 * @returns {{ element: Object, x: number, y: number, scaleX: number, scaleY: number }} 快照。
 */
function createElementSnapshot(element) {
  return {
    element,
    x: finiteNumber(element?.x, 0),
    y: finiteNumber(element?.y, 0),
    scaleX: finiteNumber(element?.scaleX, 1),
    scaleY: finiteNumber(element?.scaleY, 1)
  }
}

/**
 * @param {Object} snapshot 元素快照。
 * @param {Object} sourceBounds 原画板边界。
 * @param {number} scale 统一缩放比。
 * @param {number} offsetX 新内容区水平起点。
 * @param {number} offsetY 新内容区垂直起点。
 * @returns {void}
 */
function scaleElement(snapshot, sourceBounds, scale, offsetX, offsetY) {
  snapshot.element.set?.({
    x: offsetX + (snapshot.x - sourceBounds.x) * scale,
    y: offsetY + (snapshot.y - sourceBounds.y) * scale,
    scaleX: snapshot.scaleX * scale,
    scaleY: snapshot.scaleY * scale
  })
  snapshot.element.forceUpdate?.()
  snapshot.element.updateLayout?.()
}

/**
 * @param {Object} background 背景图节点。
 * @param {Object} bounds 新画板边界。
 * @returns {void}
 */
function resizeBackground(background, bounds) {
  background.set?.({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    scaleX: 1,
    scaleY: 1,
    lockRatio: false
  })
  background.forceUpdate?.()
  background.updateLayout?.()
}

/** @param {*} value 数值。 @param {number} fallback 默认值。 @returns {number} 有限数值。 */
function finiteNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** @param {*} value 数值。 @param {string} name 参数名。 @returns {number} 正数。 */
function positiveNumber(value, name) {
  const number = finiteNumber(value, NaN)

  if (number <= 0) {
    throw new TypeError(`${name} must be greater than 0.`)
  }

  return number
}

/** @param {Object} bounds 画板边界。 @returns {Object} 标准画板边界。 */
function normalizeBounds(bounds) {
  return {
    x: finiteNumber(bounds?.x, 0),
    y: finiteNumber(bounds?.y, 0),
    width: positiveNumber(bounds?.width, 'bounds.width'),
    height: positiveNumber(bounds?.height, 'bounds.height')
  }
}
