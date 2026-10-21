/**
 * 从编辑器配置消息中读取 AI 主题列表。
 * 支持 `aiSubjects`、`aiSubjectList`、`aiSubjectIds` 及嵌套 config。
 * @param {Object} payload 配置消息。
 * @returns {Object[]} 主题列表。
 */
export function resolveAiSubjectMessageConfig(payload) {
  const sources = [
    isPlainObject(payload?.config) ? payload.config : {},
    isPlainObject(payload) ? payload : {},
    isPlainObject(payload?.template) ? payload.template : {}
  ]
  const rawSubjects = sources.find((source) => {
    return source.aiSubjects !== undefined || source.aiSubjectList !== undefined
  })
  const subjects = normalizeAiSubjects(rawSubjects?.aiSubjects ?? rawSubjects?.aiSubjectList)
  const ids = normalizeAiSubjectIds(sources.find((source) => source.aiSubjectIds !== undefined)?.aiSubjectIds)

  ids.forEach((id) => {
    if (!subjects.some((subject) => String(subject.id) === String(id))) {
      subjects.push({ id, subjectName: `主题 #${id}` })
    }
  })
  return subjects
}

/** @param {*} value 原始主题列表。 @returns {Object[]} 归一化主题。 */
function normalizeAiSubjects(value) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set()
  return list.reduce((result, item) => {
    const source = isPlainObject(item) ? item : { id: item }
    const id = normalizeId(source.id ?? source.subjectId ?? source.subject_id)
    if (id === null || seen.has(String(id))) return result
    seen.add(String(id))
    result.push({
      ...source,
      id,
      subjectName: String(source.subjectName ?? source.subject_name ?? source.name ?? `主题 #${id}`).trim()
    })
    return result
  }, [])
}

function normalizeAiSubjectIds(value) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(',')
  return source.map(normalizeId).filter((id, index, ids) => id !== null && ids.findIndex((item) => String(item) === String(id)) === index)
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (Number.isSafeInteger(number) && number > 0) return number
  const text = String(value).trim()
  return text && text !== '0' ? text : null
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
