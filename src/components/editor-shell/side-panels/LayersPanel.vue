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
                type="button"
                class="layer-action-button layer-attribute-button"
                :class="{
                  'layer-action-button--active': editingElementId === element.elementId,
                  'layer-attribute-button--configured': element.customAttributeCount > 0
                }"
                :aria-label="element.customAttributeCount > 0 ? `编辑自定义属性，已配置 ${element.customAttributeCount} 条` : '添加自定义属性'"
                :title="element.customAttributeCount > 0 ? `自定义属性 ${element.customAttributeCount} 条` : '添加自定义属性'"
                @pointerdown.stop
                @click.stop="toggleAttributeEditor(element)"
              >
                <v-icon icon="mdi-tag-text-outline" size="16" />
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
            <div v-if="editingElementId === element.elementId" class="layer-attribute-editor">
              <div class="layer-attribute-header">
                <div>
                  <strong>自定义属性</strong>
                  <span>{{ editingLayerName }}</span>
                </div>
                <button
                  type="button"
                  class="layer-attribute-close"
                  aria-label="关闭属性编辑"
                  @click="closeAttributeEditor"
                >
                  <v-icon icon="mdi-close" size="17" />
                </button>
              </div>

              <p class="layer-attribute-help">填写 H5 页面需要读取的描述型字符属性。</p>

              <div class="layer-attribute-list">
                <div v-for="(item, index) in attributeRows" :key="item.id" class="layer-attribute-row">
                  <v-text-field
                    v-model.trim="item.key"
                    class="layer-attribute-key"
                    density="compact"
                    hide-details="auto"
                    label="属性名"
                    placeholder="例如：material"
                    variant="outlined"
                  />
                  <v-textarea
                    v-model="item.value"
                    auto-grow
                    class="layer-attribute-value"
                    density="compact"
                    hide-details="auto"
                    label="描述内容"
                    placeholder="请输入字符描述"
                    rows="1"
                    variant="outlined"
                  />
                  <button
                    type="button"
                    class="layer-attribute-remove"
                    aria-label="删除该属性"
                    @click="removeAttributeRow(index)"
                  >
                    <v-icon icon="mdi-minus-circle-outline" size="17" />
                  </button>
                </div>
              </div>

              <button type="button" class="layer-attribute-add" @click="addAttributeRow">
                <v-icon icon="mdi-plus" size="16" />
                添加一条属性
              </button>

              <div v-if="attributeError" class="layer-attribute-error">{{ attributeError }}</div>

              <div class="layer-attribute-footer">
                <v-btn density="compact" variant="text" @click="closeAttributeEditor">取消</v-btn>
                <v-btn color="primary" density="compact" variant="flat" @click="saveAttributes">保存属性</v-btn>
              </div>
            </div>
          </transition>
        </div>
      </template>
    </draggable>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

const editingElementId = ref(null);
const editingLayerName = ref('');
const attributeRows = ref([]);
const attributeError = ref('');
let nextAttributeRowId = 1;

/**
 * 打开指定图层的属性编辑区。
 *
 * @param {{ elementId: string, name: string, id: string }} layer 图层 DTO。
 * @returns {void}
 */
function openAttributeEditor(layer) {
  props.editor.selectLayer(layer.id);
  editingElementId.value = layer.elementId;
  editingLayerName.value = layer.name;
  attributeError.value = '';

  const attributes = props.editor.getElementAttributesById(layer.elementId) ?? {};
  const customAttributes = isAttributeRecord(attributes.custom) ? attributes.custom : {};

  attributeRows.value = Object.entries(customAttributes).map(([key, value]) => createAttributeRow(key, value));

  if (attributeRows.value.length === 0) {
    addAttributeRow();
  }
}

/**
 * 点击当前图层属性按钮时切换展开状态。
 *
 * @param {{ elementId: string, name: string, id: string }} layer 图层 DTO。
 * @returns {void}
 */
function toggleAttributeEditor(layer) {
  if (editingElementId.value === layer.elementId) {
    closeAttributeEditor();
    return;
  }

  openAttributeEditor(layer);
}

/** @param {number} count 属性数量。 */
function formatAttributeCount(count) {
  return count > 9 ? '9+' : String(count);
}

/** 保存当前图层的描述型字符属性。 */
function saveAttributes() {
  attributeError.value = '';
  const customAttributes = {};

  for (const row of attributeRows.value) {
    const key = row.key.trim();

    if (!key && !row.value.trim()) {
      continue;
    }

    if (!key) {
      attributeError.value = '请填写属性名';
      return;
    }

    if (Object.hasOwn(customAttributes, key)) {
      attributeError.value = `属性名“${key}”重复`;
      return;
    }

    customAttributes[key] = row.value.trim();
  }

  const currentAttributes = props.editor.getElementAttributesById(editingElementId.value) ?? {};

  if (Object.keys(customAttributes).length === 0) {
    const nextAttributes = { ...currentAttributes };
    delete nextAttributes.custom;
    props.editor.setElementAttributesById(editingElementId.value, nextAttributes, { replace: true });
  } else {
    props.editor.setElementAttributesById(editingElementId.value, {
      ...currentAttributes,
      custom: customAttributes
    }, { replace: true });
  }

  closeAttributeEditor();
}

/** 添加空属性行。 */
function addAttributeRow() {
  attributeRows.value.push(createAttributeRow());
}

/** @param {number} index 属性行索引。 */
function removeAttributeRow(index) {
  attributeRows.value.splice(index, 1);

  if (attributeRows.value.length === 0) {
    addAttributeRow();
  }
}

/** 关闭属性编辑区并清理草稿。 */
function closeAttributeEditor() {
  editingElementId.value = null;
  editingLayerName.value = '';
  attributeRows.value = [];
  attributeError.value = '';
}

/**
 * @param {string} [key=''] 属性名。
 * @param {*} [value=''] 属性值。
 * @returns {{ id: number, key: string, value: string }} 表单行。
 */
function createAttributeRow(key = '', value = '') {
  const row = {
    id: nextAttributeRowId,
    key,
    value: String(value ?? '')
  };
  nextAttributeRowId += 1;
  return row;
}

/** @param {*} value 待判断值。 */
function isAttributeRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

watch(
  () => props.editor.layers.value,
  (layers) => {
    if (editingElementId.value && !layers.some((layer) => layer.elementId === editingElementId.value)) {
      closeAttributeEditor();
    }
  }
);

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
