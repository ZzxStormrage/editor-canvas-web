<template>
  <section class="panel-section image-panel">
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
          导入图片
        </v-btn>
      </div>
    </PanelGroup>

  </section>
</template>

<script setup>
import PanelGroup from '../PanelGroup.vue';

defineProps({
  editor: {
    type: Object,
    required: true
  }
});
</script>
