<template>
  <div
    class="panel-segmented-control"
    :style="{ '--segment-count': options.length }"
    :role="multiple ? 'group' : 'radiogroup'"
    :aria-label="ariaLabel"
  >
    <button
      v-for="item in options"
      :key="item.value"
      class="panel-segmented-control__item"
      :class="{ 'is-active': isSelected(item.value) }"
      type="button"
      :role="multiple ? 'checkbox' : 'radio'"
      :aria-checked="isSelected(item.value)"
      :aria-label="item.ariaLabel || item.label"
      :disabled="disabled"
      :title="item.ariaLabel || item.label"
      @click="handleSelect(item.value)"
    >
      <v-icon v-if="item.icon" :icon="item.icon" size="18" />
      <span
        v-if="item.label && !item.iconOnly"
        class="panel-segmented-control__label"
      >
        {{ item.label }}
      </span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, Array],
    default: null
  },
  options: {
    type: Array,
    required: true
  },
  multiple: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: '选项'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

/**
 * 判断指定选项是否处于选中状态。
 *
 * @param {string | number | boolean} value 选项值。
 * @returns {boolean} 是否选中。
 */
function isSelected(value) {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(value);
  }

  return props.modelValue === value;
}

/**
 * 切换单选或多选控件的选中值。
 *
 * @param {string | number | boolean} value 选项值。
 * @returns {void}
 */
function handleSelect(value) {
  if (!props.multiple) {
    emit('update:modelValue', value);
    return;
  }

  const values = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  const index = values.indexOf(value);

  if (index >= 0) {
    values.splice(index, 1);
  } else {
    values.push(value);
  }

  emit('update:modelValue', values);
}
</script>

<style scoped>
.panel-segmented-control {
  display: grid;
  grid-template-columns: repeat(var(--segment-count), minmax(0, 1fr));
  gap: 3px;
  min-height: 38px;
  padding: 3px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  border-radius: var(--editor-radius-control, 8px);
  background: rgba(var(--v-theme-control), 0.78);
}

.panel-segmented-control__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 30px;
  gap: 5px;
  padding: 0 8px;
  overflow: hidden;
  border: 0;
  border-radius: var(--editor-radius-field, 6px);
  background: transparent;
  color: var(--editor-muted);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}

.panel-segmented-control__item:hover {
  color: var(--editor-text);
  background: rgba(var(--v-theme-surface), 0.72);
}

.panel-segmented-control__item:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.34);
  outline-offset: 2px;
}

.panel-segmented-control__item:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.panel-segmented-control__item.is-active {
  background: var(--editor-panel);
  box-shadow: 0 1px 3px rgba(var(--v-theme-shadow), 0.12);
  color: var(--editor-primary);
}

.panel-segmented-control__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .panel-segmented-control__item {
    transition: none;
  }
}
</style>
