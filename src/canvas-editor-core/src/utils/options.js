import { isString } from 'leafer-ui';

import { DEFAULT_CANVAS_CONFIG } from '../config/index.js';
import { EditorError } from '../errors/editor-error.js';
import { normalizeGridOptions } from './grid.js';
import { normalizeZoomOptions } from './zoom.js';
import { normalizeImageOptions } from './image.js';
import { normalizeEditorOptions } from './editor.js';

/**
 * 归一化初始化参数。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {Object} options 外部传入的初始化参数。
 * @returns {Object} 内部统一使用的初始化参数。
 * @throws {EditorError} 当参数非法时抛出。
 */
export function normalizeInitOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new EditorError('init(options) requires an options object.', 'INIT_OPTIONS_REQUIRED');
  }

  const areaType = resolveAreaType(options);

  return {
    view: options.view ?? options.container ?? options.el,
    width: options.width,
    height: options.height,
    background: isString(options.background) ? options.background : DEFAULT_CANVAS_CONFIG.background,
    showGrid: areaType === 'grid',
    areaType,
    grid: normalizeGridOptions({
      ...options.grid,
      background: options.grid?.background,
      backgroundColor: options.grid?.backgroundColor ?? options.background,
      backgroundSize: options.grid?.backgroundSize
    }),
    zoom: normalizeZoomOptions(options.zoom),
    image: normalizeImageOptions(options.image, DEFAULT_CANVAS_CONFIG.image),
    editor: normalizeEditorOptions(options.editor, DEFAULT_CANVAS_CONFIG.editor),
    pixelRatio: options.pixelRatio,
    autoResize: options.autoResize ?? DEFAULT_CANVAS_CONFIG.autoResize,
    leaferOptions: {
      ...DEFAULT_CANVAS_CONFIG.leaferOptions,
      ...(options.leaferOptions ?? {})
    }
  };
}

/**
 * 归一化区域类型。
 *
 * @param {string} areaType 区域类型。
 * @returns {'grid' | 'blank'} 归一化后的区域类型。
 * @throws {EditorError} 当类型非法时抛出。
 */
export function normalizeAreaType(areaType) {
  if (areaType === 'blank' || areaType === 'grid') {
    return areaType;
  }

  throw new EditorError('areaType must be "grid" or "blank".', 'AREA_TYPE_INVALID');
}

/**
 * 归一化网格显示状态。
 *
 * @param {boolean} showGrid 是否显示网格。
 * @returns {boolean} 归一化后的显示状态。
 * @throws {EditorError} 当值不是布尔值时抛出。
 */
export function normalizeShowGrid(showGrid) {
  if (typeof showGrid === 'boolean') {
    return showGrid;
  }

  throw new EditorError('showGrid must be a boolean.', 'SHOW_GRID_INVALID');
}

/**
 * 解析画布区域类型。
 *
 * @param {Object} options 初始化参数。
 * @returns {'grid' | 'blank'} 画布区域类型。
 */
function resolveAreaType(options) {
  if (options.showGrid !== undefined) {
    return normalizeShowGrid(options.showGrid) ? 'grid' : 'blank';
  }

  if (options.areaType !== undefined || options.area !== undefined) {
    return normalizeAreaType(options.areaType ?? options.area);
  }

  return normalizeShowGrid(DEFAULT_CANVAS_CONFIG.showGrid)
    ? 'grid'
    : normalizeAreaType(DEFAULT_CANVAS_CONFIG.areaType);
}
