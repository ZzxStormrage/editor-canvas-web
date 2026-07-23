<template>
  <section class="panel-section image-panel">
    <input
      :ref="setImageInputRef"
      class="side-file-input"
      type="file"
      :accept="IMAGE_FILE_ACCEPT"
      :disabled="editor.imageUploading.value"
      @change="editor.handleImageChange"
    />

    <div class="panel-heading">
      <span>图片</span>
    </div>

    <PanelGroup>
      <div class="quick-actions">
        <v-btn
          block
          class="editor-action-button"
          density="compact"
          prepend-icon="mdi-image-plus-outline"
          variant="outlined"
          :disabled="editor.imageUploading.value"
          :loading="editor.imageUploading.value"
          @click="editor.openImagePicker"
        >
          上传图片
        </v-btn>
      </div>
    </PanelGroup>

    <MaterialGroupBrowser :editor="editor" />
  </section>
</template>

<script setup>
import { IMAGE_FILE_ACCEPT } from '../../../config/image-upload.js';
import MaterialGroupBrowser from '../assets/MaterialGroupBrowser.vue';
import PanelGroup from '../PanelGroup.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

/**
 * 把隐藏 input 的 DOM 引用交回编辑器组合式逻辑。
 *
 * @param {HTMLInputElement | null} element 文件选择 input 元素。
 * @returns {void}
 */
function setImageInputRef(element) {
  if (props.editor?.imageInputRef) {
    props.editor.imageInputRef.value = element;
  }
}
</script>
