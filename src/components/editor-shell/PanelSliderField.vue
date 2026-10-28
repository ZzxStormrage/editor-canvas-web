<template>
  <div class="slider-field">
    <label>{{ label }}</label>
    <div class="slider-row" :style="{ gridTemplateColumns: `minmax(0, 1fr) ${valueWidth}px` }">
      <v-slider
        :model-value="modelValue"
        :max="max"
        :min="min"
        :step="step"
        @update:model-value="updateValue"
      />
      <v-number-input
        :model-value="modelValue"
        :aria-label="label"
        class="value-field"
        label=""
        :max="max"
        :min="min"
        :step="step"
        :style="{ width: `${valueWidth}px` }"
        @update:model-value="updateValue"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  valueWidth: { type: Number, default: 104 }
});

const emit = defineEmits(['update:modelValue']);

function updateValue(value) {
  emit('update:modelValue', Number(value));
}
</script>
