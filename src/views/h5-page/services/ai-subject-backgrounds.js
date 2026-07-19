import { customerAiSubjectApi } from '../api/customer-ai-subject.js'
import { readRouteValue } from './route-navigation.js'

export async function loadAiSubjectBackgroundOptions(query = {}) {
  const ids = normalizeSubjectIds(readRouteValue(query.aiSubjectIds))
  if (!ids) return []

  const response = await customerAiSubjectApi.listByIds(ids)
  const records = resolveRecords(response)
  const urls = records.flatMap((record) => readBackgroundUrls(record))

  return [...new Set(urls)].map((url, index) => ({
    id: `subject-background-${index + 1}`,
    label: `背景${index + 1}`,
    url,
    selected: index === 0
  }))
}

function normalizeSubjectIds(value) {
  if (value === null || value === undefined || value === '') return ''
  const decoded = decodeRepeatedly(String(value))
  const ids = decoded.split(',').map(Number).filter((id) => {
    return Number.isSafeInteger(id) && id > 0
  })

  return [...new Set(ids)].join(',')
}

function resolveRecords(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.result)) return response.result
  if (Array.isArray(response?.data?.data)) return response.data.data
  return []
}

function readBackgroundUrls(record) {
  const config = parseConfig(record?.configDetail ?? record?.config_detail)
  const values = config.background_img_urls ?? config.backgroundImgUrls ?? []

  return (Array.isArray(values) ? values : [values])
    .map((url) => typeof url === 'string' ? url.trim() : '')
    .filter((url) => /^(https?:\/\/|\/)/i.test(url) && !url.startsWith('//'))
}

function parseConfig(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return {}

  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function decodeRepeatedly(value) {
  let result = value

  for (let round = 0; round < 5; round += 1) {
    try {
      const decoded = decodeURIComponent(result)
      if (decoded === result) break
      result = decoded
    } catch {
      break
    }
  }

  return result
}
