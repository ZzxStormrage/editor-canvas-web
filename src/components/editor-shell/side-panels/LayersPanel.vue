<template>
  <section class="panel-section layers-panel">
    <div class="layers-panel__content">
      <div class="panel-heading">
        <span>图层</span>
        <span class="panel-size">{{ editor.layers.value.length }}</span>
      </div>

      <div v-if="editor.layers.value.length === 0" class="layers-empty">
        <v-icon icon="mdi-layers-outline" size="28" />
        <strong>暂无图层</strong>
        <span>添加文字或图片后会显示在这里</span>
      </div>

      <draggable
        v-else
        v-model="editor.layers.value"
        class="layers-list"
        role="list"
        item-key="id"
        handle=".layer-drag-handle"
        :animation="180"
        ghost-class="layer-item--ghost"
        chosen-class="layer-item--chosen"
        drag-class="layer-item--dragging"
        @start="editor.startLayerDrag"
        @end="editor.endLayerDrag"
      >
        <template #item="{ element, index }">
          <div
            class="layer-entry layer-item"
            :class="{
              'layer-item--selected': element.selected,
              'layer-item--locked': element.locked,
              'layer-item--hidden': !element.visible
            }"
            role="listitem"
            tabindex="0"
            :aria-label="`图层 ${element.name}`"
            @click="editor.selectLayer(element.id)"
            @keydown.enter.prevent="editor.selectLayer(element.id)"
            @mouseenter="editor.hoverLayer(element.id)"
            @mouseleave="editor.hoverLayer(null)"
          >
            <div class="layer-item__summary">
              <span class="layer-drag-handle" aria-hidden="true">
                <v-icon icon="mdi-drag-vertical" size="20" />
              </span>
              <div class="layer-preview-cell" :title="element.name">
                <LayerPreview :layer="element" :load-thumbnail="editor.getLayerThumbnail" />
              </div>
              <div class="layer-info">
                <div class="layer-info__title-row">
                  <strong class="layer-info__name" :title="element.name">{{ element.name }}</strong>
                </div>
                <span class="layer-info__meta">{{ getLayerMetaText(element) }}</span>
              </div>
            </div>
            <div class="layer-item__actions">
              <LayerActionButtons
                :layer="element"
                :attributes-active="editor.activeAttributeElementId.value === element.elementId"
                :can-move-up="index > 0"
                :can-move-down="index < editor.layers.value.length - 1"
                :can-move-to-front="index > 0"
                always-visible
                @edit-attributes="editor.openLayerElementAttributes(element.id)"
                @toggle-visibility="editor.toggleLayerVisibility(element.id)"
                @toggle-pointer-through="editor.toggleLayerPointerThrough(element.id)"
                @move-to-front="editor.moveLayerToFront(element.id)"
                @move-up="editor.moveLayerUp(element.id)"
                @move-down="editor.moveLayerDown(element.id)"
                @toggle-lock="editor.toggleLayerLock(element.id)"
                @delete="editor.deleteLayer(element.id)"
              />
            </div>
          </div>
        </template>
      </draggable>
    </div>
  </section>
</template>

<script setup>
import draggable from 'vuedraggable';
import LayerActionButtons from '../layers/LayerActionButtons.vue';
import LayerPreview from '../layers/LayerPreview.vue';
import { getLayerTypeLabel } from '../layers/layerDisplay.js';

defineProps({ editor: { type: Object, required: true } });

/**
 * 组合图层类型与关键状态，帮助运维快速识别当前图层。
 *
 * @param {Object} layer 图层 DTO。
 * @returns {string} 简短状态说明。
 */
function getLayerMetaText(layer) {
  const labels = [getLayerTypeLabel(layer.type)];
  if (!layer.visible) labels.push('已隐藏');
  if (layer.locked) labels.push('已锁定');
  if (layer.pointerThrough) labels.push('已穿透');
  return labels.join(' · ');
}
</script>

<style scoped>
.layer-item {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(var(--v-theme-shadow), 0.07);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 180ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease;
}

.layer-item:hover,
.layer-item:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(var(--v-theme-shadow), 0.14);
}

.layer-item--selected {
  transform: translateY(-2px);
  box-shadow:
    0 8px 18px rgba(var(--v-theme-shadow), 0.14),
    0 0 0 1px rgba(var(--v-theme-primary), 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .layer-item {
    transition: none;
  }
}
</style>
