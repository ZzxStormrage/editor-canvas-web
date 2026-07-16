<template>
  <v-app-bar class="editor-top-bar" color="primary" flat height="44">
    <div class="top-bar-content">
      <div class="top-bar-left">
        <v-icon icon="mdi-vector-square" size="20" />
        <strong>ELE Editor</strong>
      </div>

      <div class="top-bar-title">图形画布编辑器</div>

      <div class="top-bar-actions">
        <span class="top-bar-status">{{ status }}</span>
        <v-btn
          class="top-bar-docs-button"
          color="surface"
          density="compact"
          prepend-icon="mdi-book-open-page-variant-outline"
          size="small"
          target="_blank"
          to="/docs"
          variant="text"
          rel="noopener noreferrer"
        >
          API 文档
        </v-btn>
        <v-btn
          class="top-bar-save-button"
          color="surface"
          density="compact"
          prepend-icon="mdi-content-save-outline"
          size="small"
          variant="tonal"
          :loading="saving"
          :disabled="saving || disabled"
          @click="emit('save')"
        >
          立即保存
        </v-btn>
        <v-btn
          class="top-bar-preview-button"
          color="surface"
          density="compact"
          prepend-icon="mdi-cellphone-eye"
          size="small"
          variant="flat"
          :disabled="disabled"
          @click="emit('preview')"
        >
          H5 预览
        </v-btn>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup>
defineProps({
  saving: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: '新建模板'
  }
})

const emit = defineEmits(['save', 'preview'])
</script>
