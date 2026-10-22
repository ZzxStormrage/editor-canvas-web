/** 图片原始资源 URL，不受运行时缓存替换影响。 */
export const IMAGE_SOURCE_URL_KEY = '__canvasEditorImageSourceUrl';

/** 图片原始资源格式。 */
export const IMAGE_SOURCE_FORMAT_KEY = '__canvasEditorImageSourceFormat';

/** SVG 运行时栅格缓存 URL。 */
export const SVG_RUNTIME_CACHE_URL_KEY = '__canvasEditorSvgRuntimeCacheUrl';

/**
 * 根据资源 URL 判断是否为 SVG。
 *
 * @param {*} source 图片资源。
 * @param {*} format 显式资源格式。
 * @returns {boolean} 是否为 SVG。
 */
export function isSvgImageSource(source, format) {
  if (String(format ?? '').toLowerCase() === 'svg') {
    return true;
  }

  if (typeof source !== 'string') {
    return false;
  }

  return /^data:image\/svg\+xml(?:[;,]|$)/i.test(source)
    || /\.svg(?:[?#].*)?$/i.test(source);
}
