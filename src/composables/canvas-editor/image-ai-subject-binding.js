/**
 * 读取图片业务属性中的 AI 主题绑定。
 *
 * 新格式使用 `image.aiSubjectIds` 数组，同时兼容旧的 `aiSubjectId` 单值。
 *
 * @param {Object} attributes 元素业务属性。
 * @returns {{ ids: Array<string | number>, names: string[] }} AI 主题绑定。
 */
export function readImageAiSubjectBinding(attributes) {
  const imageAttributes = isPlainObject(attributes?.image) ? attributes.image : {}
  const ids = normalizeAiSubjectIds(
    imageAttributes.aiSubjectIds ?? imageAttributes.aiSubjectId
  )
  const names = normalizeTextList(
    imageAttributes.aiSubjectNames ?? imageAttributes.aiSubjectName
  )

  return { ids, names }
}

/**
 * 将 AI 主题绑定写入图片业务属性。
 *
 * @param {Object} imageAttributes 当前图片业务属性。
 * @param {*} subjectIds 选中的主题 ID。
 * @param {Object[]} subjects 可用主题列表。
 * @param {{ ids?: Array<string | number>, names?: string[] }} [fallbackBinding]
 * 已保存但当前列表中不存在的绑定。
 * @returns {Object} 更新后的图片业务属性。
 */
export function applyImageAiSubjectBinding(
  imageAttributes,
  subjectIds,
  subjects = [],
  fallbackBinding = null
) {
  const nextAttributes = isPlainObject(imageAttributes) ? { ...imageAttributes } : {}
  const ids = normalizeAiSubjectIds(subjectIds)

  delete nextAttributes.aiSubjectId
  delete nextAttributes.aiSubjectName

  if (!ids.length) {
    delete nextAttributes.aiSubjectIds
    delete nextAttributes.aiSubjectNames
    return nextAttributes
  }

  const fallbackIds = normalizeAiSubjectIds(fallbackBinding?.ids)
  const fallbackNames = normalizeTextList(fallbackBinding?.names)
  const names = ids.map((id) => {
    const subject = findAiSubject(subjects, id)
    if (subject) return normalizeText(subject.subjectName ?? subject.name)

    const fallbackIndex = fallbackIds.findIndex((fallbackId) => String(fallbackId) === String(id))
    return fallbackIndex >= 0 ? fallbackNames[fallbackIndex] || '' : ''
  })

  nextAttributes.aiSubjectIds = ids
  if (names.some(Boolean)) {
    nextAttributes.aiSubjectNames = names
  } else {
    delete nextAttributes.aiSubjectNames
  }

  return nextAttributes
}

/** @param {Object[]} subjects AI 主题列表。 @param {*} subjectId 主题 ID。 @returns {Object | null} 匹配主题。 */
export function findAiSubject(subjects, subjectId) {
  return (Array.isArray(subjects) ? subjects : []).find((subject) => {
    return String(subject?.id ?? subject?.subjectId) === String(subjectId)
  }) ?? null
}

/** @param {*} value 原始主题 ID。 @returns {Array<string | number>} 归一化 ID。 */
export function normalizeAiSubjectIds(value) {
  const source = Array.isArray(value) ? value : [value]
  const ids = []
  const seen = new Set()

  source.flatMap((item) => String(item ?? '').split(',')).forEach((candidate) => {
    const text = candidate.trim()
    if (!text) return
    const number = Number(text)
    const id = Number.isSafeInteger(number) && number > 0 ? number : text
    const key = String(id)
    if (key === '0' || seen.has(key)) return
    seen.add(key)
    ids.push(id)
  })

  return ids
}

/** @param {*} value 原始文本列表。 @returns {string[]} 归一化文本列表。 */
function normalizeTextList(value) {
  if (Array.isArray(value)) return value.map(normalizeText)
  const text = normalizeText(value)
  return text ? [text] : []
}

/** @param {*} value 原始文本。 @returns {string} 清理后的文本。 */
function normalizeText(value) {
  return value === undefined || value === null ? '' : String(value).trim()
}

/** @param {*} value 待判断值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
