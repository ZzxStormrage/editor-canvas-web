<template>
  <v-app class="editor-app">
    <EditorTopBar :disabled="loading || !editor.ready.value" :saving="saving"
      :status="status" @save="saveDocument" @open="documentInput?.click()" />
    <input ref="documentInput" class="side-file-input" type="file" accept=".json,application/json"
      :disabled="loading || saving" @change="openDocument" />
    <div class="editor-workbench">
      <EditorRail v-model="activePanel" />
      <EditorSidePanel :active-panel="activePanel" :editor="editor" />
      <CanvasWorkspace :editor="editor" />
      <EditorAttributeDrawer :editor="editor" />
      <v-overlay class="align-center justify-center" contained persistent :model-value="loading">
        <v-progress-circular color="primary" indeterminate size="32" width="3" />
      </v-overlay>
    </div>
    <v-snackbar v-model="message.visible" :color="message.color" location="top center" timeout="2600">
      {{ message.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { reactive, ref } from 'vue';
import CanvasWorkspace from '../components/editor-shell/CanvasWorkspace.vue';
import EditorAttributeDrawer from '../components/editor-shell/EditorAttributeDrawer.vue';
import EditorRail from '../components/editor-shell/EditorRail.vue';
import EditorSidePanel from '../components/editor-shell/EditorSidePanel.vue';
import EditorTopBar from '../components/editor-shell/EditorTopBar.vue';
import { useCanvasEditor } from '../composables/useCanvasEditor.js';
import { downloadDocument } from '../composables/canvas-editor/local-files.js';
import '../assets/scss/editor-workbench.scss';

const activePanel = ref('artboard');
const documentInput = ref(null);
const loading = ref(false);
const saving = ref(false);
const status = ref('本地文档');
const message = reactive({ visible: false, text: '', color: 'error' });
const editor = useCanvasEditor({ onMessage: showMessage });

/** @returns {Promise<void>} 下载当前文档。 */
async function saveDocument() {
  saving.value = true;
  try {
    await editor.whenReady();
    downloadDocument(editor.exportDocument());
    showMessage('文档已导出。', 'success');
  } catch (error) {
    showMessage(error.message || '导出失败。', 'error');
  } finally {
    saving.value = false;
  }
}

/** @param {Event} event 文件选择事件。 @returns {Promise<void>} 加载本地 JSON。 */
async function openDocument(event) {
  const [file] = event.target.files ?? [];
  event.target.value = '';
  if (!file) return;
  loading.value = true;
  try {
    const document = JSON.parse(await file.text());
    await editor.whenReady();
    await editor.loadDocument(document);
    editor.fitArtboardToView();
    status.value = file.name;
    showMessage('文档已打开。', 'success');
  } catch (error) {
    showMessage(error.message || '文档打开失败。', 'error');
  } finally {
    loading.value = false;
  }
}

/** @param {string} text 提示内容。 @param {string} color 提示颜色。 @returns {void} */
function showMessage(text, color) {
  Object.assign(message, { text, color, visible: true });
}
</script>
