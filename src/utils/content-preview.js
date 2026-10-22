/**
 * 判断两个内容裁剪范围是否一致。
 *
 * @param {Object | null} current 当前范围。
 * @param {Object | null} next 新范围。
 * @returns {boolean} 是否一致。
 */
export function areContentPreviewBoundsEqual(current, next) {
  if (!current || !next) {
    return current === next;
  }

  return current.x === next.x
    && current.y === next.y
    && current.width === next.width
    && current.height === next.height;
}

/**
 * 计算内容层在裁剪预览状态下的透明度。
 *
 * @param {Object | null} previewBounds 当前预览范围。
 * @param {number} overflowOpacity 正常画板外透明度。
 * @returns {number} 内容层透明度。
 */
export function resolveContentLayerOpacity(previewBounds, overflowOpacity) {
  return previewBounds ? 0 : overflowOpacity;
}
