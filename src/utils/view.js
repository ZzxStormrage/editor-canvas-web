import { DEFAULT_CANVAS_CONFIG } from '../config/index.js';
import { EditorError } from '../errors/editor-error.js';
import { normalizePositiveNumber } from './number.js';

/**
 * 解析画布挂载容器。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {string | HTMLElement | HTMLCanvasElement} view 外部传入的挂载容器。
 * @returns {HTMLElement | HTMLCanvasElement} 真实 DOM 容器。
 * @throws {EditorError} 当容器缺失或找不到时抛出。
 */
export function resolveView(view) {
  if (!view) {
    throw new EditorError('Missing required option: view.', 'VIEW_REQUIRED');
  }

  if (typeof view !== 'string') {
    return view;
  }

  const element = document.getElementById(view) ?? querySelector(view);

  if (!element) {
    throw new EditorError(`Canvas view not found: ${view}`, 'VIEW_NOT_FOUND');
  }

  return element;
}

/**
 * 安全执行 document.querySelector。
 *
 * @param {string} selector CSS 选择器。
 * @returns {Element | null} 匹配到的元素，未匹配或选择器非法时返回 null。
 */
function querySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.warn('[canvas-editor-core] Invalid selector.', error);
    return null;
  }
}

/**
 * 解析画布尺寸。
 *
 * @param {HTMLElement | HTMLCanvasElement} view 画布挂载容器。
 * @param {Object} options 归一化后的初始化参数。
 * @returns {{ width: number, height: number }} 可用于 Leafer 的画布尺寸。
 */
export function resolveSize(view, options) {
  const width = options.width ?? getElementSize(view, 'width') ?? DEFAULT_CANVAS_CONFIG.width;
  const height = options.height ?? getElementSize(view, 'height') ?? DEFAULT_CANVAS_CONFIG.height;

  return normalizeSize(width, height);
}

/**
 * 校验并格式化画布尺寸。
 *
 * @param {number | string} width 画布宽度。
 * @param {number | string} height 画布高度。
 * @returns {{ width: number, height: number }} 格式化后的正数尺寸。
 * @throws {EditorError} 当尺寸非法时抛出。
 */
export function normalizeSize(width, height) {
  return {
    width: normalizePositiveNumber(width, 'canvas.width'),
    height: normalizePositiveNumber(height, 'canvas.height')
  };
}

/**
 * 读取 DOM 元素的实际尺寸。
 *
 * @param {HTMLElement | HTMLCanvasElement} element DOM 元素。
 * @param {'width' | 'height'} key 需要读取的尺寸字段。
 * @returns {number | undefined} 元素尺寸。
 */
function getElementSize(element, key) {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return undefined;
  }

  const rect = element.getBoundingClientRect();
  const value = key === 'width' ? rect.width : rect.height;

  return value > 0 ? value : undefined;
}
