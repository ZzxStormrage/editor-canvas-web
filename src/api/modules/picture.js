import { XIAOXIANG_API_BASE_URL, xiaoxiangClient } from '../clients/xiaoxiang-client.js';
import { ApiError } from '../core/api-error.js';

const PICTURE_UPLOAD_PATH = '/admin/api/localStorage/pictures';

/**
 * 图片存储接口模块。
 */
export const pictureApi = createPictureApi(PICTURE_UPLOAD_PATH);

/**
 * 创建指定业务前缀的图片上传接口。
 *
 * @param {string} uploadPath 上传路径。
 * @param {string} [methodName='picture.upload'] Alova 方法名。
 * @returns {{ upload: (file: File | Blob) => import('alova').Method }} 图片接口。
 */
export function createPictureApi(uploadPath, methodName = 'picture.upload') {
  const apiPath = normalizeUploadPath(uploadPath);

  return Object.freeze({
    /**
     * @param {File | Blob} file 图片文件。
     * @returns {import('alova').Method} 响应值为图片 URL 的 Alova Method。
     */
    upload(file) {
      const formData = new FormData();
      formData.append('file', assertImageFile(file));

      return xiaoxiangClient.Post(apiPath, formData, {
        name: methodName,
        transformData: resolveUploadedPictureUrl
      });
    }
  });
}

/** @param {string} value 上传路径。 @returns {string} 规范上传路径。 */
function normalizeUploadPath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Picture upload path must be a non-empty string.');
  }

  return value.trim();
}

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
