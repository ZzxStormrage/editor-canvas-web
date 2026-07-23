import { EditorError } from '../errors/editor-error.js';

export const PRINT_AREA_ALIGNMENTS = Object.freeze([
  'left',
  'horizontal-center',
  'right',
  'top',
  'vertical-center',
  'bottom'
]);

const PRINT_AREA_ALIGNMENT_SET = new Set(PRINT_AREA_ALIGNMENTS);

/**
 * 计算元素外框相对打印区域的平移量。
 *
 * @param {{ x: number, y: number, width: number, height: number }} targetBounds 元素外框。
 * @param {{ x: number, y: number, width: number, height: number }} areaBounds 打印区域外框。
 * @param {'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom'} alignment
 * 对齐方式。
 * @returns {{ x: number, y: number }} 内容坐标系平移量。
 */
export function resolvePrintAreaAlignmentOffset(targetBounds, areaBounds, alignment) {
  assertBounds(targetBounds, 'targetBounds');
  assertBounds(areaBounds, 'areaBounds');

  if (!PRINT_AREA_ALIGNMENT_SET.has(alignment)) {
    throw new EditorError('Unsupported print area alignment.', 'PRINT_AREA_ALIGNMENT_INVALID');
  }

  const horizontalOffsets = {
    left: areaBounds.x - targetBounds.x,
    'horizontal-center': centerX(areaBounds) - centerX(targetBounds),
    right: right(areaBounds) - right(targetBounds)
  };
  const verticalOffsets = {
    top: areaBounds.y - targetBounds.y,
    'vertical-center': centerY(areaBounds) - centerY(targetBounds),
    bottom: bottom(areaBounds) - bottom(targetBounds)
  };

  return {
    x: horizontalOffsets[alignment] ?? 0,
    y: verticalOffsets[alignment] ?? 0
  };
}

/**
 * 将内容坐标系平移量转换为元素父级坐标系平移量。
 *
 * @param {{ x: number, y: number }} offset 内容坐标系平移量。
 * @param {{ a?: number, b?: number, c?: number, d?: number } | null} transform
 * 父级到内容层的变换矩阵。
 * @returns {{ x: number, y: number }} 父级坐标系平移量。
 */
export function convertOffsetToParentSpace(offset, transform) {
  const a = finite(transform?.a, 1);
  const b = finite(transform?.b, 0);
  const c = finite(transform?.c, 0);
  const d = finite(transform?.d, 1);
  const determinant = a * d - b * c;

  if (!Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON) {
    throw new EditorError(
      'Selected element parent transform is not invertible.',
      'PRINT_AREA_ALIGNMENT_TRANSFORM_INVALID'
    );
  }

  return {
    x: (d * offset.x - c * offset.y) / determinant,
    y: (-b * offset.x + a * offset.y) / determinant
  };
}

/** @param {Object} bounds 边界。 @param {string} name 参数名。 @returns {void} */
function assertBounds(bounds, name) {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height].map(Number);

  if (!values.every(Number.isFinite) || values[2] < 0 || values[3] < 0) {
    throw new EditorError(`${name} is invalid.`, 'PRINT_AREA_ALIGNMENT_BOUNDS_INVALID');
  }
}

/** @param {Object} bounds 边界。 @returns {number} 水平中心。 */
function centerX(bounds) {
  return bounds.x + bounds.width / 2;
}

/** @param {Object} bounds 边界。 @returns {number} 垂直中心。 */
function centerY(bounds) {
  return bounds.y + bounds.height / 2;
}

/** @param {Object} bounds 边界。 @returns {number} 右边界。 */
function right(bounds) {
  return bounds.x + bounds.width;
}

/** @param {Object} bounds 边界。 @returns {number} 下边界。 */
function bottom(bounds) {
  return bounds.y + bounds.height;
}

/** @param {*} value 输入值。 @param {number} fallback 回退值。 @returns {number} 有限数值。 */
function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
