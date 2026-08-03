import { createAlovaClient } from '../../../api/core/alova-client.js'

const DEFAULT_AI_POSTER_API_BASE_URL = 'https://api-chat.ele007.com/api/v1/ele-design'
const CREATE_POSTER_TASK_ENDPOINT = '/create-sticker-poster-task'
const POSTER_TASK_DETAIL_ENDPOINT = '/get-sticker-task-detail'

const aiPosterClient = createAlovaClient({
  baseURL: import.meta.env?.VITE_AI_POSTER_API_BASE_URL || DEFAULT_AI_POSTER_API_BASE_URL,
  getAccessToken: null,
  onUnauthorized: null
})

/**
 * 创建 AI 人像海报接口。独立客户端不携带小象商城 Token。
 *
 * @param {{ Post: Function, Get: Function }} client Alova 客户端或兼容的测试客户端。
 * @returns {{ createTask: (payload: Object) => import('alova').Method, getTaskDetail: (taskUuid: string) => import('alova').Method }}
 */
export function createCustomerAiPosterApi(client) {
  if (!client || typeof client.Post !== 'function' || typeof client.Get !== 'function') {
    throw new TypeError('AI poster API requires a client with Post and Get methods.')
  }

  return Object.freeze({
    /** @param {Object} payload AI 生成参数。 */
    createTask(payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new TypeError('AI poster task payload must be an object.')
      }

      return client.Post(CREATE_POSTER_TASK_ENDPOINT, payload, {
        name: 'customerAiPoster.createTask',
        transformData: unwrapResponseData
      })
    },

    /** @param {string} taskUuid AI 任务 UUID。 */
    getTaskDetail(taskUuid) {
      const normalizedUuid = String(taskUuid ?? '').trim()
      if (!normalizedUuid) {
        throw new TypeError('AI poster task UUID must be a non-empty string.')
      }

      return client.Get(POSTER_TASK_DETAIL_ENDPOINT, {
        name: 'customerAiPoster.getTaskDetail',
        params: { task_uuid: normalizedUuid },
        transformData: unwrapResponseData
      })
    }
  })
}

/** @param {*} response 接口响应体。 @returns {*} 实际业务数据。 */
export function unwrapResponseData(response) {
  return response?.data === undefined ? response : response.data
}

export const customerAiPosterApi = createCustomerAiPosterApi(aiPosterClient)
