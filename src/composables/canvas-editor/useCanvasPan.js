import { ref } from 'vue'

const SPACE_CODE = 'Space'

/**
 * 管理“按住空格拖拽画布”的应用层交互。
 *
 * 键盘和指针状态保留在 Vue 调用层，实际视口位移统一委托给 Editor 外观 API。
 *
 * @param {() => import('../../core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @returns {Object} 抓手状态与生命周期方法。
 */
export function useCanvasPan(getEditor) {
  const panReady = ref(false)
  const panning = ref(false)
  let view = null
  let started = false
  let activePointerId = null
  let previousPoint = null

  /** @param {HTMLElement | null} nextView 画布容器。 @returns {void} */
  function setView(nextView) {
    if (view === nextView) {
      return
    }

    view?.removeEventListener('pointerdown', handlePointerDown, true)
    endPan()
    view = nextView
    view?.addEventListener('pointerdown', handlePointerDown, true)
  }

  /** @returns {void} 启动全局空格和指针监听。 */
  function start() {
    if (started) {
      return
    }

    started = true
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerEnd, true)
    window.addEventListener('pointercancel', handlePointerEnd, true)
    window.addEventListener('blur', resetPanState)
  }

  /** @returns {void} 移除监听并清理抓手状态。 */
  function stop() {
    if (!started) {
      setView(null)
      resetPanState()
      return
    }

    window.removeEventListener('keydown', handleKeyDown, true)
    window.removeEventListener('keyup', handleKeyUp, true)
    window.removeEventListener('pointermove', handlePointerMove, true)
    window.removeEventListener('pointerup', handlePointerEnd, true)
    window.removeEventListener('pointercancel', handlePointerEnd, true)
    window.removeEventListener('blur', resetPanState)
    started = false
    setView(null)
    resetPanState()
  }

  /** @param {KeyboardEvent} event 键盘事件。 @returns {void} */
  function handleKeyDown(event) {
    if (!isSpaceEvent(event) || hasDisallowedModifier(event) || isInteractiveTarget(event.target)) {
      return
    }

    event.preventDefault()
    panReady.value = true
  }

  /** @param {KeyboardEvent} event 键盘事件。 @returns {void} */
  function handleKeyUp(event) {
    if (!isSpaceEvent(event)) {
      return
    }

    if (panReady.value || panning.value) {
      event.preventDefault()
    }
    panReady.value = false
    endPan()
  }

  /** @param {PointerEvent} event 指针事件。 @returns {void} */
  function handlePointerDown(event) {
    if (!panReady.value || event.button !== 0 || event.isPrimary === false) {
      return
    }

    stopPointerEvent(event)
    activePointerId = event.pointerId
    previousPoint = { x: event.clientX, y: event.clientY }
    panning.value = true
  }

  /** @param {PointerEvent} event 指针事件。 @returns {void} */
  function handlePointerMove(event) {
    if (!panning.value || event.pointerId !== activePointerId || !previousPoint) {
      return
    }

    stopPointerEvent(event)
    const deltaX = event.clientX - previousPoint.x
    const deltaY = event.clientY - previousPoint.y
    previousPoint = { x: event.clientX, y: event.clientY }
    getEditor()?.panBy(deltaX, deltaY)
  }

  /** @param {PointerEvent} event 指针事件。 @returns {void} */
  function handlePointerEnd(event) {
    if (!panning.value || event.pointerId !== activePointerId) {
      return
    }

    stopPointerEvent(event)
    endPan()
  }

  /** @returns {void} 结束当前指针拖拽，但保留空格按下状态。 */
  function endPan() {
    activePointerId = null
    previousPoint = null
    panning.value = false
  }

  /** @returns {void} 清理全部抓手状态。 */
  function resetPanState() {
    panReady.value = false
    endPan()
  }

  return {
    panReady,
    panning,
    setView,
    start,
    stop
  }
}

/** @param {KeyboardEvent} event 键盘事件。 @returns {boolean} 是否为空格键。 */
function isSpaceEvent(event) {
  return event.code === SPACE_CODE || event.key === ' '
}

/** @param {KeyboardEvent} event 键盘事件。 @returns {boolean} 是否包含不允许的修饰键。 */
function hasDisallowedModifier(event) {
  return event.altKey || event.ctrlKey || event.metaKey
}

/** @param {EventTarget | null} target 事件目标。 @returns {boolean} 是否由控件处理键盘事件。 */
function isInteractiveTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))
}

/** @param {PointerEvent} event 指针事件。 @returns {void} 阻止元素选择和拖动接管当前手势。 */
function stopPointerEvent(event) {
  event.preventDefault()
  event.stopImmediatePropagation()
}
