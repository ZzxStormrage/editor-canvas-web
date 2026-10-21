<template>
  <div v-if="entries.length" class="image-customization-picker" role="group" aria-label="选择定制图片">
    <span class="image-customization-picker__label">选择要定制的图片</span>
    <div class="image-customization-picker__options">
      <button
        v-for="entry in entries"
        :key="entry.id"
        type="button"
        :aria-pressed="modelValue === entry.id"
        :disabled="disabled"
        @click="emit('update:modelValue', entry.id)"
      >
        <span>{{ entry.label }}</span>
        <small v-if="entry.targets.length > 1">{{ entry.targets.length }} 张同步</small>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  entries: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.image-customization-picker { display: flex; flex-direction: column; gap: 8px; padding: 8px 16px; color: #191919; }
.image-customization-picker__label { font-size: 12px; font-weight: 600; }
.image-customization-picker__options { display: flex; flex-wrap: wrap; gap: 8px; }
.image-customization-picker button { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border: 1px solid #d8d8dc; background: #fff; border-radius: 6px; font: inherit; font-size: 13px; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.image-customization-picker button[aria-pressed="true"] { color: #c7002d; border-color: currentColor; background: #fff3f3; }
.image-customization-picker button:focus-visible { outline: 2px solid #c7002d; outline-offset: 2px; }
.image-customization-picker button:disabled { opacity: 0.5; cursor: wait; }
.image-customization-picker small { font-size: 11px; white-space: nowrap; }
</style>
