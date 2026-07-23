export const IMAGE_FILE_ACCEPT = 'image/*,.svg,image/svg+xml';

/**
 * 判断文件是否为编辑器支持的图片格式。
 *
 * SVG 在部分系统中会被标记为 application/xml 或空 MIME，因此同时按扩展名识别。
 *
 * @param {{ type?: string, name?: string } | null} file 文件或类文件对象。
 * @returns {boolean} 是否为可上传图片。
 */
export function isSupportedImageFile(file) {
  const mimeType = String(file?.type ?? '').trim().toLowerCase();
  const fileName = String(file?.name ?? '').trim().toLowerCase();

  if (!mimeType || mimeType.startsWith('image/')) {
    return true;
  }

  return fileName.endsWith('.svg');
}
