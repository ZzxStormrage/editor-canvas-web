import { DEFAULT_CANVAS_CONFIG } from '../config/index.js';
import { EditorError } from '../errors/editor-error.js';
import { normalizePositiveNumber } from './number.js';

/**
 * 归一化网格配置。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {Object} [grid] 外部传入的网格配置。
 * @param {Object} [baseGrid] 上一次网格配置。
 * @returns {Object} 内部网格配置。
 */
export function normalizeGridOptions(grid = {}, baseGrid = DEFAULT_CANVAS_CONFIG.grid) {
  const normalizedGrid = {
    ...baseGrid,
    ...(grid ?? {})
  };

  normalizedGrid.size = normalizePositiveNumber(normalizedGrid.size, 'grid.size');
  normalizedGrid.majorSize = normalizePositiveNumber(normalizedGrid.majorSize, 'grid.majorSize');

  return normalizedGrid;
}
