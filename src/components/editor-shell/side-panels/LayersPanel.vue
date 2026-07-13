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
        <div class="layer-entry" role="listitem">
          <div
            class="layer-item"
            :class="{
              'layer-item--selected': element.selected,
              'layer-item--locked': element.locked,
              'layer-item--expanded': editingElementId === element.elementId
            }"
            tabindex="0"
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
              <button
                v-if="supportsElementProperties(element.type)"
                type="button"
                class="layer-action-button layer-attribute-button"
                :class="{
                  'layer-action-button--active': editingElementId === element.elementId,
                  'layer-attribute-button--configured': element.customAttributeCount > 0
                }"
                :aria-label="getAttributeButtonLabel(element)"
                :title="getAttributeButtonTitle(element)"
                @pointerdown.stop
                @click.stop="toggleAttributeEditor(element)"
              >
                <v-icon icon="mdi-tune-variant" size="16" />
                <span v-if="element.customAttributeCount > 0" class="layer-attribute-count">
                  {{ formatAttributeCount(element.customAttributeCount) }}
                </span>
              </button>
              <button
                type="button"
                class="layer-action-button"
                :aria-label="element.locked ? '解锁图层' : '锁定图层'"
                :title="element.locked ? '解锁' : '锁定'"
                @pointerdown.stop
                @click.stop="editor.toggleLayerLock(element.id)"
              >
                <v-icon :icon="element.locked ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'" size="16" />
              </button>
              <button
                type="button"
                class="layer-action-button layer-delete-button"
                aria-label="删除图层"
                title="删除"
                @pointerdown.stop
                @click.stop="editor.deleteLayer(element.id)"
              >
                <v-icon icon="mdi-delete-outline" size="16" />
              </button>
            </div>
          </div>

          <transition name="layer-attribute-expand">
            <ElementAttributesEditor
              v-if="editingElementId === element.elementId"
              :editor="editor"
              :element-id="element.elementId"
              :layer-name="element.name"
              :layer-type="element.type"
              @close="closeAttributeEditor"
            />
          </transition>
        </div>
      </template>
    </draggable>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import ElementAttributesEditor from '../layers/ElementAttributesEditor.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

const editingElementId = ref(null);

function openAttributeEditor(layer) {
  props.editor.selectLayer(layer.id);
  editingElementId.value = layer.elementId;
}

function toggleAttributeEditor(layer) {
  if (editingElementId.value === layer.elementId) {
    closeAttributeEditor();
    return;
  }
  openAttributeEditor(layer);
}

function closeAttributeEditor() {
  editingElementId.value = null;
}

function supportsElementProperties(type) {
  return type === 'text' || type === 'image';
}

function getAttributeButtonLabel(element) {
  if (element.customAttributeCount > 0) return `编辑元素配置，已配置 ${element.customAttributeCount} 项`;
  return element.type === 'image' ? '添加图片描述' : '添加 H5 文本规则';
}

function getAttributeButtonTitle(element) {
  if (element.customAttributeCount > 0) return `已配置 ${element.customAttributeCount} 项`;
  return element.type === 'image' ? '图片描述' : 'H5 文本规则';
}

function formatAttributeCount(count) {
  return count > 9 ? '9+' : String(count);
}

function resolveLayerIcon(type) {
  const icons = {
    text: 'mdi-format-text',
    image: 'mdi-image-outline',
    rect: 'mdi-vector-square',
    shape: 'mdi-shape-outline'
  };
  return icons[type] ?? icons.shape;
}

watch(
  () => props.editor.layers.value,
  (layers) => {
    if (editingElementId.value && !layers.some((layer) => layer.elementId === editingElementId.value)) {
      closeAttributeEditor();
    }
  }
);
</script>
