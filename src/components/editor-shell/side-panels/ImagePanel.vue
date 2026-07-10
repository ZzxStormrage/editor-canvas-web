<template>
  <section class="panel-section">
    <input
      :ref="setImageInputRef"
      class="side-file-input"
      type="file"
      accept="image/*"
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
          @click="editor.openImagePicker"
        >
          上传图片
        </v-btn>
      </div>
    </PanelGroup>
  </section>
</template>

<script setup>
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
