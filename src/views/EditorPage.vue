<template>
  <v-app class="editor-app">
    <EditorTopBar :saving="saving" @save="saveEditorJson" @preview="openH5Preview" />

    <div class="editor-workbench">
      <EditorRail v-model="activePanel" />
      <EditorSidePanel :active-panel="activePanel" :editor="editor" />
      <CanvasWorkspace :editor="editor" />
    </div>

    <v-snackbar v-model="message.visible" :color="message.color" location="top center" timeout="2600">
      {{ message.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import CanvasWorkspace from '../components/editor-shell/CanvasWorkspace.vue';
import EditorRail from '../components/editor-shell/EditorRail.vue';
import EditorSidePanel from '../components/editor-shell/EditorSidePanel.vue';
import EditorTopBar from '../components/editor-shell/EditorTopBar.vue';
import { useCanvasEditor } from '../composables/useCanvasEditor.js';
import { exportH5Document, saveH5Document } from '../services/h5-document.js';
import '../assets/scss/editor-workbench.scss';

const router = useRouter();
const activePanel = ref('text');
const saving = ref(false);
const message = reactive({ visible: false, text: '', color: 'error' });
const editor = useCanvasEditor({ onMessage: showMessage });

/** @returns {Promise<Object>} 当前编辑器的 H5 JSON 数据。 */
function getEditorJson() {
  return exportH5Document(editor.getEditor());
}

/** @returns {Promise<void>} 获取并打印当前编辑器 JSON。 */
async function saveEditorJson() {
  if (saving.value) return;

  saving.value = true;
  try {
    const documentData = await getEditorJson();
    console.log(JSON.stringify(documentData, null, 2));
    showMessage('JSON 已输出到控制台', 'success');
  } catch (error) {
    showMessage(error.message || '保存 JSON 失败。', 'error');
  } finally {
    saving.value = false;
  }
}

async function openH5Preview() {
  try {
    saveH5Document(await getEditorJson());
    router.push({ name: 'h5-preview' });
  } catch (error) {
    showMessage(error.message || '导出 H5 JSON 失败。', 'error');
  }
}

/**
 * @param {string} text 提示内容。
 * @param {'success' | 'error'} color 提示颜色。
 * @returns {void}
 */
function showMessage(text, color) {
  message.text = text;
  message.color = color;
  message.visible = true;
}
</script>
