import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 管理 custom 编辑器的多生产区域状态。
 *
 * @param {Object} editor 应用层 canvas editor facade。
 * @param {(message: string, type: 'success' | 'error') => void} [notify] 通知回调。
 * @returns {Object} 区域状态与操作。
 */
export function useProductionAreas(editor, notify = () => {}) {
  const areas = ref([])
  const activeAreaId = ref(null)
  let unsubscribe = null

  /** @param {Object[]} nextAreas 核心区域数据。 @returns {void} */
  function syncAreas(nextAreas = []) {
    areas.value = Array.isArray(nextAreas) ? nextAreas : []
    if (!areas.value.some((area) => area.id === activeAreaId.value)) {
      activeAreaId.value = areas.value.find((area) => area.selected)?.id ?? areas.value[0]?.id ?? null
    }
  }

  /** @returns {void} 新增并打开生产区域属性。 */
  function addArea() {
    editor.getEditor()?.createProductionArea()
    syncAreas(editor.getEditor()?.getProductionAreas())
    activeAreaId.value = areas.value.find((area) => area.selected)?.id ?? areas.value.at(-1)?.id ?? null
  }

  /** @param {string} id 区域 ID。 @returns {void} */
  function selectArea(id) {
    activeAreaId.value = id
    editor.getEditor()?.selectProductionArea(id)
    syncAreas(editor.getEditor()?.getProductionAreas())
  }

  /**
   * 将当前区域的内容复制到目标区域。
   *
   * @param {string} targetId 目标区域 ID。
   * @returns {number} 复制元素数。
   */
  function copyToArea(targetId) {
    if (!activeAreaId.value || activeAreaId.value === targetId) return 0
    const count = editor.getEditor()?.copyProductionAreaContents(activeAreaId.value, targetId) ?? 0
    if (count) notify(`已复制 ${count} 个元素到目标生产区域`, 'success')
    else notify('当前生产区域内没有可复制的元素。', 'error')
    return count
  }

  /** @returns {void} 删除当前区域。 */
  function deleteActiveArea() {
    if (!activeAreaId.value) return
    editor.getEditor()?.removeProductionArea(activeAreaId.value)
    syncAreas(editor.getEditor()?.getProductionAreas())
    activeAreaId.value = areas.value[0]?.id ?? null
    if (activeAreaId.value) editor.getEditor()?.selectProductionArea(activeAreaId.value)
  }

  onMounted(async () => {
    try {
      const coreEditor = await editor.whenReady()
      syncAreas(coreEditor.getProductionAreas())
      unsubscribe = coreEditor.eventBus.on('production:areas-changed', ({ areas: nextAreas, activeAreaId: id }) => {
        syncAreas(nextAreas)
        if (id) activeAreaId.value = id
      })
      syncAreas(coreEditor.getProductionAreas())
    } catch (error) {
      notify(error?.message || '生产区域初始化失败。', 'error')
    }
  })

  onBeforeUnmount(() => unsubscribe?.())

  return { areas, activeAreaId, addArea, selectArea, copyToArea, deleteActiveArea }
}
