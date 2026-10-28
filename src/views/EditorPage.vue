<template>
  <v-app class="editor-app">
    <EditorTopBar
      :disabled="loading || !editor.ready.value"
      :saving="saving"
      @save="saveProject"
      @open="projectInput?.click()"
      @export-image="exportImage"
    />
    <input ref="projectInput" class="side-file-input" type="file" accept=".json,application/json"
      :disabled="loading || saving" @change="openProject" />
    <div class="editor-workbench">
      <EditorRail :model-value="activePanel" @update:model-value="selectPanel" />
      <Transition name="editor-panel" @after-enter="recenterCanvasForVisibleArea" @after-leave="recenterCanvasForVisibleArea">
        <EditorSidePanel
          v-if="!sidePanelCollapsed"
          :active-panel="activePanel"
          :editor="editor"
          @collapse="sidePanelCollapsed = true"
        />
      </Transition>
      <Transition name="editor-panel-toggle">
        <v-btn
          v-if="sidePanelCollapsed"
          class="editor-side-panel__expand"
          icon
          variant="text"
          aria-label="展开侧栏"
          @click="sidePanelCollapsed = false"
        >
          <v-icon icon="mdi-panel-left-open" size="18" />
          <v-tooltip activator="parent" location="right">展开侧栏</v-tooltip>
        </v-btn>
      </Transition>
      <CanvasWorkspace
        ref="canvasWorkspace"
        :editor="editor"
        :side-panel-collapsed="sidePanelCollapsed"
        :create-example-action="createExample"
        :add-text-action="addStarterText"
        :first-run-dismissed="firstRunDismissed"
        @first-run-complete="firstRunDismissed = true"
        @open-document="projectInput?.click()"
      />
      <EditorAttributeDrawer :editor="editor" />
      <v-overlay class="align-center justify-center" contained persistent :model-value="loading">
        <div class="editor-loading"><v-progress-circular color="primary" indeterminate size="28" />正在打开项目…</div>
      </v-overlay>
    </div>
    <v-dialog v-model="recoveryDialog" max-width="420">
      <v-card class="recovery-dialog">
        <v-card-title>发现上次的本地草稿</v-card-title>
        <v-card-text>{{ recoveryDate }} 保存。恢复后会继续在本机自动保存。</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="discardDraft">从空白画布开始</v-btn>
          <v-btn color="primary" @click="restoreDraft">恢复草稿</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="message.visible" :color="message.color" location="top center" timeout="3200">
      {{ message.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import CanvasWorkspace from '../components/editor-shell/CanvasWorkspace.vue';
import EditorAttributeDrawer from '../components/editor-shell/EditorAttributeDrawer.vue';
import EditorRail from '../components/editor-shell/EditorRail.vue';
import EditorSidePanel from '../components/editor-shell/EditorSidePanel.vue';
import EditorTopBar from '../components/editor-shell/EditorTopBar.vue';
import { useCanvasEditor } from '../composables/useCanvasEditor.js';
import studioPoster from '../../examples/studio-poster.svg?raw';
import { downloadDocument, getProjectFileStem } from '../composables/canvas-editor/local-files.js';
import {
  downloadImage, exportArtboardImage, loadLocalDraft, saveLocalDraft
} from '../composables/canvas-editor/local-project.js';
import '../assets/scss/editor-workbench.scss';

const activePanel = ref('artboard');
const sidePanelCollapsed = ref(false);
const firstRunDismissed = ref(false);
const projectInput = ref(null);
const canvasWorkspace = ref(null);
const loading = ref(false);
const saving = ref(false);
const draftState = ref('saved');
const projectName = ref('未命名项目');
const savedDraft = ref(null);
const recoveryDialog = ref(false);
const recoveryDate = computed(() => savedDraft.value
  ? new Date(savedDraft.value.updatedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
  : '');
const message = reactive({ visible: false, text: '', color: 'error' });
let suppressDraftWrites = true;
let draftTimer = 0;
let writeChain = Promise.resolve();
let pendingWrites = 0;
let initialPanelEntryCompleted = false;
const editor = useCanvasEditor({
  onMessage: showMessage,
  onCanvasChange: dismissFirstRun,
  onDocumentChange: scheduleDraftSave
});

/** @returns {void} Dismiss first-run after any canvas change. */
function dismissFirstRun() {
  firstRunDismissed.value = true;
}

/** @param {string} panel Selected panel key. @returns {void} Switch the active editor panel. */
function selectPanel(panel) {
  activePanel.value = panel;
}

/** Recenter and repaint the canvas after the side panel changes the visible workspace. */
function recenterCanvasForVisibleArea() {
  const animate = initialPanelEntryCompleted;
  initialPanelEntryCompleted = true;
  requestAnimationFrame(() => canvasWorkspace.value?.centerArtboardInVisibleViewport({ animate }));
}

/** @returns {void} Debounce writes so typing and dragging do not serialize each frame. */
function scheduleDraftSave() {
  if (suppressDraftWrites) return;
  draftState.value = 'pending';
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => {
    const document = editor.exportDocument();
    if (!document) return;
    pendingWrites += 1;
    draftState.value = 'saving';
    writeChain = writeChain.then(() => saveLocalDraft(document)).then(() => {
      if (pendingWrites === 1) draftState.value = 'saved';
    }).catch((error) => {
      console.error('Local draft save failed.', error);
      draftState.value = 'error';
      showMessage(error.message || '本地草稿保存失败，请下载项目文件留存。', 'warning');
    }).finally(() => {
      pendingWrites -= 1;
      if (pendingWrites > 0 && draftState.value === 'saved') draftState.value = 'saving';
    });
  }, 700);
}

/** @returns {Promise<void>} Download a reusable project file. */
async function saveProject() {
  saving.value = true;
  try {
    await editor.whenReady();
    const document = editor.exportDocument();
    downloadDocument(document, projectName.value);
    showMessage('项目文件已下载，可随时重新打开继续编辑。', 'success');
  } catch (error) {
    showMessage(error.message || '项目保存失败。', 'error');
  } finally {
    saving.value = false;
  }
}

/** @param {Event} event Local project file picker event. @returns {Promise<void>} Load a validated project. */
async function openProject(event) {
  const [file] = event.target.files ?? [];
  event.target.value = '';
  if (!file) return;
  loading.value = true;
  suppressDraftWrites = true;
  try {
    const document = JSON.parse(await file.text());
    await editor.whenReady();
    await editor.loadDocument(document);
    canvasWorkspace.value?.fitArtboardToVisibleViewport();
    projectName.value = getProjectFileStem(file.name);
    await saveLocalDraft(document);
    draftState.value = 'saved';
    showMessage('项目已打开，本机草稿也已更新。', 'success');
  } catch (error) {
    const messageText = error instanceof SyntaxError
      ? '无法读取这个项目文件。请选择由 Canvas Editor 保存的 JSON 项目。'
      : error.message || '项目打开失败。';
    showMessage(messageText, 'error');
  } finally {
    suppressDraftWrites = false;
    loading.value = false;
  }
}

/** @param {'png'|'jpg'} format Image format. @param {number} pixelRatio Output scale. @returns {Promise<void>} Export the artboard. */
async function exportImage(format, pixelRatio) {
  saving.value = true;
  try {
    await editor.whenReady();
    const image = await exportArtboardImage(editor.getEditor(), format, pixelRatio);
    downloadImage(image, format);
    showMessage(`画板已导出为 ${format.toUpperCase()} · ${pixelRatio}x。`, 'success');
  } catch (error) {
    showMessage(error.message || '图片导出失败。', 'error');
  } finally {
    saving.value = false;
  }
}

/** @returns {Promise<void>} Load an editable starter poster using bundled artwork. */
async function createExample() {
  loading.value = true;
  suppressDraftWrites = true;
  try {
    await editor.whenReady();
    await editor.loadDocument({
      version: 1,
      canvas: { width: 840, height: 1050, background: '#f3efe6' },
      elements: [{
        tag: 'Image', x: 0, y: 0, width: 840, height: 1050,
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(studioPoster)}`,
        objectFit: 'cover', elementId: 'starter-artwork'
      }]
    });
    await editor.getEditor().text.add('A LITTLE MORE\\nROOM TO CREATE', {
      x: 72, y: 290, width: 660, fontFamily: 'Arial', fontSize: 74, fontWeight: 700,
      fill: '#173c34', textAlign: 'left', lineHeight: 82
    });
    await editor.getEditor().text.add('CANVAS STUDY  /  01', {
      x: 76, y: 206, width: 460, fontFamily: 'Arial', fontSize: 18, fontWeight: 700,
      fill: '#bf654a', textAlign: 'left', letterSpacing: 3
    });
    await editor.getEditor().text.add('Make it yours. Every layer is ready to edit.', {
      x: 78, y: 470, width: 620, fontFamily: 'Arial', fontSize: 24,
      fill: '#435f55', textAlign: 'left'
    });
    canvasWorkspace.value?.fitArtboardToVisibleViewport();
    projectName.value = 'Canvas Study 01';
    showMessage('示例已打开。文字、图片和图层都可以继续编辑。', 'success');
    return true;
  } catch (error) {
    showMessage(error.message || '示例无法打开。', 'error');
    return false;
  } finally {
    suppressDraftWrites = false;
    loading.value = false;
    scheduleDraftSave();
  }
}

/** @returns {Promise<void>} Add the first text layer and report the result. */
async function addStarterText() {
  try {
    await editor.whenReady();
    await editor.addText();
    showMessage('文字框已添加，可以直接在画布中编辑。', 'success');
    return true;
  } catch (error) {
    showMessage(error.message || '文字框添加失败。', 'error');
    return false;
  }
}

/** @returns {Promise<void>} Restore the last saved local draft. */
async function restoreDraft() {
  if (!savedDraft.value) return;
  recoveryDialog.value = false;
  suppressDraftWrites = true;
  try {
    await editor.whenReady();
    await editor.loadDocument(savedDraft.value.document);
    canvasWorkspace.value?.fitArtboardToVisibleViewport();
    projectName.value = '恢复的项目';
    showMessage('本地草稿已恢复。', 'success');
  } catch (error) {
    showMessage(error.message || '草稿无法恢复，请打开项目文件。', 'error');
  } finally {
    suppressDraftWrites = false;
  }
}

/** @returns {void} Keep the empty canvas and do not restore this draft on reload. */
function discardDraft() {
  recoveryDialog.value = false;
  savedDraft.value = null;
  saveLocalDraft(editor.exportDocument()).catch((error) => {
    console.warn('Could not clear the local recovery draft.', error);
  });
}

/** @param {string} text User-facing message. @param {string} color Vuetify semantic color. @returns {void} */
function showMessage(text, color = 'error') {
  Object.assign(message, { text, color, visible: true });
}

/** @param {BeforeUnloadEvent} event Browser navigation event. @returns {void} Warn while edits are not persisted. */
function warnBeforeUnload(event) {
  if (draftState.value === 'pending' || draftState.value === 'saving' || pendingWrites > 0) {
    event.preventDefault();
    event.returnValue = '';
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', warnBeforeUnload);
  try {
    await editor.whenReady();
    savedDraft.value = await loadLocalDraft();
    if (savedDraft.value?.document?.elements?.length) recoveryDialog.value = true;
  } catch (error) {
    console.warn('Local recovery storage is unavailable.', error);
  } finally {
    suppressDraftWrites = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload);
  window.clearTimeout(draftTimer);
});
</script>
