import { ref } from 'vue'

/**
 * 管理图层面板状态。
 *
 * Vue 层只保存可渲染 DTO；实际排序、锁定、删除和 hover 均委托给 LayerPlugin。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @returns {Object} 图层列表状态与操作。
 */
export function useLayerControls(getEditor) {
  const layers = ref([])
  const draggingLayer = ref(false)

  /** @param {Array<Object>} nextLayers LayerPlugin 提供的图层 DTO。 */
  function setLayers(nextLayers) {
    if (!draggingLayer.value) {
      layers.value = Array.isArray(nextLayers) ? nextLayers : []
    }
  }

  /** 从内核读取最新图层快照。 */
  function refreshLayers() {
    setLayers(getEditor()?.layer?.getList?.() ?? [])
  }

  /** 开始拖拽时暂停事件快照覆盖本地排序状态。 */
  function startLayerDrag() {
    draggingLayer.value = true
  }

  /** 拖拽结束后将面板顺序一次性提交给 LayerPlugin。 */
  function endLayerDrag() {
    getEditor()?.layer?.reorder(layers.value.map((layer) => layer.id))
    draggingLayer.value = false
    refreshLayers()
  }

  /** @param {string} id 图层 ID。 */
  function selectLayer(id) {
    getEditor()?.layer?.select(id)
  }

  /** @param {string} id 图层 ID。 */
  function deleteLayer(id) {
    getEditor()?.layer?.remove(id)
  }

  /** @param {string} id 图层 ID。 */
  function toggleLayerLock(id) {
    getEditor()?.layer?.toggleLock(id)
  }

  /** @param {string} id 图层 ID。 */
  function toggleLayerVisibility(id) {
    getEditor()?.layer?.toggleVisibility(id)
  }

  /** @param {string} id 图片图层 ID。 */
  function toggleLayerPointerThrough(id) {
    getEditor()?.layer?.togglePointerThrough(id)
  }

  /** @param {string | null} id 图层 ID。 */
  function hoverLayer(id) {
    getEditor()?.layer?.hover(id)
  }

  /**
   * 按需获取真实图层缩略图。
   *
   * @param {string} id 图层 ID。
   * @param {{ maxSize?: number }} [options] 缩略图配置。
   * @returns {Promise<string | null>} 缩略图地址。
   */
  async function getLayerThumbnail(id, options) {
    return await (getEditor()?.layer?.getThumbnail(id, options) ?? null)
  }

  return {
    layers,
    draggingLayer,
    setLayers,
    refreshLayers,
    startLayerDrag,
    endLayerDrag,
    selectLayer,
    deleteLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    toggleLayerPointerThrough,
    hoverLayer,
    getLayerThumbnail
  }
}
