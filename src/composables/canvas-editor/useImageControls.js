import { ref } from 'vue'

/**
 * 管理图片属性面板状态，并通过 Editor 外观 API 与核心层双向同步。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor
 * 获取编辑器实例。
 * @returns {Object} 图片属性状态和操作方法。
 */
export function useImageControls(getEditor) {
  const imageProperties = ref(null)

  /**
   * 使用核心事件快照或 Editor 查询结果刷新图片属性。
   *
   * @param {Object | null | undefined} [properties] 图片属性快照。
   * @returns {void}
   */
  function syncImageProperties(properties) {
    imageProperties.value = arguments.length > 0
      ? properties ?? null
      : getEditor()?.getSelectedImageProperties?.() ?? null
  }

  /**
   * 更新当前单选图片属性，并立即读取规范化后的值。
   *
   * @param {Object} properties 图片属性补丁。
   * @returns {void}
   */
  function updateSelectedImageProperties(properties) {
    const editor = getEditor()

    if (!editor || !properties || typeof properties !== 'object') {
      return
    }

    editor.updateSelectedImageProperties(properties)
    syncImageProperties()
  }

  /**
   * 将当前单选图片恢复到原始像素尺寸。
   *
   * @returns {void}
   */
  function resetSelectedImageSize() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    editor.resetSelectedImageSize()
    syncImageProperties()
  }

  return {
    imageProperties,
    syncImageProperties,
    updateSelectedImageProperties,
    resetSelectedImageSize
  }
}
