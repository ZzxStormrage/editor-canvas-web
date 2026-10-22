<template>
  <div class="layer-actions" :class="{ 'layer-actions--always-visible': alwaysVisible }">
    <button
      type="button"
      class="layer-action-button"
      :class="{ 'layer-action-button--hidden': !layer.visible }"
      :aria-label="layer.visible ? '隐藏图层' : '显示图层'"
      :aria-pressed="!layer.visible"
      @pointerdown.stop
      @click.stop="emit('toggle-visibility')"
    >
      <v-icon :icon="layer.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">
        {{ layer.visible ? '隐藏' : '显示' }}
      </v-tooltip>
    </button>

    <button
      v-if="supportsElementProperties"
      type="button"
      class="layer-action-button layer-attribute-button"
      data-editor-attribute-trigger
      :class="{
        'layer-action-button--active': attributesActive
      }"
      :aria-label="attributeAriaLabel"
      :aria-expanded="attributesActive"
      @pointerdown.stop
      @keydown.stop
      @click.stop="emit('edit-attributes')"
    >
      <v-icon icon="mdi-tune-variant" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">属性</v-tooltip>
    </button>

    <button
      type="button"
      class="layer-action-button"
      aria-label="置顶图层"
      :disabled="!canMoveToFront"
      @pointerdown.stop
      @click.stop="emit('move-to-front')"
    >
      <v-icon icon="mdi-arrange-bring-to-front" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">置顶</v-tooltip>
    </button>

    <button
      type="button"
      class="layer-action-button"
      aria-label="移动到上一层"
      :disabled="!canMoveUp"
      @pointerdown.stop
      @click.stop="emit('move-up')"
    >
      <v-icon icon="mdi-arrow-up" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">上移</v-tooltip>
    </button>

    <button
      type="button"
      class="layer-action-button"
      aria-label="移动到下一层"
      :disabled="!canMoveDown"
      @pointerdown.stop
      @click.stop="emit('move-down')"
    >
      <v-icon icon="mdi-arrow-down" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">下移</v-tooltip>
    </button>

    <button
      type="button"
      class="layer-action-button"
      :class="{ 'layer-action-button--active': layer.locked }"
      :aria-label="layer.locked ? '解锁图层' : '锁定图层'"
      @pointerdown.stop
      @click.stop="emit('toggle-lock')"
    >
      <v-icon :icon="layer.locked ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">
        {{ layer.locked ? '解锁' : '锁定' }}
      </v-tooltip>
    </button>

    <button
      type="button"
      class="layer-action-button layer-delete-button"
      aria-label="删除图层"
      @pointerdown.stop
      @click.stop="emit('delete')"
    >
      <v-icon icon="mdi-delete-outline" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">删除</v-tooltip>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  layer: {
    type: Object,
    required: true
  },
  attributesActive: {
    type: Boolean,
    default: false
  },
  alwaysVisible: {
    type: Boolean,
    default: false
  },
  canMoveUp: {
    type: Boolean,
    default: false
  },
  canMoveDown: {
    type: Boolean,
    default: false
  },
  canMoveToFront: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'toggle-visibility',
  'edit-attributes',
  'move-to-front',
  'move-up',
  'move-down',
  'toggle-lock',
  'delete'
]);

const supportsElementProperties = computed(() => props.layer.type === 'text' || props.layer.type === 'image');
const attributeAriaLabel = computed(() => props.layer.type === 'image' ? '设置图片属性' : '设置文字属性');
</script>
