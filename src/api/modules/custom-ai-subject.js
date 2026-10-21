import { xiaoxiangClient } from '../clients/xiaoxiang-client.js'

const CUSTOM_AI_SUBJECT_ENDPOINT = '/admin/api/customAiSubject'

export const customAiSubjectApi = createCustomAiSubjectApi(CUSTOM_AI_SUBJECT_ENDPOINT)

/**
 * 创建 AI 主题分页接口。
 * @param {string} endpoint 接口路径。
 * @param {import('alova').Alova} [client=xiaoxiangClient] 请求客户端。
 * @returns {{ list: (params?: Object) => import('alova').Method }} 接口方法。
 */
export function createCustomAiSubjectApi(endpoint, client = xiaoxiangClient) {
  const apiEndpoint = normalizeEndpoint(endpoint)
  return Object.freeze({
    list(params = {}) {
      const page = normalizePositiveInteger(params.page ?? 1, 'page')
      const size = normalizePositiveInteger(params.size ?? 10, 'size')
      const query = { page, size }
      const keyword = String(params.keyword ?? params.subjectName ?? '').trim()
      if (keyword) query.keyword = keyword
      return client.Get(apiEndpoint, { name: 'customAiSubject.list', params: query })
    }
  })
}

function normalizeEndpoint(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('AI subject endpoint must be non-empty.')
  return value.trim().replace(/\/$/, '')
}

function normalizePositiveInteger(value, name) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new TypeError(`${name} must be a positive integer.`)
  return number
}
