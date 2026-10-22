<template>
  <v-app-bar class="editor-top-bar" color="primary" flat height="44">
    <div class="top-bar-content">
      <div class="top-bar-left">
        <v-icon icon="mdi-vector-square" size="20" />
        <strong>Canvas Editor</strong>
      </div>

      <div class="top-bar-title">图形画布编辑器</div>

      <div class="top-bar-actions">
        <span class="top-bar-status">{{ status }}</span>
        <v-btn class="top-bar-docs-button" color="surface" density="compact"
          prepend-icon="mdi-folder-open-outline" size="small" variant="text" :disabled="saving || disabled" @click="emit('open')">
          打开 JSON
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
          导出 JSON
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
    default: '本地文档'
  }
})

const emit = defineEmits(['save', 'open'])
</script>
