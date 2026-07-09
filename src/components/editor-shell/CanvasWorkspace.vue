<template>
  <main class="canvas-workspace-panel">
    <div class="workspace-meta">
      <v-chip prepend-icon="mdi-artboard" variant="flat">
        {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}
      </v-chip>
      <div class="zoom-cluster">
        <v-btn icon="mdi-minus" variant="tonal" aria-label="缩小" @click="editor.zoomOut" />
        <span>{{ editor.zoomPercent.value }}%</span>
        <v-btn icon="mdi-plus" variant="tonal" aria-label="放大" @click="editor.zoomIn" />
        <v-btn icon="mdi-fit-to-page-outline" variant="tonal" aria-label="重置缩放" @click="editor.resetZoom" />
      </div>
    </div>

    <div class="workspace-stage">
      <div class="canvas-host">
        <div
          :ref="setCanvasRef"
          class="canvas-view"
          @dblclick="editor.handleCanvasDoubleClick"
        ></div>
      </div>
    </div>
  </main>
</template>

<script setup>
const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

/**
 * 把画布挂载节点交给 canvas-editor-core 初始化。
 *
 * @param {HTMLElement | null} element Leafer 容器节点。
 * @returns {void}
 */
function setCanvasRef(element) {
  if (props.editor?.canvasRef) {
    props.editor.canvasRef.value = element;
  }
}
</script>
