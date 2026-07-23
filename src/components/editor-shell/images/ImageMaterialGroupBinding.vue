<template>
  <div class="image-material-binding">
    <label class="layer-attribute-field">
      <span>绑定素材组</span>
      <v-select
        :model-value="modelValue"
        aria-label="绑定素材组"
        class="editor-attribute-control"
        :items="groupOptions"
        item-title="label"
        item-value="value"
        density="compact"
        hide-details="auto"
        no-data-text="暂无素材组"
        variant="outlined"
        @update:model-value="handleGroupChange"
      />
    </label>

    <div v-if="selectedGroup" class="image-material-binding__summary">
      <div class="image-material-binding__heading">
        <div>
          <strong>{{ selectedGroup.groupName }}</strong>
          <span>{{ groupMetaText }}</span>
        </div>
        <v-progress-circular
          v-if="isSelectedGroupLoading"
          color="primary"
          indeterminate
          size="15"
          width="2"
        />
      </div>

      <div v-if="previewMaterials.length" class="image-material-binding__previews">
        <span
          v-for="material in previewMaterials"
          :key="material.id"
          class="image-material-binding__preview"
          :title="material.materialName"
        >
          <img
            v-if="!failedMaterialIds.has(String(material.id))"
            :src="material.materialUrl"
            :alt="material.materialName"
            loading="lazy"
            decoding="async"
            @error="markMaterialFailed(material.id)"
          />
          <v-icon v-else icon="mdi-image-off-outline" size="18" />
        </span>
      </div>

      <div
        v-else-if="isSelectedGroupLoading"
        class="image-material-binding__previews"
        aria-hidden="true"
      >
        <span v-for="index in 4" :key="index" class="image-material-binding__preview is-loading"></span>
      </div>

      <div v-else-if="selectedGroupError" class="image-material-binding__error">
        <span>素材预览加载失败</span>
        <button type="button" @click="editor.retryMaterials">重试</button>
      </div>

      <div v-else-if="!isSelectedGroupAvailable" class="image-material-binding__empty">
        当前素材组未随初始化数据传入
      </div>

      <div v-else class="image-material-binding__empty">该组暂无可用素材</div>

      <p>H5 将通过素材组 ID 读取用户可选图片。</p>
    </div>

    <p v-else-if="!editor.materialGroups.value.length" class="image-material-binding__hint">
      暂无素材组，请由宿主在初始化数据中传入。
    </p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

import {
  findMaterialGroup
} from '../../../composables/canvas-editor/image-material-group-binding.js'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  modelValue: {
    type: [String, Number],
    default: null
  },
  savedGroupName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])
const failedMaterialIds = ref(new Set())

const selectedGroup = computed(() => {
  const currentGroup = findMaterialGroup(props.editor.materialGroups.value, props.modelValue)
  if (currentGroup) {
    return currentGroup
  }

  return props.modelValue === null || props.modelValue === ''
    ? null
    : { id: props.modelValue, groupName: props.savedGroupName || `素材组 #${props.modelValue}` }
})
const isSelectedGroupAvailable = computed(() => {
  return Boolean(findMaterialGroup(props.editor.materialGroups.value, props.modelValue))
})
const isActiveGroup = computed(() => {
  return selectedGroup.value
    && String(props.editor.activeMaterialGroupId.value) === String(selectedGroup.value.id)
})
const isSelectedGroupLoading = computed(() => {
  return Boolean(isActiveGroup.value && props.editor.materialLoading.value)
})
const selectedGroupError = computed(() => {
  return isActiveGroup.value ? props.editor.materialError.value : ''
})
const previewMaterials = computed(() => {
  return isActiveGroup.value ? props.editor.materials.value.slice(0, 4) : []
})
const groupMetaText = computed(() => {
  const group = selectedGroup.value
  if (!group) {
    return ''
  }

  const count = isActiveGroup.value && !props.editor.materialLoading.value
    ? `${props.editor.materialTotal.value} 张图片 · `
    : ''
  return `${count}素材组 ID：${group.id}`
})
const groupOptions = computed(() => {
  const options = [
    { label: '不绑定素材组', value: null },
    ...props.editor.materialGroups.value.map((group) => ({
      label: group.groupName,
      value: group.id
    }))
  ]

  if (
    selectedGroup.value
    && !findMaterialGroup(props.editor.materialGroups.value, selectedGroup.value.id)
  ) {
    options.push({
      label: `${selectedGroup.value.groupName}（当前不可用）`,
      value: selectedGroup.value.id
    })
  }

  return options
})

watch(
  [
    () => props.modelValue,
    () => props.editor.materialGroups.value.map((group) => group.id).join('|')
  ],
  ([groupId]) => {
    failedMaterialIds.value = new Set()
    void loadSelectedGroup(groupId)
  },
  { immediate: true }
)

/**
 * 更新绑定并按需加载当前素材组预览。
 *
 * @param {string | number | null} groupId 素材组 ID。
 * @returns {void}
 */
function handleGroupChange(groupId) {
  emit('update:modelValue', groupId)
}

/**
 * 仅在切换到可用素材组时请求预览，避免重复刷新当前组。
 *
 * @param {string | number | null} groupId 素材组 ID。
 * @returns {Promise<void>}
 */
async function loadSelectedGroup(groupId) {
  const group = findMaterialGroup(props.editor.materialGroups.value, groupId)
  if (
    !group
    || String(props.editor.activeMaterialGroupId.value) === String(group.id)
  ) {
    return
  }

  await props.editor.selectMaterialGroup(group.id)
}

/**
 * 标记加载失败的素材预览。
 *
 * @param {string | number} materialId 素材 ID。
 * @returns {void}
 */
function markMaterialFailed(materialId) {
  failedMaterialIds.value = new Set([
    ...failedMaterialIds.value,
    String(materialId)
  ])
}
</script>

<style scoped>
.image-material-binding {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-material-binding__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 7px;
  background: rgba(var(--v-theme-primary), 0.055);
}

.image-material-binding__heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.image-material-binding__heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.image-material-binding__heading strong {
  overflow: hidden;
  color: var(--editor-text);
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-material-binding__heading span,
.image-material-binding__summary p,
.image-material-binding__hint,
.image-material-binding__empty,
.image-material-binding__error {
  color: var(--editor-muted);
  font-size: 9px;
  line-height: 1.4;
}

.image-material-binding__previews {
  display: flex;
  min-width: 0;
  gap: 5px;
}

.image-material-binding__preview {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border-radius: 5px;
  background: rgb(var(--v-theme-surface));
}

.image-material-binding__preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-material-binding__preview.is-loading {
  background: rgba(var(--v-theme-on-surface), 0.08);
  animation: material-binding-pulse 1.1s ease-in-out infinite alternate;
}

.image-material-binding__summary p,
.image-material-binding__hint {
  margin: 0;
}

.image-material-binding__error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-error));
}

.image-material-binding__error button {
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

@keyframes material-binding-pulse {
  from { opacity: 0.48; }
  to { opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
  .image-material-binding__preview.is-loading {
    animation: none;
  }
}
</style>
