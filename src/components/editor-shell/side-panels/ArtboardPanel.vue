<template>
  <section class="panel-section">
    <input
      :ref="setBackgroundInputRef"
      class="side-file-input"
      type="file"
      :accept="IMAGE_FILE_ACCEPT"
      :disabled="editor.backgroundUploading.value"
      @change="editor.handleBackgroundImageChange"
    />

    <div class="panel-heading">
      <span>画板</span>
      <span class="panel-size"> {{ editor.artboardWidth.value }} x {{ editor.artboardHeight.value }} </span>
    </div>

    <PanelGroup>
      <div class="panel-grid">
        <div class="slider-field">
          <label>宽度</label>
          <v-number-input v-model.number="editor.artboardWidth.value" aria-label="宽度" label="" :min="120" :step="1" />
        </div>
        <div class="slider-field">
          <label>高度</label>
          <v-number-input
            v-model.number="editor.artboardHeight.value"
            aria-label="高度"
            label=""
            :min="120"
            :step="1"
          />
        </div>
      </div>
    </PanelGroup>

    <PanelGroup>
      <div class="canvas-action-stack">
        <v-btn
          block
          class="editor-action-button canvas-action-button"
          density="compact"
          prepend-icon="mdi-crop-free"
          variant="outlined"
          @click="editor.updateArtboardSize"
        >
          调整画布
        </v-btn>
        <div class="quick-actions">
          <v-btn
            class="editor-action-button editor-action-button--primary canvas-action-button"
            color="primary"
            density="compact"
            :disabled="editor.backgroundUploading.value"
            :loading="editor.backgroundUploading.value"
            prepend-icon="mdi-image-plus-outline"
            variant="tonal"
            @click="editor.openBackgroundImagePicker"
          >
            导入背景图
          </v-btn>
        </div>

      </div>
    </PanelGroup>

  </section>
</template>

<script setup>
import { IMAGE_FILE_ACCEPT } from '../../../config/image-upload.js';
import PanelGroup from '../PanelGroup.vue';
const props = defineProps({ editor: { type: Object, required: true } });
/** @param {HTMLInputElement | null} element 文件选择器。 @returns {void} */
function setBackgroundInputRef(element) {
  props.editor.backgroundInputRef.value = element;
}
</script>
