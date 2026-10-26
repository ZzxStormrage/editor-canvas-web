const TEXT_RESIZE_POINT_INDEXES = new Set([0, 3])

/**
 * 获取文字选框缩放点的编辑配置。
 *
 * @param {number} index Leafer EditBox 的控制点索引。
 * @returns {{ editSize: 'font-size' | 'size', lockRatio: boolean } | null}
 */
export function getTextResizePointEditConfig(index) {
  if (!TEXT_RESIZE_POINT_INDEXES.has(index)) {
    return null
  }

  const isFontSizePoint = index === 0
  return {
    editSize: isFontSizePoint ? 'font-size' : 'size',
    lockRatio: isFontSizePoint
  }
}

/**
 * 在 EditBox 刷新后恢复文字选框的有效缩放点和编辑模式。
 *
 * @param {import('@leafer-in/interface').IEditBox} editBox Leafer 编辑框。
 * @returns {void}
 */
export function syncTextResizeControls(editBox) {
  editBox?.resizePoints?.forEach((point, index) => {
    const editConfig = getTextResizePointEditConfig(index)
    if (editConfig) {
      point.editConfig = editConfig
      return
    }

    point.visible = false
    point.cursor = undefined
    point.hittable = false
    point.editConfig = undefined
  })

  editBox?.resizeLines?.forEach((line) => {
    line.visible = false
    line.cursor = undefined
    line.hittable = false
    line.editConfig = undefined
  })
}
