<template>
  <v-app class="editor-app">
    <EditorTopBar />

    <div class="editor-workbench">
      <EditorRail v-model="activePanel" />
      <EditorSidePanel :active-panel="activePanel" :editor="editor" />
      <CanvasWorkspace :editor="editor" />
    </div>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';

import CanvasWorkspace from './components/editor-shell/CanvasWorkspace.vue';
import EditorRail from './components/editor-shell/EditorRail.vue';
import EditorSidePanel from './components/editor-shell/EditorSidePanel.vue';
import EditorTopBar from './components/editor-shell/EditorTopBar.vue';
import { useCanvasEditor } from './composables/useCanvasEditor.js';
import './assets/scss/editor-workbench.scss';

const editor = useCanvasEditor();
const activePanel = ref('text');
</script>
