/**
 * 展开单画布或多部件文档，不改变输入。
 * @param {Object} document 模板文档。
 * @returns {Object[]} 部件列表。
 */
export function getDocumentCanvases(document) {
  if (document?.version === 2 && Array.isArray(document.canvases)) return document.canvases
  return document ? [{ id: 'default', name: '当前画布', document }] : []
}

/** @param {Object[]} elements 元素树。 @returns {Object[]} 包含组合子节点的列表。 */
export function flattenElements(elements = []) {
  return elements.flatMap((element) => [element, ...flattenElements(element.children ?? [])])
}

/**
 * 从所有部件中收集联动组和成员。组 ID 独立于名称和图层 ID。
 * @param {Object} document 单画布或多部件文档。
 * @returns {Object[]} 联动组。
 */
export function collectReplacementGroups(document) {
  const groups = new Map()
  getDocumentCanvases(document).forEach((canvas) => {
    flattenElements(canvas.document?.elements).forEach((element) => {
      const image = element.attributes?.image ?? {}
      const id = String(image.replacementGroupId ?? '').trim()
      if (String(element.tag).toLowerCase() !== 'image' || !id) return
      if (!groups.has(id)) groups.set(id, { id, name: image.replacementGroupName || '未命名联动组', members: [] })
      groups.get(id).members.push({
        canvasId: canvas.id,
        canvasName: canvas.name,
        elementId: element.elementId,
        name: element.attributes?.customization?.name || element.name || image.description || '图片'
      })
    })
  })
  return [...groups.values()]
}

/**
 * 将图片种子扩展为同组图片；显式关闭定制的图片不会被联动。
 * @param {Object} editor 编辑器或多画布外观。
 * @param {Object[]} targets 发起替换的节点。
 * @returns {Object[]} 去重后的替换目标。
 */
export function resolveLinkedImageTargets(editor, targets) {
  const read = (node) => editor.elementData?.get?.(node) ?? node.attributes ?? {}
  const seeds = targets.filter((node) => read(node).customization?.enabled !== false)
  const ids = new Set(seeds.map((node) => String(read(node).image?.replacementGroupId ?? '')).filter(Boolean))
  if (!ids.size) return [...new Set(seeds)]
  const linked = (editor.getElementsByType?.('image') ?? []).filter((node) => {
    const attributes = read(node)
    return attributes.customization?.enabled !== false
      && ids.has(String(attributes.image?.replacementGroupId ?? ''))
  })
  return [...new Set([...seeds, ...linked])]
}

/**
 * 为 H5 创建独立的可替换项：同组为一项，未分组图片各自为一项。
 * 仅存在新定制配置时启用，旧模板维持原来的批量替换行为。
 * @param {Object} editor 编辑器或多画布外观。
 * @returns {Object[]} 可替换项。
 */
export function createImageCustomizationEntries(editor) {
  const entries = new Map()
  ;(editor.getElementsByType?.('image') ?? []).forEach((node, index) => {
    const attributes = editor.elementData?.get?.(node) ?? node.attributes ?? {}
    const groupId = String(attributes.image?.replacementGroupId ?? '').trim()
    const name = attributes.customization?.name?.trim()
    if (attributes.customization?.enabled === false || (!groupId && !name)) return
    const id = groupId ? `group:${groupId}` : `image:${index}`
    if (!entries.has(id)) entries.set(id, {
      id,
      label: name || attributes.image?.replacementGroupName || attributes.image?.description || `图片 ${index + 1}`,
      targets: []
    })
    entries.get(id).targets.push(node)
  })
  return [...entries.values()]
}
