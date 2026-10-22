<template>
  <v-app-bar class="editor-top-bar" flat height="44">
    <div class="top-bar-content">
      <div class="top-bar-left">
        <v-icon color="primary" icon="mdi-vector-square" size="20" />
        <strong>Canvas Editor</strong>
      </div>

      <div class="top-bar-title">图形画布编辑器</div>

      <div class="top-bar-actions">
        <span class="top-bar-status" :class="`top-bar-status--${draftState}`">{{ status }}</span>
        <v-btn class="top-bar-docs-button" density="compact"
          prepend-icon="mdi-folder-open-outline" size="small" variant="text" :disabled="saving || disabled" @click="emit('open')">
          打开项目
        </v-btn>
        <v-btn
          class="top-bar-save-button"
          color="primary"
          density="compact"
          prepend-icon="mdi-content-save-outline"
          size="small"
          variant="flat"
          :loading="saving"
          :disabled="saving || disabled"
          @click="emit('save')"
        >
          保存项目
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" class="top-bar-export-button" density="compact"
              prepend-icon="mdi-image-download-outline" size="small" variant="text" :disabled="saving || disabled">
              导出图片
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item title="PNG · 透明背景 · 2x" @click="emit('export-image', 'png', 2)" />
            <v-list-item title="PNG · 透明背景 · 3x" @click="emit('export-image', 'png', 3)" />
            <v-list-item title="JPG · 白色背景 · 2x" @click="emit('export-image', 'jpg', 2)" />
          </v-list>
        </v-menu>
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
  },
  draftState: { type: String, default: 'saved' }
})

const emit = defineEmits(['save', 'open', 'export-image'])
</script>
