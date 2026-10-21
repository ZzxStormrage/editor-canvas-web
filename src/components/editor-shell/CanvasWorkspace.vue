<template>
  <main
    class="canvas-workspace-panel"
    :class="{
      'canvas-workspace-panel--production-areas': props.productionAreas,
      'canvas-workspace-panel--component-switching': props.components?.switching.value
    }"
  >
    <div class="workspace-meta">
      <v-chip class="artboard-chip" color="surface" prepend-icon="mdi-artboard" variant="flat">
        {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}
      </v-chip>
      <ProductionAreaToolbar
        v-if="props.productionAreas"
        :areas="props.productionAreas.areas.value"
        :active-area-id="props.productionAreas.activeAreaId.value"
        @select="props.productionAreas.selectArea"
        @copy="props.productionAreas.copyToArea"
        @add="props.productionAreas.addArea"
      />
      <CanvasComponentToolbar
        v-if="props.components"
        :components="props.components.components.value"
        :active-component-id="props.components.activeComponentId.value"
        :switching="props.components.switching.value"
        @select="props.components.select"
        @add="props.components.add"
        @duplicate="props.components.duplicate"
        @remove="props.components.remove"
      />
      <div class="zoom-cluster" aria-label="画布操作">
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          variant="tonal"
          aria-label="上一步"
          :disabled="!editor.canUndo.value || editor.historyBusy.value"
          @click="editor.undo"
        >
          <v-icon icon="mdi-undo-variant" size="18" />
          <v-tooltip activator="parent" location="top">上一步</v-tooltip>
        </v-btn>
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          variant="tonal"
          aria-label="下一步"
          :disabled="!editor.canRedo.value || editor.historyBusy.value"
          @click="editor.redo"
        >
          <v-icon icon="mdi-redo-variant" size="18" />
          <v-tooltip activator="parent" location="top">下一步</v-tooltip>
        </v-btn>
        <span class="workspace-toolbar-divider" aria-hidden="true"></span>
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
        <span class="workspace-toolbar-divider" aria-hidden="true"></span>
        <v-btn
          class="editor-icon-button"
          color="primary"
          size="small"
          :variant="editor.productionAreaPreviewEnabled.value ? 'flat' : 'tonal'"
          aria-label="仅看生产区"
          :aria-pressed="editor.productionAreaPreviewEnabled.value"
          :disabled="!editor.printAreaAvailable.value"
          @click="editor.toggleProductionAreaPreview"
        >
          <v-icon icon="mdi-crop-free" size="18" />
          <v-tooltip activator="parent" location="top">
            {{ editor.productionAreaPreviewEnabled.value ? '完整画板' : '仅看生产区' }}
          </v-tooltip>
        </v-btn>
        <span class="workspace-toolbar-divider" aria-hidden="true"></span>
        <v-menu v-model="shortcutsMenuOpen" location="bottom end" offset="8">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              class="editor-icon-button"
              color="primary"
              size="small"
              variant="tonal"
              aria-label="键盘快捷键"
            >
              <v-icon icon="mdi-keyboard-outline" size="18" />
              <v-tooltip :disabled="shortcutsMenuOpen" activator="parent" location="top">
                快捷键
              </v-tooltip>
            </v-btn>
          </template>
          <v-sheet class="workspace-shortcuts-menu" rounded="lg">
            <div class="workspace-shortcuts-menu__title">键盘快捷键</div>
            <dl class="workspace-shortcuts-menu__list">
              <div
                v-for="shortcut in workspaceShortcuts"
                :key="shortcut.label"
                class="workspace-shortcuts-menu__item"
              >
                <dt>{{ shortcut.label }}</dt>
                <dd>
                  <kbd
                    v-for="key in shortcut.keys"
                    :key="key"
                  >
                    {{ key }}
                  </kbd>
                </dd>
              </div>
            </dl>
          </v-sheet>
        </v-menu>
      </div>
    </div>

    <div class="workspace-stage">
      <div class="canvas-host">
        <div
          :ref="setCanvasRef"
          class="canvas-view"
          :class="{
            'canvas-view--pan-ready': editor.canvasPanReady.value,
            'canvas-view--panning': editor.canvasPanning.value
          }"
          @pointerdown.self="editor.closeLayerMenu"
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
import { ref, watch } from 'vue';

import SelectionActionToolbar from './SelectionActionToolbar.vue';
import SelectionLayerMenu from './SelectionLayerMenu.vue';
import ProductionAreaToolbar from './ProductionAreaToolbar.vue';
import CanvasComponentToolbar from './CanvasComponentToolbar.vue';

const workspaceShortcuts = Object.freeze([
  { label: '上一步', keys: ['⌘ / Ctrl', 'Z'] },
  { label: '下一步', keys: ['⌘ / Ctrl', 'Shift', 'Z'] },
  { label: '放大', keys: ['⌘ / Ctrl', '+'] },
  { label: '缩小', keys: ['⌘ / Ctrl', '-'] },
  { label: '重置缩放', keys: ['⌘ / Ctrl', '0'] },
  { label: '移动画布', keys: ['空格', '拖拽'] }
]);
const shortcutsMenuOpen = ref(false);

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  document: {
    type: [Object, String],
    default: null
  },
  documentOptions: {
    type: Object,
    default: () => ({})
  },
  fitOptions: {
    type: [Object, Number, Boolean],
    default: false
  },
  productionAreas: {
    type: Object,
    default: null
  },
  components: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['document-loaded', 'document-error']);

watch(
  [() => props.editor?.ready?.value, () => props.document],
  async ([isReady, document]) => {
    if (!isReady || !document) {
      return;
    }

    try {
      const loadedDocument = await props.editor.loadDocument(document, props.documentOptions);
      if (props.fitOptions !== false) {
        props.editor.fitArtboardToView(props.fitOptions);
      }
      emit('document-loaded', loadedDocument);
    } catch (error) {
      emit('document-error', error);
    }
  },
  { immediate: true }
);

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

<style scoped>
.canvas-workspace-panel--production-areas {
  grid-template-rows: auto minmax(0, 1fr);
}

.canvas-workspace-panel--production-areas .workspace-meta > .production-area-toolbar {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.canvas-workspace-panel--production-areas .workspace-meta > .production-area-toolbar,
.canvas-workspace-panel--production-areas .workspace-meta > .zoom-cluster {
  pointer-events: auto;
}

.canvas-host {
  transform: scale(1);
  opacity: 1;
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease;
  will-change: opacity, transform;
}

.canvas-workspace-panel--component-switching .canvas-host {
  transform: scale(0.985);
  opacity: 0.42;
  border-color: rgba(var(--v-theme-primary), 0.38);
  pointer-events: none;
}
</style>
