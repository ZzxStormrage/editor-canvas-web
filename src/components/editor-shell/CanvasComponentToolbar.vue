<template>
  <div class="canvas-component-toolbar" aria-label="部件画布管理">
    <div class="canvas-component-tabs" role="tablist" aria-label="部件画布">
      <button
        v-for="component in components"
        :key="component.id"
        class="canvas-component-tab"
        :class="{ 'canvas-component-tab--active': component.id === activeComponentId }"
        type="button"
        role="tab"
        :aria-selected="component.id === activeComponentId"
        :disabled="switching"
        @click="$emit('select', component.id)"
      >
        {{ component.name }}
      </button>
    </div>
    <span class="workspace-toolbar-divider" aria-hidden="true"></span>
    <v-btn class="canvas-component-add" color="primary" size="small" variant="tonal" @click="$emit('add')">
      <v-icon icon="mdi-plus" size="18" />
      <span>新增</span>
      <v-tooltip activator="parent" location="top">新增部件画布</v-tooltip>
    </v-btn>
    <v-btn
      class="editor-icon-button"
      color="primary"
      size="small"
      variant="tonal"
      :disabled="switching || !activeComponentId"
      aria-label="复制部件"
      @click="$emit('duplicate')"
    >
      <v-icon icon="mdi-content-copy" size="18" />
      <v-tooltip activator="parent" location="top">复制当前部件</v-tooltip>
    </v-btn>
    <v-btn
      class="editor-icon-button canvas-component-delete"
      color="error"
      size="small"
      variant="tonal"
      :disabled="switching || components.length <= 1"
      aria-label="删除部件"
      @click="$emit('remove')"
    >
      <v-icon icon="mdi-trash-can-outline" size="18" />
      <v-tooltip activator="parent" location="top">删除当前部件</v-tooltip>
    </v-btn>
  </div>
</template>

<script setup>
defineProps({
  components: { type: Array, default: () => [] },
  activeComponentId: { type: String, default: null },
  switching: { type: Boolean, default: false }
})

defineEmits(['select', 'add', 'duplicate', 'remove'])
</script>

<style scoped>
.canvas-component-toolbar {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  border: 1px solid rgba(var(--v-theme-outline), 0.22);
  border-radius: 8px;
  background: rgba(var(--v-theme-panel), 0.9);
  box-shadow: var(--editor-workspace-shadow);
  pointer-events: auto;
}

.canvas-component-tabs {
  display: inline-flex;
  max-width: min(320px, 30vw);
  gap: 2px;
  overflow-x: auto;
}

.canvas-component-tab {
  min-width: 58px;
  max-width: 120px;
  height: 30px;
  padding: 0 9px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--editor-muted);
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.canvas-component-tab:hover,
.canvas-component-tab:focus-visible,
.canvas-component-tab--active {
  border-color: rgba(var(--v-theme-primary), 0.22);
  color: var(--editor-primary);
  background: rgba(var(--v-theme-primary), 0.1);
  outline: none;
}

.canvas-component-add {
  height: 34px;
  min-height: 34px;
  padding: 0 10px;
  letter-spacing: 0;
}

.canvas-component-delete {
  color: rgb(var(--v-theme-error));
}
</style>
