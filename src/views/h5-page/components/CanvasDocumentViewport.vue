<template>
  <div class="canvas-document-viewport">
    <div v-if="canvases.length > 1" class="canvas-document-tabs" role="tablist" aria-label="定制面">
      <button
        v-for="canvas in canvases"
        :key="canvas.id"
        type="button"
        role="tab"
        :aria-selected="activeId === canvas.id"
        :disabled="busy"
        @click="selectCanvas(canvas.id)"
      >{{ canvas.name }}</button>
    </div>
    <div class="canvas-document-stage">
      <SingleCanvasDocumentViewport
        v-for="canvas in canvases"
        :key="`${generation}:${canvas.id}`"
        :ref="(instance) => setViewport(canvas.id, instance)"
        class="canvas-document-part"
        :class="{ 'is-inactive': activeId !== canvas.id }"
        :aria-hidden="activeId !== canvas.id"
        :inert="activeId !== canvas.id || undefined"
        :document="canvas.document"
        :editor-options="editorOptions"
        :load-options="loadOptions"
        :fit-options="fitOptions"
        :zoom-limits="zoomLimits"
        @loaded="onLoaded(canvas.id, $event)"
        @image-click="!busy && emit('image-click', $event)"
        @error="emit('error', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { getDocumentCanvases } from '../../../services/image-replacement-groups.js'
import { createMultiCanvasEditor } from '../services/multi-canvas-editor.js'
import SingleCanvasDocumentViewport from './SingleCanvasDocumentViewport.vue'

const props = defineProps({
  document: { type: [Object, String], required: true },
  editorOptions: { type: Object, default: () => ({}) },
  loadOptions: { type: Object, default: () => ({}) },
  fitOptions: { type: [Object, Number, Boolean], default: () => ({ padding: 0, viewportRatio: 1, expandZoomRange: true }) },
  zoomLimits: { type: [Object, Boolean], default: () => ({ minRatio: 1, maxRatio: 4 }) },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['ready', 'loaded', 'error', 'image-click'])
const canvases = ref([])
const activeId = ref('')
const generation = ref(0)
const viewports = new Map()
const loaded = new Map()
let facade = null
let multi = false

watch(() => props.document, (value) => {
  try {
    const document = typeof value === 'string' ? JSON.parse(value) : value
    multi = document?.version === 2
    generation.value += 1
    loaded.clear()
    viewports.clear()
    facade = null
    canvases.value = getDocumentCanvases(document)
    activeId.value = canvases.value[0]?.id
  } catch (error) {
    emit('error', error)
  }
}, { immediate: true })

function setViewport(id, instance) {
  if (instance) viewports.set(id, instance)
  else viewports.delete(id)
}

function onLoaded(id, payload) {
  loaded.set(id, payload.editor)
  if (loaded.size !== canvases.value.length) return
  facade = createMultiCanvasEditor(
    () => canvases.value.map((canvas) => ({ ...canvas, editor: loaded.get(canvas.id) })),
    () => loaded.get(activeId.value),
    multi
  )
  emit('ready', facade)
  emit('loaded', { editor: facade, document: props.document })
}

async function selectCanvas(id) {
  if (props.busy) return
  activeId.value = id
  await nextTick()
  viewports.get(id)?.fitArtboard()
}

function getEditor() { return facade }
function fitArtboard() { viewports.get(activeId.value)?.fitArtboard() }
async function loadDocument(document) {
  return await viewports.get(activeId.value)?.loadDocument(document)
}
defineExpose({ getEditor, fitArtboard, loadDocument, selectCanvas })
</script>

<style scoped>
.canvas-document-viewport { display: flex; flex-direction: column; position: relative; width: 100%; height: 100%; overflow: hidden; }
.canvas-document-stage { position: relative; flex: 1; min-height: 0; }
.canvas-document-part { position: absolute; inset: 0; transition: opacity 160ms ease-out; }
.canvas-document-part.is-inactive { opacity: 0; pointer-events: none; visibility: hidden; }
.canvas-document-tabs { display: flex; overflow-x: auto; gap: 6px; padding: 6px; flex-shrink: 0; }
.canvas-document-tabs button { padding: 6px 12px; border: 0; color: #333; background: #fff; border-radius: 6px; font: inherit; font-size: 12px; white-space: nowrap; cursor: pointer; }
.canvas-document-tabs button[aria-selected="true"] { color: #c7002d; background: #fff3f3; }
.canvas-document-tabs button:focus-visible { outline: 2px solid #c7002d; outline-offset: -2px; }
.canvas-document-tabs button:disabled { opacity: 0.5; cursor: wait; }
@media (prefers-reduced-motion: reduce) { .canvas-document-part { transition: none; } }
</style>
