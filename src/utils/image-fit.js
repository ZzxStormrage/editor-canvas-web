import { EditorError } from '../errors/editor-error.js';

const IMAGE_REPLACEMENT_FIT_VALUES = new Set(['contain', 'cover', 'stretch']);

/**
 * 归一化替换图片时的适配方式。
 *
 * @param {'contain' | 'cover' | 'stretch' | null | undefined} [fit='contain'] 适配方式。
 * @returns {'contain' | 'cover' | 'stretch'} 标准适配方式。
 * @throws {EditorError} 当适配方式不受支持时抛出。
 */
export function normalizeImageReplacementFit(fit = 'contain') {
  const normalizedFit = fit ?? 'contain';

  if (!IMAGE_REPLACEMENT_FIT_VALUES.has(normalizedFit)) {
    throw new EditorError(
      'image replacement fit must be contain, cover, or stretch.',
      'IMAGE_REPLACEMENT_FIT_INVALID'
    );
  }

  return normalizedFit;
}

/**
 * 将公共适配方式转换为 Leafer 图片填充模式。
 *
 * @param {'contain' | 'cover' | 'stretch'} fit 公共适配方式。
 * @returns {'fit' | 'cover' | 'stretch'} Leafer 图片填充模式。
 */
export function toLeaferImageMode(fit) {
  return fit === 'contain' ? 'fit' : fit;
}

/**
 * 将公共适配方式转换为 CSS object-fit 值。
 *
 * @param {'contain' | 'cover' | 'stretch'} fit 公共适配方式。
 * @returns {'contain' | 'cover' | 'fill'} CSS object-fit 值。
 */
export function toCssObjectFit(fit) {
  return fit === 'stretch' ? 'fill' : fit;
}
