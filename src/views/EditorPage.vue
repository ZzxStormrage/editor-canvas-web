<template>
  <v-app class="editor-app">
    <EditorTopBar @preview="openH5Preview" />

    <div class="editor-workbench">
      <EditorRail v-model="activePanel" />
      <EditorSidePanel :active-panel="activePanel" :editor="editor" />
      <CanvasWorkspace :editor="editor" />
    </div>

    <v-snackbar v-model="message.visible" :color="message.color" timeout="2600">
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
const editor = useCanvasEditor();
const activePanel = ref('text');
const message = reactive({ visible: false, text: '', color: 'error' });

async function openH5Preview() {
  try {
    saveH5Document(await exportH5Document(editor.getEditor()));
    router.push({ name: 'h5-preview' });
  } catch (error) {
    message.text = error.message || '导出 H5 JSON 失败。';
    message.visible = true;
  }
}
</script>
