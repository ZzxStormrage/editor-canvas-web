<template>
  <Transition name="image-property-panel" mode="out-in">
    <PanelGroup v-if="properties" key="properties" title="图片属性">
      <div class="image-property-section">
        <div class="image-property-section__heading">位置</div>
        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.x"
            label="X 坐标"
            suffix="px"
            :disabled="properties.locked"
            @update:model-value="updateProperty('x', $event)"
          />
          <PanelNumberField
            :model-value="properties.y"
            label="Y 坐标"
            suffix="px"
            :disabled="properties.locked"
            @update:model-value="updateProperty('y', $event)"
          />
        </div>
      </div>

      <div class="image-property-divider"></div>

      <div class="image-property-section">
        <div class="image-property-section__heading">
          <span>尺寸</span>
          <v-btn
            class="image-property-icon-button"
            :color="properties.lockRatio ? 'primary' : undefined"
            density="compact"
            :disabled="properties.locked"
            icon
            size="x-small"
            :variant="properties.lockRatio ? 'tonal' : 'text'"
            :aria-label="properties.lockRatio ? '解除比例锁定' : '锁定比例'"
            @click="toggleRatioLock"
          >
            <v-icon :icon="properties.lockRatio ? 'mdi-link-variant' : 'mdi-link-variant-off'" size="15" />
            <v-tooltip activator="parent" location="top">比例</v-tooltip>
          </v-btn>
        </div>

        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.width"
            label="宽度"
            suffix="px"
            :min="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('width', $event)"
          />
          <PanelNumberField
            :model-value="properties.height"
            label="高度"
            suffix="px"
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

      <div class="image-property-section">
        <div class="image-property-section__heading">缩放比例</div>
        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.scalePercentX"
            label="X 轴"
            suffix="%"
            :min="0.1"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('scalePercentX', $event)"
          />
          <PanelNumberField
            :model-value="properties.scalePercentY"
            label="Y 轴"
            suffix="%"
            :min="0.1"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('scalePercentY', $event)"
          />
        </div>
      </div>

      <div class="image-property-divider"></div>

      <div class="image-property-section">
        <div class="image-property-section__heading">外观</div>
        <div class="image-property-grid">
          <PanelNumberField
            :model-value="properties.rotation"
            label="旋转"
            suffix="°"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('rotation', $event)"
          />
          <PanelNumberField
            :model-value="properties.opacity"
            label="不透明度"
            suffix="%"
            :min="0"
            :max="100"
            :step="1"
            :disabled="properties.locked"
            @update:model-value="updateProperty('opacity', $event)"
          />
        </div>
      </div>
    </PanelGroup>

    <PanelGroup v-else key="empty">
      <div class="image-properties-empty" aria-live="polite">
        <span class="image-properties-empty__icon">
          <v-icon icon="mdi-image-outline" size="20" />
        </span>
        <span>未选择图片</span>
      </div>
    </PanelGroup>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

import PanelGroup from '../PanelGroup.vue'
import PanelNumberField from '../PanelNumberField.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

const properties = computed(() => props.editor.imageProperties?.value ?? null)
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
.image-property-section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.image-property-section__heading {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--editor-muted);
  font-size: 10px;
  font-weight: 800;
}

.image-property-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.image-property-divider {
  height: 1px;
  background: rgba(var(--v-theme-outline), 0.1);
}

.image-original-size {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  padding: 6px 7px;
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
  font-size: 10px;
  font-weight: 700;
}

.image-original-size strong {
  overflow: hidden;
  color: var(--editor-text);
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-property-icon-button {
  width: 26px;
  min-width: 26px;
  height: 26px;
}

.image-properties-empty {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--editor-muted);
  font-size: 12px;
  font-weight: 700;
}

.image-properties-empty__icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(var(--v-theme-control), 0.68);
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
