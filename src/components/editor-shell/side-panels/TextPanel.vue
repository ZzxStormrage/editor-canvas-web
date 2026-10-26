<template>
  <section class="panel-section">
    <div class="panel-heading">
      <span>文字</span>
    </div>

    <v-btn
      block
      class="editor-action-button editor-action-button--primary"
      color="primary"
      density="compact"
      prepend-icon="mdi-format-textbox"
      @click="editor.addText"
    >
      添加文本框
    </v-btn>
  </section>
</template>

<script setup>
defineProps({
  editor: {
    type: Object,
    required: true
  }
})
</script>
