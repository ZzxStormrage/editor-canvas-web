import { ref } from 'vue'

const MENU_WIDTH = 138
const MENU_HEIGHT = 146
const MENU_PADDING = 6
const MENU_GAP = 8

/**
 * 管理 Vue 层级菜单，并将层级命令委托给 Editor 外观 API。
 *
 * @param {() => import('../../core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @param {import('vue').Ref<HTMLElement | null>} canvasRef 画布宿主元素。
 * @returns {Object} 菜单状态和操作。
 */
export function useLayerMenu(getEditor, canvasRef) {
  const layerMenu = ref({
    visible: false,
    x: 0,
    y: 0,
    actions: []
  })

  /** @param {{ x: number, y: number, actions: Array }} payload 菜单事件数据。 */
  function showLayerMenu(payload) {
    const position = clampLayerMenuPosition(payload, canvasRef.value?.getBoundingClientRect?.())

    layerMenu.value = {
      visible: true,
      x: position.x,
      y: position.y,
      actions: payload?.actions ?? []
    }
  }

  /**
   * 根据 Vue 图层按钮位置打开或关闭菜单。
   *
   * @param {HTMLElement | null} anchor 图层按钮元素。
   * @returns {void}
   */
  function toggleLayerMenu(anchor) {
    if (layerMenu.value.visible) {
      closeLayerMenu()
      return
    }

    const editor = getEditor()
    const hostBounds = canvasRef.value?.getBoundingClientRect?.()
    const anchorBounds = anchor?.getBoundingClientRect?.()

    if (!editor || !hostBounds || !anchorBounds) {
      return
    }

    showLayerMenu({
      ...getLayerMenuAnchorPosition(anchorBounds, hostBounds),
      actions: editor.getSelectionLayerActions()
    })
  }

  /** @returns {void} */
  function hideLayerMenu() {
    layerMenu.value = {
      ...layerMenu.value,
      visible: false
    }
  }

  /** @param {'front' | 'forward' | 'backward' | 'back'} action 层级动作。 */
  function runLayerAction(action) {
    getEditor()?.runLayerAction(action)
    hideLayerMenu()
  }

  /** @returns {void} */
  function closeLayerMenu() {
    hideLayerMenu()
    getEditor()?.closeLayerMenu()
  }

  return {
    layerMenu,
    showLayerMenu,
    hideLayerMenu,
    toggleLayerMenu,
    runLayerAction,
    closeLayerMenu
  }
}

/**
 * 将菜单坐标限制在画布容器内部。
 *
 * @param {{ x: number, y: number }} payload 原始位置。
 * @param {{ width: number, height: number } | undefined} hostBounds 容器尺寸。
 * @returns {{ x: number, y: number }} 约束后的位置。
 */
function clampLayerMenuPosition(payload, hostBounds) {
  const rawX = payload?.x ?? 0
  const rawY = payload?.y ?? 0

  if (!hostBounds) {
    return { x: rawX, y: rawY }
  }

  const maxX = Math.max(MENU_PADDING, hostBounds.width - MENU_WIDTH - MENU_PADDING)
  const maxY = Math.max(MENU_PADDING, hostBounds.height - MENU_HEIGHT - MENU_PADDING)

  return {
    x: Math.min(Math.max(rawX, MENU_PADDING), maxX),
    y: Math.min(Math.max(rawY, MENU_PADDING), maxY)
  }
}

/**
 * 计算层级菜单相对画布宿主的位置，优先显示在按钮右侧。
 *
 * @param {DOMRect} anchorBounds 图层按钮边界。
 * @param {DOMRect} hostBounds 画布宿主边界。
 * @returns {{ x: number, y: number }} 菜单坐标。
 */
function getLayerMenuAnchorPosition(anchorBounds, hostBounds) {
  const rightX = anchorBounds.right - hostBounds.left + MENU_GAP
  const leftX = anchorBounds.left - hostBounds.left - MENU_WIDTH - MENU_GAP
  const canOpenRight = rightX + MENU_WIDTH <= hostBounds.width - MENU_PADDING

  return {
    x: canOpenRight ? rightX : leftX,
    y: anchorBounds.top - hostBounds.top
  }
}
