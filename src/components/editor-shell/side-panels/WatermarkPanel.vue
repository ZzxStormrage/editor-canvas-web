<template>
  <section class="panel-section">
    <div class="panel-heading">
      <span>水印</span>
    </div>

    <PanelGroup>
      <v-text-field v-model="editor.watermarkValue.value" label="水印文字" />
    </PanelGroup>

    <PanelGroup>
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
