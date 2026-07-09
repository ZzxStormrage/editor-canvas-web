<template>
  <nav class="editor-rail" aria-label="编辑器主导航">
    <v-btn
      v-for="item in railItems"
      :key="item.label"
      class="rail-button"
      :class="{ 'is-active': modelValue === item.value }"
      variant="text"
      stacked
      :aria-label="item.label"
      @click="handleSelectPanel(item.value)"
    >
      <v-icon :icon="item.icon" />
      <span>{{ item.label }}</span>
    </v-btn>
  </nav>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const railItems = [
  { label: '图片', value: 'image', icon: 'mdi-image-outline' },
  { label: '文字', value: 'text', icon: 'mdi-format-text' },
  { label: '水印', value: 'watermark', icon: 'mdi-water-percent' },
  { label: '画布', value: 'artboard', icon: 'mdi-artboard' }
];

/**
 * 切换左侧功能面板。
 *
 * @param {string} panel 功能面板标识。
 * @returns {void}
 */
function handleSelectPanel(panel) {
  emit('update:modelValue', panel);
}
</script>
