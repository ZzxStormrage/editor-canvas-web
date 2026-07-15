<template>
  <main class="h5-preview-page">
    <header class="h5-preview-header">
      <div>
        <span class="h5-preview-eyebrow">移动端 H5</span>
        <h1>页面预览</h1>
      </div>
      <router-link class="h5-preview-back" to="/editor">返回编辑器</router-link>
    </header>

    <section class="h5-preview-stage" aria-label="H5 页面预览">
      <H5CanvasRenderer :document="documentData" />
    </section>

    <H5ReplacementTester
      :document="documentData"
      @update:document="updateDocument"
    />

    <details class="h5-json-panel">
      <summary>导入或查看 JSON</summary>
      <p>可粘贴编辑器导出的 JSON，点击应用后立即重新渲染。</p>
      <textarea v-model="jsonText" aria-label="H5 JSON 数据" spellcheck="false"></textarea>
      <div class="h5-json-actions">
        <button type="button" @click="resetJson">恢复当前数据</button>
        <button type="button" class="h5-json-apply" @click="applyJson">应用 JSON</button>
      </div>
      <p v-if="errorMessage" class="h5-json-error">{{ errorMessage }}</p>
    </details>
  </main>
</template>

<script setup>
import { ref } from 'vue';

import H5CanvasRenderer from '../components/h5-preview/H5CanvasRenderer.vue';
import H5ReplacementTester from '../components/h5-preview/H5ReplacementTester.vue';
import { parseH5Document, readH5Document, saveH5Document } from '../services/h5-document.js';
import '../assets/scss/h5-preview.scss';

const documentData = ref(readH5Document());
const jsonText = ref(JSON.stringify(documentData.value, null, 2));
const errorMessage = ref('');

function updateDocument(nextDocument) {
  documentData.value = nextDocument;
  saveH5Document(nextDocument);
  jsonText.value = JSON.stringify(nextDocument, null, 2);
  errorMessage.value = '';
}

function applyJson() {
  try {
    const nextDocument = parseH5Document(jsonText.value);
    updateDocument(nextDocument);
  } catch (error) {
    errorMessage.value = error.message || 'JSON 数据无效。';
  }
}

function resetJson() {
  jsonText.value = JSON.stringify(documentData.value, null, 2);
  errorMessage.value = '';
}
</script>
