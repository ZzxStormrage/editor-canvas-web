import { MathHelper } from 'leafer-ui';

import { DEFAULT_CANVAS_CONFIG } from '../config/index.js';
import { EditorError } from '../errors/editor-error.js';
import { normalizePositiveNumber } from './number.js';

/**
 * 归一化缩放配置。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {Object} [zoom] 外部缩放配置。
 * @returns {Object} 内部缩放配置。
 * @throws {EditorError} 当范围非法时抛出。
 */
export function normalizeZoomOptions(zoom = {}) {
  const normalizedZoom = {
    ...DEFAULT_CANVAS_CONFIG.zoom,
    ...(zoom ?? {})
  };

  normalizedZoom.min = normalizePositiveNumber(normalizedZoom.min, 'zoom.min');
  normalizedZoom.max = normalizePositiveNumber(normalizedZoom.max, 'zoom.max');
  normalizedZoom.step = normalizePositiveNumber(normalizedZoom.step, 'zoom.step');
  normalizedZoom.initial = normalizePositiveNumber(normalizedZoom.initial, 'zoom.initial');

  if (normalizedZoom.min > normalizedZoom.max) {
    throw new EditorError('zoom.min must be less than or equal to zoom.max.', 'ZOOM_RANGE_INVALID');
  }

  normalizedZoom.initial = MathHelper.within(
    normalizedZoom.initial,
    normalizedZoom.min,
    normalizedZoom.max
  );

  return normalizedZoom;
}

/**
 * 归一化缩放值。
 *
 * @param {number} zoom 缩放值。
 * @param {Object} zoomOptions 缩放配置。
 * @returns {number} 归一化后的缩放值。
 */
export function normalizeZoom(zoom, zoomOptions) {
  return MathHelper.within(
    normalizePositiveNumber(zoom, 'zoom'),
    zoomOptions.min,
    zoomOptions.max
  );
}
