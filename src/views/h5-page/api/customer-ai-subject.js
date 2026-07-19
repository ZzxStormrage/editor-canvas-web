import { customerClient } from './customer-client.js'

const CUSTOMER_AI_SUBJECT_IDS_ENDPOINT =
  import.meta.env?.VITE_CUSTOMER_AI_SUBJECT_IDS_API_PATH || '/customer/api/customAiSubject/ids'

export const customerAiSubjectApi = Object.freeze({
  /** @param {string} ids 逗号分隔的主题 ID。 @returns {import('alova').Method} */
  listByIds(ids) {
    if (typeof ids !== 'string' || !ids.trim()) {
      throw new TypeError('customAiSubject.ids must be a non-empty string.')
    }

    return customerClient.Get(CUSTOMER_AI_SUBJECT_IDS_ENDPOINT, {
      name: 'customerAiSubject.listByIds',
      params: { ids: ids.trim() }
    })
  }
})
