<template>
  <Transition name="image-property-panel" mode="out-in">
    <div v-if="properties" key="properties" class="image-properties-editor">
      <div class="image-property-section">
        <div class="image-property-section__heading">位置</div>
        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.x"
            label="X 坐标"
            suffix="px"
            compact
            :disabled="properties.locked"
            @update:model-value="updateProperty('x', $event)"
          />
          <PanelNumberField
            :model-value="properties.y"
            label="Y 坐标"
            suffix="px"
            compact
            :disabled="properties.locked"
            @update:model-value="updateProperty('y', $event)"
          />
        </div>
      </div>

      <div class="image-property-divider"></div>

      <div class="image-property-section">
        <div class="image-property-section__heading">
          <span>尺寸</span>
          <button
            type="button"
            class="image-ratio-lock"
            :class="{ 'image-ratio-lock--active': properties.lockRatio }"
            :disabled="properties.locked"
            :aria-pressed="properties.lockRatio"
            :aria-label="ratioLockAriaLabel"
            @click="toggleRatioLock"
          >
            <v-icon :icon="properties.lockRatio ? 'mdi-link-variant' : 'mdi-link-variant-off'" size="12" />
            <span>{{ ratioLockLabel }}</span>
            <v-tooltip activator="parent" location="top">{{ ratioLockHint }}</v-tooltip>
          </button>
        </div>

        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.width"
            label="宽度"
            suffix="px"
            compact
            :min="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('width', $event)"
          />
          <PanelNumberField
            :model-value="properties.height"
            label="高度"
            suffix="px"
            compact
            :min="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('height', $event)"
          />
        </div>

        <div class="image-original-size">
          <v-icon icon="mdi-image-size-select-large" size="16" />
          <div>
            <span>原始尺寸</span>
            <strong>{{ originalSizeLabel }}</strong>
          </div>
          <v-btn
            class="image-property-icon-button"
            density="compact"
            :disabled="properties.locked"
            icon
            size="x-small"
            variant="text"
            aria-label="恢复原始尺寸"
            @click="editor.resetSelectedImageSize"
          >
            <v-icon icon="mdi-restore" size="16" />
            <v-tooltip activator="parent" location="top">原始</v-tooltip>
          </v-btn>
        </div>
      </div>

      <div class="image-property-divider"></div>

      <div class="image-property-section image-property-section--combined">
        <div class="image-property-section__heading">缩放与外观</div>
        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.scalePercentX"
            label="X 轴"
            suffix="%"
            compact
            :min="0.1"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('scalePercentX', $event)"
          />
          <PanelNumberField
            :model-value="properties.scalePercentY"
            label="Y 轴"
            suffix="%"
            compact
            :min="0.1"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('scalePercentY', $event)"
          />
          <PanelNumberField
            :model-value="properties.rotation"
            label="旋转"
            suffix="°"
            compact
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('rotation', $event)"
          />
          <PanelNumberField
            :model-value="properties.opacity"
            label="不透明度"
            suffix="%"
            compact
            :min="0"
            :max="100"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('opacity', $event)"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

import PanelNumberField from '../PanelNumberField.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

const properties = computed(() => props.editor.imageProperties?.value ?? null)
const ratioLockLabel = computed(() => (
  properties.value?.lockRatio ? '已锁定宽高比' : '宽高可独立调整'
))
const ratioLockHint = computed(() => (
  properties.value?.lockRatio
    ? '修改宽度或高度时，另一项会按当前比例同步调整。点击可解除锁定。'
    : '宽度和高度可以分别修改。点击可锁定当前宽高比例。'
))
const ratioLockAriaLabel = computed(() => (
  properties.value?.lockRatio ? '解除宽高比例锁定' : '锁定当前宽高比例'
))
const originalSizeLabel = computed(() => {
  if (!properties.value) {
    return '-'
  }

  return `${formatDimension(properties.value.originalWidth)} × ${formatDimension(properties.value.originalHeight)} px`
})

/**
 * 更新单个图片属性。
 *
 * @param {string} key 属性名。
 * @param {number} value 属性值。
 * @returns {void}
 */
function updateProperty(key, value) {
  if (!properties.value?.locked) {
    props.editor.updateSelectedImageProperties({ [key]: value })
  }
}

/** @returns {void} */
function toggleRatioLock() {
  if (!properties.value?.locked) {
    props.editor.updateSelectedImageProperties({ lockRatio: !properties.value.lockRatio })
  }
}

/**
 * 格式化原始像素值。
 *
 * @param {number} value 尺寸值。
 * @returns {string} 尺寸文本。
 */
function formatDimension(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(2)
}
</script>

<style scoped>
.image-properties-editor {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.image-property-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-property-section__heading {
  display: flex;
  min-height: 15px;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: var(--editor-muted);
  font-size: 9px;
  font-weight: 800;
}

.image-property-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.image-property-divider {
  height: 1px;
  background: rgba(var(--v-theme-outline), 0.1);
}

.image-original-size {
  display: flex;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  padding: 3px 5px;
  border-radius: 6px;
  background: rgba(var(--v-theme-control), 0.46);
  color: var(--editor-muted);
}

.image-original-size > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.image-original-size span {
  font-size: 9px;
  font-weight: 700;
}

.image-original-size strong {
  overflow: hidden;
  color: var(--editor-text);
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-property-icon-button {
  width: 24px;
  min-width: 24px;
  height: 24px;
}

.image-ratio-lock {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  gap: 3px;
  padding: 2px 5px;
  border: 0;
  border-radius: 5px;
  color: var(--editor-muted);
  background: rgba(var(--v-theme-control), 0.5);
  font: inherit;
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.image-ratio-lock--active {
  color: var(--editor-primary);
  background: rgba(var(--v-theme-primary), 0.1);
}

.image-ratio-lock:hover:not(:disabled),
.image-ratio-lock:focus-visible:not(:disabled) {
  color: var(--editor-primary);
  outline: none;
}

.image-ratio-lock:focus-visible:not(:disabled) {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.14);
}

.image-ratio-lock:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.image-property-panel-enter-active,
.image-property-panel-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.image-property-panel-enter-from,
.image-property-panel-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .image-property-panel-enter-active,
  .image-property-panel-leave-active {
    transition: opacity 120ms ease;
  }

  .image-property-panel-enter-from,
  .image-property-panel-leave-to {
    transform: none;
  }
}

</style>
