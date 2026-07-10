import { ref } from 'vue'

const MENU_WIDTH = 138
const MENU_HEIGHT = 146
const MENU_PADDING = 6

/**
 * 管理由 canvas-editor-core 事件驱动的 Vue 层级菜单。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
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
  }

  /** @returns {void} */
  function closeLayerMenu() {
    getEditor()?.closeLayerMenu()
  }

  return {
    layerMenu,
    showLayerMenu,
    hideLayerMenu,
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

  return {
    x: Math.min(Math.max(rawX, MENU_PADDING), hostBounds.width - MENU_WIDTH - MENU_PADDING),
    y: Math.min(Math.max(rawY, MENU_PADDING), hostBounds.height - MENU_HEIGHT - MENU_PADDING)
  }
}
