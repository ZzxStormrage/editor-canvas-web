export const MAX_CAPTURE_PIXEL_RATIO = 2
export const MAX_CAPTURE_SIDE = 2400
export const MAX_CAPTURE_PIXELS = 8_000_000

/**
 * 按截图区域尺寸计算移动端可承受的输出倍率。
 * 小画板最高输出 2 倍，大画板至少保持 1 倍原尺寸。
 *
 * @param {{ width?: number, height?: number } | null | undefined} bounds 截图区域。
 * @returns {number} 介于 1 和 2 之间的输出像素倍率。
 */
export function resolveCapturePixelRatio(bounds) {
  const width = Number(bounds?.width)
  const height = Number(bounds?.height)

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return 1
  }

  const sideRatio = MAX_CAPTURE_SIDE / Math.max(width, height)
  const pixelRatio = Math.sqrt(MAX_CAPTURE_PIXELS / (width * height))

  return Math.max(1, Math.min(MAX_CAPTURE_PIXEL_RATIO, sideRatio, pixelRatio))
}
