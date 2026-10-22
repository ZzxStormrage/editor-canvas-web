import { ref } from 'vue'

const TOOLBAR_BASE_WIDTH = 154
const TOOLBAR_CONTEXT_ACTION_WIDTH = 36
const TOOLBAR_HEIGHT = 40
const TOOLBAR_GAP = 10
const TOOLBAR_PADDING = 8

const EMPTY_TOOLBAR = {
  visible: false,
  x: 0,
  y: 0,
  width: TOOLBAR_BASE_WIDTH,
  locked: false,
  selectionCount: 0,
  isImageSelection: false,
  canEditAttributes: false,
  canGroup: false,
  canUngroup: false,
  disabled: {
    replace: true,
    attributes: true,
    duplicate: true,
    delete: true,
    layer: true,
    group: true,
    ungroup: true
  }
}

/**
 * 管理 Vue 选区工具条的视图状态和编辑器 API 调用。
 *
 * @param {() => import('../../core/Editor.js').Editor | null} getEditor
 * 获取编辑器实例。
 * @param {import('vue').Ref<HTMLElement | null>} canvasRef 画布宿主元素。
 * @returns {Object} 工具条状态、生命周期和选区操作。
 */
export function useSelectionToolbar(getEditor, canvasRef) {
  const selectionToolbar = ref({ ...EMPTY_TOOLBAR })
  let resizeObserver = null
  let updateFrame = null
  let pendingState = null

  /**
   * 根据核心选区状态更新 Vue 工具条。
   *
   * @param {Object | null} [state] 核心返回的选区工具条状态。
   * @returns {void}
   */
  function syncSelectionToolbar(state = null) {
    pendingState = state

    if (updateFrame !== null) {
      return
    }

    updateFrame = requestAnimationFrame(() => {
      updateFrame = null
      const nextState = pendingState ?? getEditor()?.getSelectionToolbarState?.()
      pendingState = null
      selectionToolbar.value = createToolbarViewState(nextState, canvasRef.value)
    })
  }

  /**
   * 开始监听画布容器尺寸变化。
   *
   * @returns {void}
   */
  function startSelectionToolbar() {
    stopResizeObserver()

    if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncSelectionToolbar())
      resizeObserver.observe(canvasRef.value)
    }

    syncSelectionToolbar()
  }

  /**
   * 停止工具条定位任务和尺寸监听。
   *
   * @returns {void}
   */
  function stopSelectionToolbar() {
    stopResizeObserver()

    if (updateFrame !== null) {
      cancelAnimationFrame(updateFrame)
      updateFrame = null
    }

    pendingState = null
    selectionToolbar.value = { ...EMPTY_TOOLBAR }
  }

  /**
   * 断开画布尺寸监听。
   *
   * @returns {void}
   */
  function stopResizeObserver() {
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  /**
   * 切换当前选区锁定状态。
   *
   * @returns {void}
   */
  function toggleSelectionLock() {
    getEditor()?.toggleSelectionLock()
  }

  /**
   * 复制当前选区。
   *
   * @returns {void}
   */
  function duplicateSelection() {
    getEditor()?.duplicateSelection()
  }

  /**
   * 删除当前选区。
   *
   * @returns {void}
   */
  function deleteSelection() {
    getEditor()?.deleteSelection()
  }

  /**
   * 组合当前多选节点。
   *
   * @returns {void}
   */
  function groupSelection() {
    getEditor()?.groupSelection()
  }

  /**
   * 解散当前组合节点。
   *
   * @returns {void}
   */
  function ungroupSelection() {
    getEditor()?.ungroupSelection()
  }

  return {
    selectionToolbar,
    syncSelectionToolbar,
    startSelectionToolbar,
    stopSelectionToolbar,
    toggleSelectionLock,
    duplicateSelection,
    deleteSelection,
    groupSelection,
    ungroupSelection
  }
}

/**
 * 将核心世界坐标状态转换成画布宿主内的 DOM 定位状态。
 *
 * @param {Object | null | undefined} state 核心选区状态。
 * @param {HTMLElement | null} host 画布宿主元素。
 * @returns {Object} Vue 工具条状态。
 */
function createToolbarViewState(state, host) {
  if (!state?.visible || !state.bounds || !host) {
    return { ...EMPTY_TOOLBAR }
  }

  const hostBounds = host.getBoundingClientRect()
  const contextActionCount = Number(
    state.selectionCount > 1 || state.canUngroup === true || state.isImageSelection === true
  ) + Number(state.canEditAttributes === true)
  const width = TOOLBAR_BASE_WIDTH + contextActionCount * TOOLBAR_CONTEXT_ACTION_WIDTH
  const position = getToolbarPosition(state.bounds, hostBounds, width)

  return {
    visible: true,
    x: position.x,
    y: position.y,
    width,
    locked: Boolean(state.locked),
    selectionCount: Number(state.selectionCount) || 0,
    isImageSelection: Boolean(state.isImageSelection),
    canEditAttributes: Boolean(state.canEditAttributes),
    canGroup: Boolean(state.canGroup),
    canUngroup: Boolean(state.canUngroup),
    disabled: {
      replace: Boolean(state.disabled?.replace),
      attributes: Boolean(state.disabled?.attributes),
      duplicate: Boolean(state.disabled?.duplicate),
      delete: Boolean(state.disabled?.delete),
      layer: Boolean(state.disabled?.layer),
      group: Boolean(state.disabled?.group),
      ungroup: Boolean(state.disabled?.ungroup)
    }
  }
}

/**
 * 计算工具条位置，优先显示在选区上方，空间不足时显示在下方。
 *
 * @param {{ x: number, y: number, width: number, height: number }} selectionBounds 选区边界。
 * @param {{ width: number, height: number }} hostBounds 画布宿主边界。
 * @param {number} toolbarWidth 工具条宽度。
 * @returns {{ x: number, y: number }} 工具条左上角坐标。
 */
function getToolbarPosition(selectionBounds, hostBounds, toolbarWidth) {
  const centeredX = selectionBounds.x + selectionBounds.width / 2 - toolbarWidth / 2
  const maxX = Math.max(TOOLBAR_PADDING, hostBounds.width - toolbarWidth - TOOLBAR_PADDING)
  const maxY = Math.max(TOOLBAR_PADDING, hostBounds.height - TOOLBAR_HEIGHT - TOOLBAR_PADDING)
  const aboveY = selectionBounds.y - TOOLBAR_HEIGHT - TOOLBAR_GAP
  const belowY = selectionBounds.y + selectionBounds.height + TOOLBAR_GAP
  const preferredY = aboveY >= TOOLBAR_PADDING ? aboveY : belowY

  return {
    x: Math.min(Math.max(centeredX, TOOLBAR_PADDING), maxX),
    y: Math.min(Math.max(preferredY, TOOLBAR_PADDING), maxY)
  }
}
