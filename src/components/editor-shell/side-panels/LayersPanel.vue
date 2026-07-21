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
          :ref="(elementRef) => setLayerEntryRef(element.elementId, elementRef)"
          class="layer-entry"
          role="listitem"
        >
          <div
            class="layer-item"
            :class="{
              'layer-item--selected': element.selected,
              'layer-item--locked': element.locked,
              'layer-item--hidden': !element.visible,
              'layer-item--expanded': editingElementId === element.elementId
            }"
            tabindex="0"
            :aria-label="`图层 ${element.name}`"
            @click="editor.selectLayer(element.id)"
            @keydown.enter.prevent="editor.selectLayer(element.id)"
            @mouseenter="editor.hoverLayer(element.id)"
            @mouseleave="editor.hoverLayer(null)"
          >
            <span class="layer-drag-handle" aria-hidden="true">
              <v-icon icon="mdi-drag-vertical" size="20" />
            </span>
            <div class="layer-preview-cell" :title="element.name">
              <LayerPreview :layer="element" :load-thumbnail="editor.getLayerThumbnail" />
              <span
                v-if="element.imageRole"
                class="layer-image-role-badge"
                :class="`layer-image-role-badge--${element.imageRole}`"
              >
                {{ getImageRoleLabel(element.imageRole) }}
              </span>
              <span
                v-if="element.textLayoutMode"
                class="layer-text-layout-badge"
                :class="`layer-text-layout-badge--${element.textLayoutMode}`"
              >
                {{ getTextLayoutLabel(element.textLayoutMode) }}
              </span>
            </div>
            <LayerActionButtons
              :layer="element"
              :attributes-active="editingElementId === element.elementId"
              @edit-attributes="toggleAttributeEditor(element)"
              @toggle-visibility="editor.toggleLayerVisibility(element.id)"
              @toggle-pointer-through="editor.toggleLayerPointerThrough(element.id)"
              @toggle-lock="editor.toggleLayerLock(element.id)"
              @delete="editor.deleteLayer(element.id)"
            />
          </div>

          <transition
            name="layer-attribute-expand"
            @after-enter="scrollLayerIntoView(element.elementId)"
          >
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
import { nextTick, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import ElementAttributesEditor from '../layers/ElementAttributesEditor.vue';
import LayerActionButtons from '../layers/LayerActionButtons.vue';
import LayerPreview from '../layers/LayerPreview.vue';
import { getImageRoleLabel } from '../layers/layerDisplay.js';

const TEXT_LAYOUT_LABELS = Object.freeze({
  'single-line': '单行适配',
  vertical: '竖行'
});

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

const editingElementId = ref(null);
const layerEntryRefs = new Map();

/**
 * 获取文字显示策略的图层标记。
 *
 * @param {string} mode 文字显示策略。
 * @returns {string} 图层标记文字。
 */
function getTextLayoutLabel(mode) {
  return TEXT_LAYOUT_LABELS[mode] ?? '';
}

function openAttributeEditor(layer) {
  props.editor.selectLayer(layer.id);
  editingElementId.value = layer.elementId;
  void nextTick(() => scrollLayerIntoView(layer.elementId));
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

/**
 * 保存图层列表项 DOM 引用，用于属性请求到达后定位目标图层。
 *
 * @param {string} elementId 元素 ID。
 * @param {HTMLElement | null} element 图层列表项。
 * @returns {void}
 */
function setLayerEntryRef(elementId, element) {
  if (element) layerEntryRefs.set(elementId, element);
  else layerEntryRefs.delete(elementId);
}

/**
 * 将目标图层及展开后的属性区域滚动到可视范围。
 *
 * @param {string} elementId 元素 ID。
 * @returns {void}
 */
function scrollLayerIntoView(elementId) {
  layerEntryRefs.get(elementId)?.scrollIntoView?.({ block: 'nearest' });
}

/**
 * 响应悬浮工具栏发出的属性面板请求。
 *
 * @param {{ requestId: number, elementId: string } | null} request 属性请求。
 * @param {Object[]} layers 当前图层列表。
 * @returns {void}
 */
function handleAttributeEditorRequest(request, layers) {
  if (!request) return;

  const layer = layers.find((item) => item.elementId === request.elementId);
  if (!layer || (layer.type !== 'text' && layer.type !== 'image')) return;

  openAttributeEditor(layer);
  props.editor.clearElementAttributesRequest(request.requestId);
}

watch(
  [() => props.editor.attributeEditorRequest.value, () => props.editor.layers.value],
  ([request, layers]) => handleAttributeEditorRequest(request, layers),
  { immediate: true }
);

watch(
  () => props.editor.layers.value,
  (layers) => {
    if (editingElementId.value && !layers.some((layer) => layer.elementId === editingElementId.value)) {
      closeAttributeEditor();
    }
  }
);
</script>
