<template>
  <nav class="production-area-toolbar" aria-label="生产文件区域">
    <div class="production-area-toolbar__current">
      <v-icon icon="mdi-crop-square" size="18" />
      <span>当前生产文件</span>
    </div>
    <div class="production-area-toolbar__areas" role="tablist" aria-label="生产文件区域列表">
      <button
        v-for="(area, index) in areas"
        :key="area.id"
        class="production-area-toolbar__tab"
        :class="{ 'is-active': activeAreaId === area.id }"
        type="button"
        role="tab"
        :aria-selected="activeAreaId === area.id"
        @click="selectArea(area.id)"
      >
        <span class="production-area-toolbar__index">{{ index + 1 }}</span>
        <span>{{ area.name }}</span>
        <v-tooltip activator="parent" location="top">切换到{{ area.name }}</v-tooltip>
      </button>
    </div>
    <v-menu location="bottom end" offset="6">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          class="production-area-toolbar__command"
          color="primary"
          density="compact"
          prepend-icon="mdi-content-copy"
          variant="tonal"
          :disabled="areas.length < 2 || !activeAreaId"
        >
          复制到其他区域
        </v-btn>
      </template>
      <v-list density="compact" min-width="190">
        <v-list-item
          v-for="area in targetAreas"
          :key="area.id"
          :title="area.name"
          prepend-icon="mdi-crop-square"
          @click="copyToArea(area.id)"
        />
        <v-list-item v-if="!targetAreas.length" title="没有其他生产区域" disabled />
      </v-list>
    </v-menu>
    <v-btn
      class="production-area-toolbar__command"
      color="primary"
      density="compact"
      prepend-icon="mdi-plus"
      variant="tonal"
      @click="addArea"
    >
      新增
    </v-btn>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  areas: { type: Array, default: () => [] },
  activeAreaId: { type: String, default: null }
})

const emit = defineEmits(['select', 'copy', 'add'])
const targetAreas = computed(() => props.areas.filter((area) => area.id !== props.activeAreaId))

/** @param {string} id 区域 ID。 @returns {void} */
function selectArea(id) {
  emit('select', id)
}

/** @param {string} id 目标区域 ID。 @returns {void} */
function copyToArea(id) {
  emit('copy', id)
}

/** @returns {void} */
function addArea() {
  emit('add')
}
</script>

<style scoped>
.production-area-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  height: 40px;
  padding: 3px 4px;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-outline), 0.22);
  border-radius: 8px;
  background: rgba(var(--v-theme-panel), 0.9);
  box-shadow: var(--editor-workspace-shadow);
  color: var(--editor-text);
  font-size: 12px;
  font-weight: 800;
}

.production-area-toolbar__current,
.production-area-toolbar__areas {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
}

.production-area-toolbar__current {
  height: 32px;
  padding: 0 8px;
  border-right: 1px solid rgba(var(--v-theme-outline), 0.2);
  color: var(--editor-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.production-area-toolbar__areas {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
}

.production-area-toolbar__tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 112px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--editor-text);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.production-area-toolbar__tab:hover,
.production-area-toolbar__tab:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.22);
  background: rgba(var(--v-theme-primary), 0.1);
  outline: none;
}

.production-area-toolbar__tab.is-active {
  border-color: rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.16);
  color: var(--editor-primary);
}

.production-area-toolbar__index {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  flex: 0 0 25px;
  border-radius: 5px;
  background: rgb(var(--v-theme-primary-soft));
  color: var(--editor-primary);
  font-weight: 500;
}

.production-area-toolbar__command {
  flex: 0 0 auto;
  height: 32px;
  min-height: 32px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
}

.production-area-toolbar__command :deep(.v-btn__overlay) {
  opacity: 0;
}

.production-area-toolbar__command:focus-visible :deep(.v-btn__overlay),
.production-area-toolbar__command:hover :deep(.v-btn__overlay) {
  opacity: 0.08;
}

@media (max-width: 720px) {
  .production-area-toolbar__current {
    display: none;
  }

  .production-area-toolbar__tab {
    min-width: 96px;
  }
}
</style>
