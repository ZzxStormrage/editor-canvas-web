import { normalizeRatio } from './number.js';

/**
 * 归一化图片插件配置。
 *
 * 独立工具函数，避免 options.js 与 ImagePlugin 之间的循环引用。
 *
 * @author zzx
 * @since 2026-07-01
 * @param {Object} [image={}] — 外部传入的图片配置
 * @param {Object} [baseImage={}] — 基础配置（作为默认值）
 * @returns {Object} 归一化后的图片配置
 */
export function normalizeImageOptions(image = {}, baseImage = {}) {
  const merged = { ...baseImage, ...(image ?? {}) };

  merged.maxWidthRatio = normalizeRatio(merged.maxWidthRatio, 'image.maxWidthRatio');
  merged.maxHeightRatio = normalizeRatio(merged.maxHeightRatio, 'image.maxHeightRatio');

  return merged;
}
