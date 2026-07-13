<template>
  <section class="panel-section text-panel">
    <div class="panel-heading">
      <span>文字</span>
      <v-chip class="font-size-chip" color="control" size="small" variant="flat">
        {{ editor.fontSize.value }} px
      </v-chip>
    </div>

    <PanelGroup>
      <v-btn
        block
        class="editor-action-button"
        color="primary"
        density="compact"
        prepend-icon="mdi-format-textbox"
        @click="editor.addText"
      >
        添加文本框
      </v-btn>
    </PanelGroup>

    <PanelGroup>
      <v-text-field v-model="editor.textValue.value" label="文字内容" />
      <v-select
        v-model="editor.fontFamily.value"
        :items="editor.fontOptions"
        label="字体"
      />
    </PanelGroup>

    <PanelGroup>
      <PanelSliderField v-model="editor.fontSize.value" label="字号" :max="240" :min="8" />

      <PanelSegmentedControl
        v-model="editor.fontWeight.value"
        aria-label="字重"
        :options="fontWeightOptions"
      />
    </PanelGroup>

    <PanelGroup>
      <PanelSegmentedControl
        v-model="styleSelections"
        aria-label="文字样式"
        multiple
        :options="styleOptions"
      />

      <v-color-input
        v-model="editor.textColor.value"
        class="text-color-input"
        label="文字颜色"
      >
        <template #append-inner>
          <span class="color-input-icon" aria-hidden="true">
            <span
              class="color-input-icon__swatch"
              :style="{ backgroundColor: editor.textColor.value }"
            ></span>
          </span>
        </template>
      </v-color-input>
    </PanelGroup>

    <PanelGroup>
      <div class="setting-row">
        <label>对齐</label>
        <PanelSegmentedControl
          v-model="editor.textAlign.value"
          aria-label="文字对齐"
          :options="alignOptions"
        />
      </div>

      <div class="setting-row">
        <label>方向</label>
        <PanelSegmentedControl
          v-model="editor.writingMode.value"
          aria-label="文字方向"
          :options="writingModeOptions"
        />
      </div>
    </PanelGroup>

    <PanelGroup>
      <PanelSliderField v-model="editor.letterSpacing.value" label="字距" :max="120" :min="0" />
      <PanelSliderField v-model="editor.lineHeight.value" label="行高" :max="300" :min="8" />
    </PanelGroup>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import PanelGroup from '../PanelGroup.vue';
import PanelSegmentedControl from '../PanelSegmentedControl.vue';
import PanelSliderField from '../PanelSliderField.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
});

const fontWeightOptions = [
  { label: '常规', value: '400' },
  { label: '中等', value: '500' },
  { label: '加粗', value: '700' }
];

const styleOptions = [
  {
    label: '斜体',
    value: 'italic',
    icon: 'mdi-format-italic',
    iconOnly: true
  },
  {
    label: '下划线',
    value: 'underline',
    icon: 'mdi-format-underline',
    iconOnly: true
  },
  {
    label: '删除线',
    value: 'lineThrough',
    icon: 'mdi-format-strikethrough',
    iconOnly: true
  }
];

const alignOptions = [
  {
    label: '左对齐',
    value: 'left',
    icon: 'mdi-format-align-left',
    iconOnly: true
  },
  {
    label: '居中',
    value: 'center',
    icon: 'mdi-format-align-center',
    iconOnly: true
  },
  {
    label: '右对齐',
    value: 'right',
    icon: 'mdi-format-align-right',
    iconOnly: true
  }
];

const writingModeOptions = [
  { label: '横版', value: 'x' },
  { label: '竖版', value: 'y' }
];

// 分段多选控件使用数组，编辑器状态使用多个布尔值。
// 这里集中做双向转换，避免模板里散落样式同步逻辑。
const styleSelections = computed({
  get: getStyleSelections,
  set: setStyleSelections
});

/**
 * 读取当前文字样式多选状态。
 *
 * @returns {string[]} 当前已选样式值。
 */
function getStyleSelections() {
  const selections = [];

  if (props.editor.italic.value) {
    selections.push('italic');
  }

  if (props.editor.underline.value) {
    selections.push('underline');
  }

  if (props.editor.lineThrough.value) {
    selections.push('lineThrough');
  }

  return selections;
}

/**
 * 把文字样式多选状态写回编辑器控件。
 *
 * @param {string[]} values 已选样式值。
 * @returns {void}
 */
function setStyleSelections(values) {
  const selectedValues = Array.isArray(values) ? values : [];

  props.editor.italic.value = selectedValues.includes('italic');
  props.editor.underline.value = selectedValues.includes('underline');
  props.editor.lineThrough.value = selectedValues.includes('lineThrough');
}
</script>
