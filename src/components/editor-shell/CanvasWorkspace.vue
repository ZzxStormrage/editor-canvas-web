<template>
  <main class="canvas-workspace-panel">
    <div class="workspace-meta">
      <v-chip class="artboard-chip" color="surface" prepend-icon="mdi-artboard" variant="flat">
        {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }}
      </v-chip>
      <div class="zoom-cluster" aria-label="画布操作">
        <v-btn
          class="editor-icon-button"
          size="small"
          variant="text"
          aria-label="上一步"
          :disabled="!editor.canUndo.value || editor.historyBusy.value"
          @click="editor.undo"
        >
          <v-icon icon="mdi-undo-variant" size="18" />
          <v-tooltip activator="parent" location="top">上一步</v-tooltip>
        </v-btn>
        <v-btn
          class="editor-icon-button"
          size="small"
          variant="text"
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
          size="small"
          variant="text"
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
          size="small"
          variant="text"
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
          size="small"
          variant="text"
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
          size="small"
          variant="text"
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
        <v-menu v-model="shortcutsMenuOpen" location="bottom end" offset="8">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              class="editor-icon-button"
              size="small"
              variant="text"
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
      <div ref="canvasHost" class="canvas-host">
        <div
          :ref="setCanvasRef"
          class="canvas-view"
          id="canvas-viewport"
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
        <CanvasScrollbars :editor="editor" :host="canvasHost" />
        <div
          v-if="editor.ready.value && editor.layers.value.length === 0 && !firstRunDismissed"
          class="first-run"
        >
          <svg class="first-run__filter-defs" aria-hidden="true" focusable="false">
            <filter id="first-run-lens-filter" x="-25%" y="-35%" width="150%" height="170%">
              <feComponentTransfer in="SourceAlpha" result="alpha">
                <feFuncA type="identity" />
              </feComponentTransfer>
              <feGaussianBlur in="alpha" stdDeviation="50" result="blur" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blur"
                scale="50"
                xChannelSelector="A"
                yChannelSelector="A"
              />
            </filter>
          </svg>
          <div class="first-run__mark"><v-icon icon="mdi-sparkles" size="22" /></div>
          <h1>从一张空白画布开始</h1>
          <p>添加文字或导入图片，完成后可保存项目并导出作品。</p>
          <div class="first-run__actions">
            <v-btn color="primary" prepend-icon="mdi-format-textbox" @click="runFirstRunAction(addTextAction)">添加文字</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-image-plus-outline" @click="openImage">导入图片</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-sparkles" @click="runFirstRunAction(createExampleAction)">试用示例</v-btn>
            <v-btn variant="text" prepend-icon="mdi-folder-open-outline" @click="emit('open-document')">打开项目</v-btn>
          </div>
          <div class="first-run__hint">⌘ / Ctrl + Z 撤销 <span>·</span> 空格 + 拖动画布</div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue';

import CanvasScrollbars from './CanvasScrollbars.vue';
import SelectionActionToolbar from './SelectionActionToolbar.vue';
import SelectionLayerMenu from './SelectionLayerMenu.vue';

const workspaceShortcuts = Object.freeze([
  { label: '上一步', keys: ['⌘ / Ctrl', 'Z'] },
  { label: '下一步', keys: ['⌘ / Ctrl', 'Shift', 'Z'] },
  { label: '放大', keys: ['⌘ / Ctrl', '+'] },
  { label: '缩小', keys: ['⌘ / Ctrl', '-'] },
  { label: '重置缩放', keys: ['⌘ / Ctrl', '0'] },
  { label: '移动画布', keys: ['空格', '拖拽'] }
]);
const shortcutsMenuOpen = ref(false);
const canvasHost = ref(null);

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
  createExampleAction: {
    type: Function,
    required: true
  },
  addTextAction: {
    type: Function,
    required: true
  },
  firstRunDismissed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['document-loaded', 'document-error', 'open-document', 'first-run-complete']);

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

/** @returns {void} Open the local image picker. */
function openImage() {
  props.editor.openImagePicker();
}

/** @param {() => Promise<boolean>} action First-run action. @returns {Promise<void>} */
async function runFirstRunAction(action) {
  try {
    const completed = await action();
    if (completed !== false) emit('first-run-complete');
  } catch (error) {
    console.error('First-run action failed.', error);
  }
}
</script>
