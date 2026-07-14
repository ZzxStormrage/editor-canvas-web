import { XIAOXIANG_API_BASE_URL, xiaoxiangClient } from '../clients/xiaoxiang-client.js';
import { ApiError } from '../core/api-error.js';

const PICTURE_UPLOAD_PATH = '/admin/api/localStorage/pictures';

/**
 * 图片存储接口模块。
 */
export const pictureApi = Object.freeze({
  /**
   * 上传单张图片并返回可直接渲染的图片地址。
   *
   * @param {File | Blob} file 图片文件。
   * @returns {import('alova').Method} Alova Method 实例，响应值为图片 URL。
   */
  upload(file) {
    const formData = new FormData();
    formData.append('file', assertImageFile(file));

    return xiaoxiangClient.Post(PICTURE_UPLOAD_PATH, formData, {
      name: 'picture.upload',
      transformData: resolveUploadedPictureUrl
    });
  }
});

/**
 * 校验上传文件。
 *
 * @param {File | Blob} file 上传文件。
 * @returns {File | Blob} 原文件。
 */
function assertImageFile(file) {
  const isFile = typeof File !== 'undefined' && file instanceof File;
  const isBlob = typeof Blob !== 'undefined' && file instanceof Blob;

  if (!isFile && !isBlob) {
    throw new TypeError('pictureApi.upload(file) requires a File or Blob.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new TypeError('Only image files can be uploaded.');
  }

  return file;
}

/**
 * 从服务端响应中提取并补全图片地址。
 *
 * @param {*} response 图片上传响应体。
 * @returns {string} 绝对图片地址。
 */
function resolveUploadedPictureUrl(response) {
  const payload = response?.data ?? response;
  const url = typeof payload === 'string' ? payload : payload?.url ?? payload?.data?.url;

  if (typeof url !== 'string' || !url.trim()) {
    throw new ApiError('图片上传接口未返回有效地址。', {
      code: 'PICTURE_UPLOAD_RESPONSE_INVALID',
      data: response
    });
  }

  try {
    return new URL(url, `${XIAOXIANG_API_BASE_URL.replace(/\/$/, '')}/`).toString();
  } catch (error) {
    throw new ApiError('图片上传接口返回的地址无效。', {
      code: 'PICTURE_UPLOAD_URL_INVALID',
      data: response,
      cause: error
    });
  }
}
