<template>
  <div class="canvas-document-viewport">
    <div
      ref="hostRef"
      class="canvas-document-surface"
      :class="{ 'is-zoom-limited': zoomLimits !== false }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="resetArtboardPan"
    ></div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { createEditor } from '../../../canvas-editor-core/src/index.js'

const props = defineProps({
  document: {
    type: [Object, String],
    required: true
  },
  editorOptions: {
    type: Object,
    default: () => ({})
  },
  loadOptions: {
    type: Object,
    default: () => ({})
  },
  fitOptions: {
    type: [Object, Number, Boolean],
    default: () => ({ padding: 0, viewportRatio: 1, expandZoomRange: true })
  },
  zoomLimits: {
    type: [Object, Boolean],
    default: () => ({ minRatio: 1, maxRatio: 4 })
  }
})

const emit = defineEmits(['ready', 'loaded', 'error'])
const hostRef = ref(null)
let editor = null
let resizeObserver = null
let initialZoomOptions = null
let removeZoomListener = null
let artboardPanTouchId = null
let artboardPanClientX = null
let artboardPanClientY = null
const H5_DOCUMENT_LOAD_DEFAULTS = Object.freeze({
  deferHiddenImages: true,
  interactive: false
})

/** @returns {import('../../../canvas-editor-core/src/core/Editor.js').Editor | null} 编辑器实例。 */
function getEditor() {
  return editor
}

/**
 * 加载统一文档并按容器适配画板。
 *
 * @param {string | Object} [document=props.document] 文档数据。
 * @returns {Promise<Object | null>} 已加载文档。
 */
async function loadDocument(document = props.document) {
  if (!editor || !document) {
    return null
  }

  try {
    const loadedDocument = await editor.loadDocument(document, {
      ...H5_DOCUMENT_LOAD_DEFAULTS,
      ...props.loadOptions,
      interactive: false
    })
    editor.deselect()
    await nextTick()
    fitArtboard()
    emit('loaded', { editor, document: loadedDocument })
    return loadedDocument
  } catch (error) {
    emit('error', error)
    return null
  }
}

/** @returns {void} 按当前容器适配画板。 */
function fitArtboard() {
  if (!editor) {
    return
  }

  restoreInitialZoomOptions()
  if (props.fitOptions !== false) {
    editor.fitArtboardToView(props.fitOptions)
  }
  applyZoomLimits()
}

/**
 * 视口尺寸变化时先恢复初始化范围，避免上一次 H5 适配范围钳制新的 fit 值。
 *
 * @returns {void}
 */
function restoreInitialZoomOptions() {
  if (!editor || props.zoomLimits === false || !initialZoomOptions) {
    return
  }

  editor.state.zoomOptions = { ...initialZoomOptions }
}

/**
 * 将 H5 缩放范围限制在当前完整画板比例附近，不修改编辑器全局默认配置。
 *
 * @returns {void}
 */
function applyZoomLimits() {
  if (!editor || props.zoomLimits === false) {
    return
  }

  const options = typeof props.zoomLimits === 'object' ? props.zoomLimits : {}
  const nextFittedZoom = Number(editor.state.zoom)
  const minRatio = normalizeZoomRatio(options.minRatio, 1)
  const maxRatio = Math.max(minRatio, normalizeZoomRatio(options.maxRatio, 4))

  editor.state.zoomOptions = {
    ...editor.state.zoomOptions,
    min: nextFittedZoom * minRatio,
    max: nextFittedZoom * maxRatio,
    initial: nextFittedZoom
  }
}

/** @param {*} value 输入比例。 @param {number} fallback 默认比例。 @returns {number} 正比例。 */
function normalizeZoomRatio(value, fallback) {
  const ratio = Number(value)
  return Number.isFinite(ratio) && ratio > 0 ? ratio : fallback
}

/** @returns {void} 创建 H5 页面使用的画布核心实例。 */
function mountEditor() {
  if (!hostRef.value) {
    return
  }

  const customLeaferOptions = props.editorOptions.leaferOptions ?? {}
  editor = createEditor({
    view: hostRef.value,
    autoResize: true,
    areaType: 'blank',
    showGrid: false,
    background: 'transparent',
    ...props.editorOptions,
    leaferOptions: {
      ...customLeaferOptions,
      pointer: {
        ...customLeaferOptions.pointer,
        snap: false
      }
    }
  })
  initialZoomOptions = { ...editor.state.zoomOptions }
  removeZoomListener = editor.eventBus.on('viewport:zoom-changed', stabilizeArtboardPosition)
  resizeObserver = new ResizeObserver(fitArtboard)
  resizeObserver.observe(hostRef.value)
  emit('ready', editor)
  void loadDocument()
}

/** @returns {void} 销毁核心实例和尺寸监听。 */
function unmountEditor() {
  removeZoomListener?.()
  removeZoomListener = null
  resetArtboardPan()
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.destroy()
  editor = null
  initialZoomOptions = null
}

/** @returns {void} 缩放时保持画板垂直居中，并约束水平边界。 */
function stabilizeArtboardPosition() {
  editor?.centerArtboard({ horizontal: false, vertical: true })
  editor?.panArtboard(0, 0)
}

/** @param {TouchEvent} event 触摸开始事件。 @returns {void} */
function handleTouchStart(event) {
  if (!canPanArtboard() || event.touches.length !== 1) {
    resetArtboardPan()
    return
  }

  artboardPanTouchId = event.touches[0].identifier
  artboardPanClientX = event.touches[0].clientX
  artboardPanClientY = event.touches[0].clientY
}

/** @param {TouchEvent} event 触摸移动事件。 @returns {void} */
function handleTouchMove(event) {
  if (artboardPanTouchId === null || event.touches.length !== 1) {
    resetArtboardPan()
    return
  }

  const touch = findTouch(event.touches, artboardPanTouchId)
  if (!touch || artboardPanClientX === null || artboardPanClientY === null) {
    resetArtboardPan()
    return
  }

  const deltaX = touch.clientX - artboardPanClientX
  const deltaY = touch.clientY - artboardPanClientY
  artboardPanClientX = touch.clientX
  artboardPanClientY = touch.clientY
  editor?.panArtboard(deltaX, deltaY)
  event.preventDefault()
  event.stopPropagation()
}

/** @param {TouchEvent} event 触摸结束事件。 @returns {void} */
function handleTouchEnd(event) {
  resetArtboardPan()
  if (canPanArtboard() && event.touches.length === 1) {
    artboardPanTouchId = event.touches[0].identifier
    artboardPanClientX = event.touches[0].clientX
    artboardPanClientY = event.touches[0].clientY
  }
}

/** @returns {boolean} 当前是否已放大到可移动画板。 */
function canPanArtboard() {
  if (!editor || props.zoomLimits === false) {
    return false
  }

  return Number(editor.state.zoom) > Number(editor.state.zoomOptions.min) + 0.0001
}

/** @param {TouchList} touches 触点列表。 @param {number} identifier 触点 ID。 @returns {Touch | null} */
function findTouch(touches, identifier) {
  for (let index = 0; index < touches.length; index += 1) {
    if (touches[index].identifier === identifier) {
      return touches[index]
    }
  }

  return null
}

/** @returns {void} 清理单指移动状态。 */
function resetArtboardPan() {
  artboardPanTouchId = null
  artboardPanClientX = null
  artboardPanClientY = null
}

watch(
  () => props.document,
  (document) => {
    void loadDocument(document)
  }
)

onMounted(mountEditor)
onBeforeUnmount(unmountEditor)

defineExpose({
  getEditor,
  loadDocument,
  fitArtboard
})
</script>

<style scoped>
.canvas-document-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-document-surface {
  position: absolute;
  inset: 0;
}

.canvas-document-surface.is-zoom-limited {
  overscroll-behavior: contain;
  touch-action: none;
}
</style>
