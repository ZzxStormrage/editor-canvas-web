<template>
  <label class="text-rule-number-field">
    <span>{{ label }}</span>
    <v-number-input
      :model-value="modelValue"
      :aria-label="label"
      class="text-rule-number-input"
      control-variant="stacked"
      density="compact"
      hide-details="auto"
      :min="1"
      :max="max"
      placeholder="不限"
      variant="outlined"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: Number, default: null },
  label: { type: String, required: true },
  max: { type: Number, required: true }
});

const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>
.text-rule-number-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.text-rule-number-field > span {
  color: var(--editor-text);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.text-rule-number-input {
  --v-input-control-height: 30px;
}

.text-rule-number-input :deep(.v-input__control),
.text-rule-number-input :deep(.v-field),
.text-rule-number-input :deep(.v-field__field),
.text-rule-number-input :deep(.v-field__input) {
  min-height: 30px !important;
  height: 30px !important;
}

.text-rule-number-input :deep(.v-field__input) {
  padding-block: 0 !important;
  font-size: 12px;
}

.text-rule-number-input :deep(.v-number-input__control) {
  width: 26px;
  height: 30px !important;
  grid-template-rows: 15px 15px !important;
}

.text-rule-number-input :deep(.v-number-input__control .v-btn) {
  width: 26px !important;
  min-width: 26px !important;
  height: 15px !important;
  min-height: 15px !important;
  padding: 0 !important;
}
</style>
