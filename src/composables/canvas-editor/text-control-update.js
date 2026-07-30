/**
 * 生成文本面板更新时需要保留的选择框宽度。
 *
 * 同方向修改对齐、颜色等属性时保留用户调整过的宽度；横竖方向切换时不携带
 * 旧宽度，让 TextPlugin 按新方向重新测量文本，避免横排宽度污染竖排选框。
 *
 * @param {Object} selectedText 当前选中的文本节点。
 * @param {'x' | 'y' | 'x-reverse' | 'y-reverse'} nextWritingMode 下一书写方向。
 * @returns {{ width?: number }} 文本更新尺寸补丁。
 */
export function resolveTextWidthPatch(selectedText, nextWritingMode) {
  const currentWritingMode = selectedText?.writingMode ?? selectedText?.__?.writingMode ?? 'x'

  if (currentWritingMode !== nextWritingMode) {
    return {}
  }

  const selectedWidth = Number(selectedText?.width ?? selectedText?.__?.width)
  return Number.isFinite(selectedWidth) && selectedWidth > 0 ? { width: selectedWidth } : {}
}
