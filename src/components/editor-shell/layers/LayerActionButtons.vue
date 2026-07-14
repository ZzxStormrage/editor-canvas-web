<template>
  <div class="layer-actions" :class="{ 'layer-actions--always-visible': alwaysVisible }">
    <button
      v-if="supportsElementProperties"
      type="button"
      class="layer-action-button layer-attribute-button"
      :class="{
        'layer-action-button--active': attributesActive,
        'layer-attribute-button--configured': layer.customAttributeCount > 0
      }"
      :aria-label="attributeAriaLabel"
      @pointerdown.stop
      @click.stop="emit('edit-attributes')"
    >
      <v-icon icon="mdi-tune-variant" size="17" />
      <span v-if="layer.customAttributeCount > 0" class="layer-attribute-count">
        {{ formattedAttributeCount }}
      </span>
      <v-tooltip activator="parent" location="top" open-delay="350">属性</v-tooltip>
    </button>

    <button
      v-if="layer.type === 'image'"
      type="button"
      class="layer-action-button"
      :class="{ 'layer-action-button--active': layer.pointerThrough }"
      :aria-label="layer.pointerThrough ? '取消图片点击穿透' : '启用图片点击穿透'"
      @pointerdown.stop
      @click.stop="emit('toggle-pointer-through')"
    >
      <v-icon :icon="layer.pointerThrough ? 'mdi-mouse-off' : 'mdi-cursor-default-click-outline'" size="17" />
      <v-tooltip activator="parent" location="top" open-delay="350">
        {{ layer.pointerThrough ? '取消穿透' : '穿透' }}
      </v-tooltip>
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
  }
});

const emit = defineEmits(['edit-attributes', 'toggle-pointer-through', 'toggle-lock', 'delete']);

const supportsElementProperties = computed(() => props.layer.type === 'text' || props.layer.type === 'image');
const formattedAttributeCount = computed(() => {
  const count = Number(props.layer.customAttributeCount) || 0;
  return count > 9 ? '9+' : String(count);
});
const attributeAriaLabel = computed(() => {
  const typeLabel = props.layer.type === 'image' ? '图片属性' : 'H5 文本规则';
  const count = Number(props.layer.customAttributeCount) || 0;
  return count > 0 ? `编辑${typeLabel}，已配置 ${count} 项` : `设置${typeLabel}`;
});
</script>
