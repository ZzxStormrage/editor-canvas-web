<template>
  <div
    ref="hostRef"
    class="canvas-document-viewport"
    :class="{ 'is-zoom-limited': zoomLimits !== false }"
  ></div>
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
    default: () => ({ minRatio: 1, maxRatio: 1 })
  }
})

const emit = defineEmits(['ready', 'loaded', 'error'])
const hostRef = ref(null)
let editor = null
let resizeObserver = null
let initialZoomOptions = null
const H5_DOCUMENT_LOAD_DEFAULTS = Object.freeze({ deferHiddenImages: true })

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
      ...props.loadOptions
    })
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
  if (editor && props.fitOptions !== false) {
    restoreInitialZoomOptions()
    editor.fitArtboardToView(props.fitOptions)
    applyZoomLimits()
  }
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
  const fittedZoom = Number(editor.state.zoom)
  const minRatio = normalizeZoomRatio(options.minRatio, 1)
  const maxRatio = Math.max(minRatio, normalizeZoomRatio(options.maxRatio, 2))

  editor.state.zoomOptions = {
    ...editor.state.zoomOptions,
    min: fittedZoom * minRatio,
    max: fittedZoom * maxRatio,
    initial: fittedZoom
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

  editor = createEditor({
    view: hostRef.value,
    autoResize: true,
    areaType: 'blank',
    showGrid: false,
    background: 'transparent',
    ...props.editorOptions
  })
  initialZoomOptions = { ...editor.state.zoomOptions }
  resizeObserver = new ResizeObserver(fitArtboard)
  resizeObserver.observe(hostRef.value)
  emit('ready', editor)
  void loadDocument()
}

/** @returns {void} 销毁核心实例和尺寸监听。 */
function unmountEditor() {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.destroy()
  editor = null
  initialZoomOptions = null
}

watch(() => props.document, (document) => {
  void loadDocument(document)
})

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

.canvas-document-viewport.is-zoom-limited {
  overscroll-behavior: contain;
  touch-action: none;
}
</style>
