<template>
  <div
    class="print-area-alignment"
    :class="{ 'print-area-alignment--divided': divided }"
  >
    <div class="print-area-alignment__heading">
      <strong>相对打印区域对齐</strong>
      <small>{{ helperText }}</small>
    </div>

    <div class="print-area-alignment__grid" role="group" aria-label="相对打印区域对齐">
      <button
        v-for="option in alignmentOptions"
        :key="option.value"
        type="button"
        class="print-area-alignment__button"
        :disabled="controlsDisabled"
        :aria-label="option.label"
        @click="editor.alignSelectedToPrintArea(option.value)"
      >
        <v-icon :icon="option.icon" size="13" />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const alignmentOptions = Object.freeze([
  { label: '左对齐', value: 'left', icon: 'mdi-align-horizontal-left' },
  { label: '水平居中', value: 'horizontal-center', icon: 'mdi-align-horizontal-center' },
  { label: '右对齐', value: 'right', icon: 'mdi-align-horizontal-right' },
  { label: '顶部对齐', value: 'top', icon: 'mdi-align-vertical-top' },
  { label: '垂直居中', value: 'vertical-center', icon: 'mdi-align-vertical-center' },
  { label: '底部对齐', value: 'bottom', icon: 'mdi-align-vertical-bottom' }
]);

const props = defineProps({
  editor: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  divided: { type: Boolean, default: false }
});

const printAreaAvailable = computed(() => props.editor.printAreaAvailable?.value === true);
const controlsDisabled = computed(() => props.disabled || !printAreaAvailable.value);
const helperText = computed(() => {
  if (props.disabled) {
    return '请先解锁当前元素';
  }
  return printAreaAvailable.value
    ? '按元素外框与打印区域边界对齐'
    : '请先在画布面板创建打印区域';
});
</script>

<style scoped>
.print-area-alignment {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.print-area-alignment--divided {
  margin-top: 3px;
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-outline), 0.1);
}

.print-area-alignment__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.print-area-alignment__heading strong {
  color: var(--editor-text);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
}

.print-area-alignment__heading small {
  color: var(--editor-muted);
  font-size: 8px;
  font-weight: 550;
  line-height: 1.35;
}

.print-area-alignment__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.print-area-alignment__button {
  display: inline-flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 3px 4px;
  border: 1px solid rgba(var(--v-theme-outline), 0.22);
  border-radius: 6px;
  color: var(--editor-text);
  background: rgba(var(--v-theme-control), 0.42);
  font: inherit;
  font-size: 9px;
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    background-color 150ms ease;
}

.print-area-alignment__button:hover:not(:disabled),
.print-area-alignment__button:focus-visible:not(:disabled) {
  border-color: rgba(var(--v-theme-primary), 0.42);
  color: var(--editor-primary);
  background: rgba(var(--v-theme-primary), 0.08);
  outline: none;
}

.print-area-alignment__button:focus-visible:not(:disabled) {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.14);
}

.print-area-alignment__button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

@media (prefers-reduced-motion: reduce) {
  .print-area-alignment__button {
    transition: none;
  }
}
</style>
