<template>
  <section class="panel-section layers-panel">
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
      <template #item="{ element }">
        <div
          class="layer-item"
          :class="{
            'layer-item--selected': element.selected,
            'layer-item--locked': element.locked
          }"
          tabindex="0"
          role="listitem"
          :aria-label="`图层 ${element.name}`"
          @click="editor.selectLayer(element.id)"
          @keydown.enter.prevent="editor.selectLayer(element.id)"
          @mouseenter="editor.hoverLayer(element.id)"
          @mouseleave="editor.hoverLayer(null)"
    >
          <v-icon class="layer-drag-handle" icon="mdi-drag-vertical" size="18" />
          <span class="layer-type-icon">
            <v-icon :icon="resolveLayerIcon(element.type)" size="17" />
          </span>
          <span class="layer-name" :title="element.name">{{ element.name }}</span>
          <div class="layer-actions">
            <v-btn
              class="layer-action-button"
              density="compact"
              :icon="element.locked ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'"
              size="x-small"
              variant="text"
              :aria-label="element.locked ? '解锁图层' : '锁定图层'"
              @click.stop="editor.toggleLayerLock(element.id)"
            />
            <v-btn
              class="layer-action-button layer-delete-button"
              density="compact"
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              aria-label="删除图层"
              @click.stop="editor.deleteLayer(element.id)"
            />
          </div>
        </div>
      </template>
    </draggable>
  </section>
</template>

<script setup>
import draggable from 'vuedraggable';

defineProps({
  editor: {
    type: Object,
    required: true
  }
});

/**
 * 将内核图层类型映射到当前 Material Design 图标体系。
 *
 * @param {string} type 图层类型。
 * @returns {string} MDI 图标名。
 */
function resolveLayerIcon(type) {
  const icons = {
    text: 'mdi-format-text',
    image: 'mdi-image-outline',
    rect: 'mdi-vector-square',
    shape: 'mdi-shape-outline'
  };

  return icons[type] ?? icons.shape;
}
</script>
