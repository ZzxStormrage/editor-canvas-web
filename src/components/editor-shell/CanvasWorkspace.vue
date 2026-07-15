<template>
  <main class="canvas-workspace-panel">
    <div class="workspace-meta">
      <v-chip class="artboard-chip" color="surface" prepend-icon="mdi-artboard" variant="flat">
        {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}
      </v-chip>
      <div class="zoom-cluster">
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          variant="tonal"
          aria-label="缩小"
          @click="editor.zoomOut"
        >
          <v-icon icon="mdi-minus" size="18" />
          <v-tooltip
            activator="parent"
            location="top"
          >
            缩小
          </v-tooltip>
        </v-btn>
        <span>{{ editor.zoomPercent.value }}%</span>
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          variant="tonal"
          aria-label="放大"
          @click="editor.zoomIn"
        >
          <v-icon icon="mdi-plus" size="18" />
          <v-tooltip
            activator="parent"
            location="top"
          >
            放大
          </v-tooltip>
        </v-btn>
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          variant="tonal"
          aria-label="重置缩放"
          @click="editor.resetZoom"
        >
          <v-icon icon="mdi-fit-to-page-outline" size="18" />
          <v-tooltip
            activator="parent"
            location="top"
          >
            重置缩放
          </v-tooltip>
        </v-btn>
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          variant="tonal"
          aria-label="垂直居中"
          @click="editor.centerArtboard"
        >
          <v-icon icon="mdi-crosshairs-gps" size="18" />
          <v-tooltip
            activator="parent"
            location="top"
          >
            居中画板
          </v-tooltip>
        </v-btn>
      </div>
    </div>

    <div class="workspace-stage">
      <div class="canvas-host">
        <div
          :ref="setCanvasRef"
          class="canvas-view"
          @pointerdown.self="editor.closeLayerMenu"
          @dblclick="editor.handleCanvasDoubleClick"
        ></div>
        <SelectionActionToolbar
          :editor="editor"
          :toolbar="editor.selectionToolbar.value"
        />
        <SelectionLayerMenu
          :menu="editor.layerMenu.value"
          @action="editor.runLayerAction"
        />
      </div>
    </div>
  </main>
</template>

<script setup>
import SelectionActionToolbar from './SelectionActionToolbar.vue';
import SelectionLayerMenu from './SelectionLayerMenu.vue';

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
