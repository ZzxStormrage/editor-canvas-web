<template>
  <div class="panel-number-field" :class="{ 'panel-number-field--compact': compact }">
    <span class="panel-number-field__label">{{ label }}</span>
    <span class="panel-number-field__control">
      <v-number-input
        :model-value="modelValue"
        :aria-label="suffix ? `${label}（${suffix}）` : label"
        class="panel-number-field__input"
        control-variant="hidden"
        density="compact"
        hide-details="auto"
        :disabled="disabled"
        :max="max"
        :min="min"
        :step="step"
        suffix=""
        variant="outlined"
        @update:model-value="handleUpdate"
      />
      <span v-if="suffix" class="panel-number-field__unit" aria-hidden="true">{{ suffix }}</span>
    </span>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: Number, default: null },
  label: { type: String, required: true },
  suffix: { type: String, default: '' },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

/**
 * 过滤 v-number-input 清空过程中的无效值。
 *
 * @param {number | string | null} value 输入值。
 * @returns {void}
 */
function handleUpdate(value) {
  const number = Number(value)

  if (value !== null && value !== '' && Number.isFinite(number)) {
    emit('update:modelValue', number)
  }
}
</script>

<style scoped>
.panel-number-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.panel-number-field__label {
  color: var(--editor-text);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.panel-number-field__control {
  position: relative;
  display: block;
  min-width: 0;
}

.panel-number-field__input {
  min-width: 0;
  --v-input-control-height: 34px;
}

.panel-number-field__input :deep(.v-field) {
  min-height: 34px;
  border-radius: 6px;
  background: rgba(var(--v-theme-control), 0.56);
}

.panel-number-field__input :deep(.v-field__input) {
  min-height: 34px;
  padding-block: 0;
  padding-inline-start: 10px;
  font-size: 12px;
  font-weight: 650;
}

.panel-number-field__input :deep(.v-field__suffix) {
  display: none;
}

.panel-number-field__input--with-unit :deep(.v-field__input) {
  padding-inline-end: 28px;
}

.panel-number-field__unit {
  position: absolute;
  top: 50%;
  right: 9px;
  z-index: 1;
  color: var(--editor-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  transform: translateY(-50%);
}

.panel-number-field--compact {
  gap: 1px;
}

.panel-number-field--compact .panel-number-field__label {
  font-size: 8px;
}

.panel-number-field--compact .panel-number-field__input {
  --v-input-control-height: 24px;
}

.panel-number-field--compact .panel-number-field__input :deep(.v-input__control),
.panel-number-field--compact .panel-number-field__input :deep(.v-field),
.panel-number-field--compact .panel-number-field__input :deep(.v-field__input) {
  min-height: 24px;
  height: 24px;
}

.panel-number-field--compact .panel-number-field__input :deep(.v-field) {
  border-radius: 5px;
}

.panel-number-field--compact .panel-number-field__input :deep(.v-field__input) {
  padding-inline-start: 7px;
  font-size: 10px;
}

.panel-number-field--compact .panel-number-field__unit {
  right: 7px;
  font-size: 9px;
}

.panel-number-field--compact .panel-number-field__input--with-unit :deep(.v-field__input) {
  padding-inline-end: 22px;
}
</style>
