<template>
  <nav class="editor-rail" aria-label="编辑器主导航">
    <v-btn
      v-for="item in railItems"
      :key="item.label"
      class="rail-button"
      :color="modelValue === item.value ? 'primary' : 'muted'"
      :variant="modelValue === item.value ? 'tonal' : 'text'"
      density="compact"
      height="46"
      rounded="md"
      stacked
      :aria-label="item.label"
      @click="handleSelectPanel(item.value)"
    >
      <span class="rail-button-content">
        <v-icon :icon="item.icon" />
        <span>{{ item.label }}</span>
      </span>
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
  { label: '图层', value: 'layers', icon: 'mdi-layers-outline' },
  { label: '画布', value: 'artboard', icon: 'mdi-artboard' },
  { label: '工具', value: 'tools', icon: 'mdi-tools' }
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
