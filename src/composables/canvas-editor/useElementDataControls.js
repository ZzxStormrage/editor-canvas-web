/**
 * 提供给 Vue 组件使用的元素业务属性调用层。
 *
 * 组件不接触 Leafer 节点，只操作当前单选元素，降低 UI 与画布内核的耦合。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @returns {Object} 元素业务属性操作。
 */
export function useElementDataControls(getEditor) {
  /**
   * 获取当前单选元素的业务属性。
   *
   * @returns {Object | null} 业务属性快照。
   */
  function getSelectedElementAttributes() {
    return getEditor()?.elementData?.getSelected() ?? null
  }

  /**
   * 合并或替换当前单选元素的业务属性。
   *
   * @param {Object} attributes H5 所需业务属性。
   * @param {{ replace?: boolean }} [options={}] 写入选项。
   * @returns {Object | null} 更新后的业务属性。
   */
  function setSelectedElementAttributes(attributes, options = {}) {
    return getEditor()?.elementData?.setSelected(attributes, options) ?? null
  }

  /**
   * 删除当前单选元素的业务字段。
   *
   * @param {string | string[]} keys 字段名。
   * @returns {Object | null} 更新后的业务属性。
   */
  function removeSelectedElementAttributes(keys) {
    return getEditor()?.elementData?.removeSelected(keys) ?? null
  }

  /** 清空当前单选元素的业务属性。 */
  function clearSelectedElementAttributes() {
    getEditor()?.elementData?.clearSelected()
  }

  /**
   * 导出所有供 H5 消费的元素业务属性。
   *
   * @param {{ includeEmpty?: boolean }} [options={}] 导出选项。
   * @returns {Array<Object>} 元素业务数据列表。
   */
  function exportElementAttributes(options = {}) {
    return getEditor()?.elementData?.export(options) ?? []
  }

  /**
   * 按 elementId 获取业务属性。
   *
   * @param {string} elementId 元素业务 ID。
   * @returns {Object | null} 业务属性快照。
   */
  function getElementAttributesById(elementId) {
    return getEditor()?.elementData?.getById(elementId) ?? null
  }

  /**
   * 按 elementId 写入业务属性。
   *
   * @param {string} elementId 元素业务 ID。
   * @param {Object} attributes 业务属性。
   * @param {{ replace?: boolean }} [options={}] 写入选项。
   * @returns {Object | null} 更新后的业务属性。
   */
  function setElementAttributesById(elementId, attributes, options = {}) {
    return getEditor()?.elementData?.setById(elementId, attributes, options) ?? null
  }

  /**
   * 删除指定元素的业务字段。
   *
   * @param {string} elementId 元素业务 ID。
   * @param {string | string[]} keys 字段名。
   * @returns {Object | null} 更新后的业务属性。
   */
  function removeElementAttributesById(elementId, keys) {
    const editor = getEditor()
    const attributes = editor?.elementData?.getById(elementId)

    if (!editor || !attributes) {
      return null
    }

    const nextAttributes = { ...attributes }
    ;(Array.isArray(keys) ? keys : [keys]).forEach((key) => delete nextAttributes[key])
    return editor.elementData.setById(elementId, nextAttributes, { replace: true })
  }

  return {
    getSelectedElementAttributes,
    setSelectedElementAttributes,
    removeSelectedElementAttributes,
    clearSelectedElementAttributes,
    exportElementAttributes,
    getElementAttributesById,
    setElementAttributesById,
    removeElementAttributesById
  }
}
