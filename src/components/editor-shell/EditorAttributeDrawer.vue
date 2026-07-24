<template>
  <Transition name="editor-attribute-drawer">
    <aside
      v-if="activeLayer"
      ref="drawerRef"
      class="editor-attribute-drawer"
      :aria-label="`${activeLayer.name}属性`"
    >
      <div class="layer-attribute-header editor-attribute-drawer__header">
        <div>
          <strong>{{ drawerTitle }}</strong>
          <span>{{ activeLayer.name }}</span>
        </div>
        <button
          type="button"
          class="layer-attribute-close"
          aria-label="关闭属性编辑"
          @click="editor.closeElementAttributes"
        >
          <v-icon icon="mdi-close" size="17" />
        </button>
      </div>

      <div class="editor-attribute-drawer__content">
        <template v-if="activeLayer.type === 'image'">
          <AttributeSection
            :key="`${activeLayer.elementId}:base`"
            default-open
            title="基础属性"
            subtitle="位置、尺寸、外观与生产文件区域对齐"
          >
            <ImagePropertiesEditor :editor="editor" />
            <PrintAreaAlignment
              :editor="editor"
              :disabled="activeLayer.locked"
              divided
            />
          </AttributeSection>
          <AttributeSection
            :key="`${activeLayer.elementId}:business`"
            default-open
            title="业务属性"
            subtitle="图片用途与业务描述"
          >
            <ElementAttributesEditor
              :editor="editor"
              :element-id="activeLayer.elementId"
              :layer-name="activeLayer.name"
              :layer-type="activeLayer.type"
              :show-header="false"
              :show-image-section-title="false"
              @close="editor.closeElementAttributes"
            />
          </AttributeSection>
        </template>
        <template v-else>
          <AttributeSection
            :key="`${activeLayer.elementId}:base`"
            default-open
            title="基础属性"
            subtitle="相对生产文件区域定位"
          >
            <PrintAreaAlignment :editor="editor" :disabled="activeLayer.locked" />
          </AttributeSection>
          <AttributeSection
            :key="`${activeLayer.elementId}:business`"
            default-open
            title="业务属性"
            subtitle="文字描述与用户输入规则"
          >
            <ElementAttributesEditor
              :editor="editor"
              :element-id="activeLayer.elementId"
              :layer-name="activeLayer.name"
              :layer-type="activeLayer.type"
              :show-header="false"
              @close="editor.closeElementAttributes"
            />
          </AttributeSection>
        </template>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import AttributeSection from './attributes/AttributeSection.vue';
import PrintAreaAlignment from './attributes/PrintAreaAlignment.vue';
import ImagePropertiesEditor from './images/ImagePropertiesEditor.vue';
import ElementAttributesEditor from './layers/ElementAttributesEditor.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});
const drawerRef = ref(null);
const drawerTitle = computed(() => (activeLayer.value?.type === 'image' ? '图片属性' : '文字属性'));

const activeLayer = computed(() => {
  const elementId = props.editor.activeAttributeElementId.value;
  return props.editor.layers.value.find((layer) => layer.elementId === elementId) ?? null;
});

/**
 * 选区离开当前元素或元素被删除时关闭抽屉，避免继续编辑失效数据。
 *
 * @param {Object[]} layers 当前图层 DTO 列表。
 * @returns {void}
 */
function syncDrawerWithSelection(layers) {
  if (!props.editor.activeAttributeElementId.value) {
    return;
  }

  const layer = layers.find((item) => item.elementId === props.editor.activeAttributeElementId.value);
  if (!layer?.selected) {
    props.editor.closeElementAttributes();
  }
}

watch(() => props.editor.layers.value, syncDrawerWithSelection);

/**
 * 点击属性抽屉、属性触发按钮或抽屉产生的 Vuetify 浮层时保持打开。
 *
 * @param {EventTarget | null} target 事件目标。
 * @returns {boolean} 是否属于属性编辑交互区域。
 */
function isAttributeInteractionTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    drawerRef.value?.contains(target)
    || target.closest('[data-editor-attribute-trigger]')
    || target.closest('.v-overlay-container')
  );
}

/** @param {PointerEvent} event 页面指针事件。 @returns {void} */
function handleDocumentPointerDown(event) {
  if (activeLayer.value && !isAttributeInteractionTarget(event.target)) {
    props.editor.closeElementAttributes();
  }
}

/** @param {KeyboardEvent} event 页面键盘事件。 @returns {void} */
function handleDocumentKeyDown(event) {
  if (event.key === 'Escape' && activeLayer.value) {
    props.editor.closeElementAttributes();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  document.removeEventListener('keydown', handleDocumentKeyDown, true);
});
</script>
