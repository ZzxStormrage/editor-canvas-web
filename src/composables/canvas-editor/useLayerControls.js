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
    const editor = getEditor()
    const targetLayer = layers.value.find((layer) => layer.id === id)
    const isOnlySelectedLayer = targetLayer?.selected === true && editor?.selectedElements?.length === 1

    if (isOnlySelectedLayer && typeof editor.toggleSelectionLock === 'function') {
      editor.toggleSelectionLock()
      return
    }

    editor?.layer?.toggleLock(id)
  }

  /** @param {string} id 图层 ID。 */
  function toggleLayerVisibility(id) {
    getEditor()?.layer?.toggleVisibility(id)
  }

  /** @param {string} id 图片图层 ID。 */
  function toggleLayerPointerThrough(id) {
    getEditor()?.layer?.togglePointerThrough(id)
  }

  /**
   * 将图层移动到面板顺序中的指定位置，并一次性提交给 LayerPlugin。
   *
   * 面板顺序从上到下对应视觉层级从高到低，因此索引 0 就是置顶位置。
   *
   * @param {string} id 图层 ID。
   * @param {number} targetIndex 目标索引。
   * @returns {boolean} 是否完成移动。
   */
  function moveLayerToIndex(id, targetIndex) {
    const currentIndex = layers.value.findIndex((layer) => layer.id === id)
    const normalizedTargetIndex = Math.max(0, Math.min(targetIndex, layers.value.length - 1))
    const layerApi = getEditor()?.layer

    if (
      currentIndex < 0
      || currentIndex === normalizedTargetIndex
      || typeof layerApi?.reorder !== 'function'
    ) {
      return false
    }

    const nextLayers = [...layers.value]
    const [targetLayer] = nextLayers.splice(currentIndex, 1)
    nextLayers.splice(normalizedTargetIndex, 0, targetLayer)
    layerApi.reorder(nextLayers.map((layer) => layer.id))
    refreshLayers()
    return true
  }

  /**
   * 将图层在面板顺序中移动指定偏移量。
   *
   * @param {string} id 图层 ID。
   * @param {-1 | 1} offset -1 上移一层，1 下移一层。
   * @returns {boolean} 是否完成移动。
   */
  function moveLayer(id, offset) {
    const currentIndex = layers.value.findIndex((layer) => layer.id === id)
    return moveLayerToIndex(id, currentIndex + offset)
  }

  /** @param {string} id 图层 ID。 @returns {boolean} 是否完成置顶。 */
  function moveLayerToFront(id) {
    return moveLayerToIndex(id, 0)
  }

  /** @param {string} id 图层 ID。 @returns {boolean} 是否完成上移。 */
  function moveLayerUp(id) {
    return moveLayer(id, -1)
  }

  /** @param {string} id 图层 ID。 @returns {boolean} 是否完成下移。 */
  function moveLayerDown(id) {
    return moveLayer(id, 1)
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
    moveLayerUp,
    moveLayerDown,
    moveLayerToFront,
    hoverLayer,
    getLayerThumbnail
  }
}
