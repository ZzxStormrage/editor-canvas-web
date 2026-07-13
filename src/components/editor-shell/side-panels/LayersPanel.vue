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
            <div class="layer-name-cell">
              <span class="layer-name" :title="element.name">{{ element.name }}</span>
              <span
                v-if="element.imageRole"
                class="layer-image-role-badge"
                :class="`layer-image-role-badge--${element.imageRole}`"
              >
                {{ getImageRoleLabel(element.imageRole) }}
              </span>
            </div>
            <LayerActionButtons
              :layer="element"
              :attributes-active="editingElementId === element.elementId"
              @edit-attributes="toggleAttributeEditor(element)"
              @toggle-pointer-through="editor.toggleLayerPointerThrough(element.id)"
              @toggle-lock="editor.toggleLayerLock(element.id)"
              @delete="editor.deleteLayer(element.id)"
            />
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
import LayerActionButtons from '../layers/LayerActionButtons.vue';
import { getImageRoleLabel, resolveLayerIcon } from '../layers/layerDisplay.js';

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

watch(
  () => props.editor.layers.value,
  (layers) => {
    if (editingElementId.value && !layers.some((layer) => layer.elementId === editingElementId.value)) {
      closeAttributeEditor();
    }
  }
);
</script>
