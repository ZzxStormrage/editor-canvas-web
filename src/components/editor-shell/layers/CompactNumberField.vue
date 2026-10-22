<template>
  <label class="text-rule-number-field">
    <span class="text-rule-number-field__label">{{ label }}</span>
    <input
      :value="modelValue ?? ''"
      :aria-label="label"
      class="text-rule-number-field__input"
      inputmode="numeric"
      :min="1"
      :max="max"
      placeholder="不限"
      step="1"
      type="number"
      @input="handleInput"
    />
  </label>
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String], default: null },
  label: { type: String, required: true },
  max: { type: Number, required: true }
});

const emit = defineEmits(['update:modelValue']);

/**
 * 保留输入过程中的字符串状态，避免清空或连续键入时被数字转换打断。
 *
 * @param {Event} event 原生输入事件。
 * @returns {void}
 */
function handleInput(event) {
  const value = event.target.value;
  emit('update:modelValue', value === '' ? null : value);
}
</script>

<style scoped>
.text-rule-number-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.text-rule-number-field__label {
  color: var(--editor-text);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.text-rule-number-field__input {
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-theme-outline), 0.28);
  border-radius: var(--editor-radius-field, 6px);
  outline: none;
  color: var(--editor-text);
  background: rgba(var(--v-theme-control), 0.56);
  font-size: 12px;
  font-weight: 600;
  transition: border-color 150ms ease, background-color 150ms ease;
}

.text-rule-number-field__input:hover {
  border-color: rgba(var(--v-theme-outline), 0.5);
}

.text-rule-number-field__input:focus {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-background));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.text-rule-number-field__input::placeholder {
  color: var(--editor-muted);
  opacity: 1;
}
</style>
