import { XIAOXIANG_ASSET_BASE_URL } from '../../../api/clients/xiaoxiang-client.js'
import { ApiError } from '../../../api/core/api-error.js'
import { isSupportedImageFile } from '../../../config/image-upload.js'
import { customerClient } from './customer-client.js'

const CUSTOMER_PICTURE_UPLOAD_PATH =
  import.meta.env?.VITE_CUSTOMER_PICTURE_UPLOAD_PATH || '/customer/api/file/upload'

/**
 * H5 AI 主题流程沿用小程序的上传接口和 multipart 字段。
 *
 * @param {{ Post: Function }} client 请求客户端。
 * @param {string} assetBaseURL 图片地址基础域名。
 * @returns {{ upload: (file: File | Blob) => import('alova').Method }}
 */
export function createCustomerPictureApi(client, assetBaseURL) {
  if (!client || typeof client.Post !== 'function') {
    throw new TypeError('Customer picture API requires a client with Post method.')
  }

  return Object.freeze({
    /** @param {File | Blob} file 裁剪后的图片。 @returns {import('alova').Method} */
    upload(file) {
      if (!(file instanceof Blob) || !isSupportedImageFile(file)) {
        throw new TypeError('customerPicture.upload(file) requires an image file.')
      }

      const formData = new FormData()
      formData.append('files', file)
      return client.Post(CUSTOMER_PICTURE_UPLOAD_PATH, formData, {
        name: 'customerPicture.upload',
        transformData: (response) => resolveUploadedPictureUrl(response, assetBaseURL)
      })
    }
  })
}

/** @param {*} response 上传接口响应。 @param {string} assetBaseURL 图片基础域名。 @returns {string} */
export function resolveUploadedPictureUrl(response, assetBaseURL) {
  const value = response?.data ?? response
  const url = typeof value === 'string' ? value : value?.url ?? value?.data
  if (typeof url !== 'string' || !url.trim()) {
    throw new ApiError('图片上传接口未返回有效地址。', {
      code: 'PICTURE_UPLOAD_RESPONSE_INVALID',
      data: response
    })
  }

  return new URL(url.trim(), `${assetBaseURL.replace(/\/$/, '')}/`).toString()
}

export const customerPictureApi = createCustomerPictureApi(customerClient, XIAOXIANG_ASSET_BASE_URL)
