<template>
  <PanelGroup title="水印">
    <v-text-field v-model="editor.watermarkValue.value" label="水印文字" />

    <div class="quick-actions two-actions">
      <v-btn
        class="editor-action-button"
        density="compact"
        prepend-icon="mdi-water-percent"
        variant="outlined"
        @click="editor.addWatermark"
      >
        添加水印
      </v-btn>
      <v-btn
        class="editor-action-button"
        color="error"
        density="compact"
        prepend-icon="mdi-delete-outline"
        variant="outlined"
        @click="editor.deleteWatermark"
      >
        删除水印
      </v-btn>
    </div>
  </PanelGroup>
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
