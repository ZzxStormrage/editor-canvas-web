/**
 * 读取图片业务属性中的素材组绑定。
 *
 * 同时兼容早期可能写入的 `image.materialGroup` 对象，统一返回扁平绑定数据。
 *
 * @param {Object} attributes 元素业务属性。
 * @returns {{ id: string | number, name: string } | null} 素材组绑定。
 */
export function readImageMaterialGroupBinding(attributes) {
  const imageAttributes = isPlainObject(attributes?.image) ? attributes.image : {}
  const legacyBinding = isPlainObject(imageAttributes.materialGroup)
    ? imageAttributes.materialGroup
    : {}
  const id = normalizeMaterialGroupId(
    imageAttributes.materialGroupId ?? legacyBinding.id
  )

  if (id === null) {
    return null
  }

  return {
    id,
    name: normalizeText(
      imageAttributes.materialGroupName ?? legacyBinding.groupName ?? legacyBinding.name
    )
  }
}

/**
 * 将选择的素材组写入图片业务属性。
 *
 * @param {Object} imageAttributes 当前图片业务属性。
 * @param {string | number | null} groupId 选择的素材组 ID。
 * @param {Object[]} materialGroups 当前可用素材组。
 * @param {{ id: string | number, name: string } | null} [fallbackBinding=null]
 * 已保存但当前列表中不存在的绑定。
 * @returns {Object} 更新后的图片业务属性。
 */
export function applyImageMaterialGroupBinding(
  imageAttributes,
  groupId,
  materialGroups,
  fallbackBinding = null
) {
  const nextAttributes = isPlainObject(imageAttributes) ? { ...imageAttributes } : {}
  const normalizedId = normalizeMaterialGroupId(groupId)

  delete nextAttributes.materialGroup

  if (normalizedId === null) {
    delete nextAttributes.materialGroupId
    delete nextAttributes.materialGroupName
    return nextAttributes
  }

  const selectedGroup = findMaterialGroup(materialGroups, normalizedId)
  const fallbackName = String(fallbackBinding?.id) === String(normalizedId)
    ? fallbackBinding.name
    : ''
  const groupName = normalizeText(selectedGroup?.groupName ?? fallbackName)

  nextAttributes.materialGroupId = selectedGroup?.id ?? normalizedId
  if (groupName) {
    nextAttributes.materialGroupName = groupName
  } else {
    delete nextAttributes.materialGroupName
  }

  return nextAttributes
}

/**
 * 按 ID 查找素材组。
 *
 * @param {Object[]} materialGroups 素材组列表。
 * @param {string | number} groupId 素材组 ID。
 * @returns {Object | null} 匹配素材组。
 */
export function findMaterialGroup(materialGroups, groupId) {
  return (Array.isArray(materialGroups) ? materialGroups : []).find((group) => {
    return String(group?.id) === String(groupId)
  }) ?? null
}

/** @param {*} value 原始 ID。 @returns {string | number | null} 可保存 ID。 */
function normalizeMaterialGroupId(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const number = Number(value)
  if (Number.isSafeInteger(number) && number > 0) {
    return number
  }

  const text = String(value).trim()
  return text && text !== '0' ? text : null
}

/** @param {*} value 原始文本。 @returns {string} 去除首尾空格后的文本。 */
function normalizeText(value) {
  return value === undefined || value === null ? '' : String(value).trim()
}

/** @param {*} value 原始值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
