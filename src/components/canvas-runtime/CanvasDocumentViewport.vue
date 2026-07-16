<template>
  <div ref="hostRef" class="canvas-document-viewport"></div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { createEditor } from '../../canvas-editor-core/src/index.js'

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
  }
})

const emit = defineEmits(['ready', 'loaded', 'error'])
const hostRef = ref(null)
let editor = null
let resizeObserver = null

/** @returns {import('../../canvas-editor-core/src/core/Editor.js').Editor | null} 编辑器实例。 */
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
    const loadedDocument = await editor.loadDocument(document, props.loadOptions)
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
    editor.fitArtboardToView(props.fitOptions)
  }
}

/** @returns {void} 创建只包含画布的核心实例。 */
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
</style>
