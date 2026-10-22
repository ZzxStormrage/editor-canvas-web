import { isSupportedImageFile } from '../../config/image-upload.js';

/** @param {File} file 本地图片。 @returns {Promise<string>} 可随 JSON 保存的数据地址。 */
export function readLocalImage(file) {
  if (!isSupportedImageFile(file)) {
    return Promise.reject(new Error('请选择图片文件。'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('图片读取失败。'));
    reader.readAsDataURL(file);
  });
}

/** @param {Object} document 编辑器文档。 @returns {void} 下载本地文件。 */
export function downloadDocument(document) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], {
    type: 'application/json'
  }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = 'canvas-document.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
