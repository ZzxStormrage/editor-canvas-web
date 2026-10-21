<template>
  <Transition name="editor-attribute-drawer">
    <aside
      v-if="activeLayer"
      ref="drawerRef"
      class="editor-attribute-drawer"
      :aria-label="`${activeLayer.name}属性`"
    >
      <div class="layer-attribute-header editor-attribute-drawer__header">
        <div class="editor-attribute-drawer__close-row">
          <button
            type="button"
            class="layer-attribute-close"
            aria-label="关闭属性编辑"
            @click="editor.closeElementAttributes"
          >
            <v-icon icon="mdi-close" size="17" />
          </button>
        </div>
        <div class="editor-attribute-drawer__heading">
          <template v-if="activeLayer.type === 'production-area'">
            <strong>{{ drawerTitle }}</strong>
            <span>{{ activeLayer.name }}</span>
          </template>
          <template v-else>
            <div class="attribute-mode-switch" role="tablist" aria-label="属性类别">
              <button
                v-if="!editor.enableCustomization || activeLayer.customizationEnabled"
                id="attribute-mode-customization"
                type="button"
                role="tab"
                class="attribute-mode-switch__tab"
                :class="{ 'attribute-mode-switch__tab--active': activeAttributeMode === 'customization' }"
                :aria-selected="activeAttributeMode === 'customization'"
                aria-controls="attribute-mode-panel"
                @click="activeAttributeMode = 'customization'"
              >定制配置</button>
              <button
                id="attribute-mode-canvas"
                type="button"
                role="tab"
                class="attribute-mode-switch__tab"
                :class="{ 'attribute-mode-switch__tab--active': activeAttributeMode === 'canvas' }"
                :aria-selected="activeAttributeMode === 'canvas'"
                aria-controls="attribute-mode-panel"
                @click="activeAttributeMode = 'canvas'"
              >画布样式</button>
            </div>
            <span class="editor-attribute-drawer__element-name">{{ activeLayer.name }}</span>
          </template>
        </div>
      </div>

      <div class="editor-attribute-drawer__content">
        <template v-if="activeLayer.type === 'production-area'">
          <AttributeSection
            :key="`${activeLayer.elementId}:base`"
            default-open
            title="生产文件区域"
            subtitle="位置与尺寸"
          >
            <div class="production-area-drawer-actions">
              <span>{{ editor.productionAreaMillimeterSize.value }}</span>
              <v-btn
                color="error"
                density="compact"
                prepend-icon="mdi-delete-outline"
                size="small"
                variant="tonal"
                @click="editor.deleteSelectedProductionArea"
              >
                删除
              </v-btn>
            </div>
            <div class="print-area-property-grid">
              <PanelNumberField v-model="editor.productionAreaX.value" label="X 坐标" suffix="px" />
              <PanelNumberField v-model="editor.productionAreaY.value" label="Y 坐标" suffix="px" />
              <PanelNumberField v-model="editor.productionAreaWidth.value" label="宽度" suffix="px" :min="1" />
              <PanelNumberField v-model="editor.productionAreaHeight.value" label="高度" suffix="px" :min="1" />
            </div>
          </AttributeSection>
        </template>
        <template v-else-if="activeLayer.type === 'image'">
          <div id="attribute-mode-panel" role="tabpanel" :aria-labelledby="activeTabId">
            <div v-show="activeAttributeMode === 'canvas'" class="attribute-mode-panel">
              <ImagePropertiesEditor :editor="editor" />
              <PrintAreaAlignment :editor="editor" :disabled="activeLayer.locked" divided />
            </div>
            <div
              v-if="!editor.enableCustomization || activeLayer.customizationEnabled"
              v-show="activeAttributeMode === 'customization'"
              class="attribute-mode-panel"
            >
              <ElementAttributesEditor
                :key="activeLayer.elementId"
                :editor="editor"
                :element-id="activeLayer.elementId"
                :layer-name="activeLayer.name"
                :layer-type="activeLayer.type"
                :show-header="false"
                :show-image-section-title="false"
                @close="editor.closeElementAttributes"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <div id="attribute-mode-panel" role="tabpanel" :aria-labelledby="activeTabId">
            <div v-show="activeAttributeMode === 'canvas'" class="attribute-mode-panel">
              <PrintAreaAlignment :editor="editor" :disabled="activeLayer.locked" />
            </div>
            <div
              v-if="!editor.enableCustomization || activeLayer.customizationEnabled"
              v-show="activeAttributeMode === 'customization'"
              class="attribute-mode-panel"
            >
              <ElementAttributesEditor
                :key="activeLayer.elementId"
                :editor="editor"
                :element-id="activeLayer.elementId"
                :layer-name="activeLayer.name"
                :layer-type="activeLayer.type"
                :show-header="false"
                @close="editor.closeElementAttributes"
              />
            </div>
          </div>
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
import PanelNumberField from './PanelNumberField.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});
const drawerRef = ref(null);
const activeAttributeMode = ref('customization');
const drawerTitle = computed(() => {
  if (activeLayer.value?.type === 'image') return '图片属性'
  if (activeLayer.value?.type === 'production-area') return '生产文件区域属性'
  return '文字属性'
});

const activeLayer = computed(() => {
  const elementId = props.editor.activeAttributeElementId.value;
  return props.editor.layers.value.find((layer) => layer.elementId === elementId) ?? null;
});
const activeTabId = computed(() => activeAttributeMode.value === 'canvas'
  ? 'attribute-mode-canvas'
  : 'attribute-mode-customization');

watch(
  () => activeLayer.value?.elementId,
  () => {
    activeAttributeMode.value = activeLayer.value?.type === 'production-area'
      ? 'canvas'
      : 'customization';
  }
);

watch(
  () => activeLayer.value?.customizationEnabled,
  (enabled) => {
    if (props.editor.enableCustomization && !enabled) {
      activeAttributeMode.value = 'canvas';
    }
  }
);

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
