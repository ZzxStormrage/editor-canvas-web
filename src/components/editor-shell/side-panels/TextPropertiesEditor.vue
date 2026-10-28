<template>
  <section class="panel-section text-panel">
    <PanelGroup>
      <v-text-field v-model="editor.textValue.value" label="文字内容" />
      <div class="font-picker">
        <label class="font-picker__label">字体</label>
        <v-menu v-model="fontMenuOpen" :close-on-content-click="false" location="bottom start" offset="6">
          <template #activator="{ props: activatorProps }">
            <v-btn
              v-bind="activatorProps"
              block
              class="font-picker__trigger"
              color="control"
              variant="outlined"
              :aria-label="`字体：${selectedFont?.fontName || '请选择'}`"
            >
              <span class="font-picker__selection">
                <img
                  v-if="selectedFont?.imageUrl"
                  class="font-picker__selection-image"
                  :src="selectedFont.imageUrl"
                  :alt="selectedFont.fontName"
                />
                <span v-else class="font-picker__selection-text">
                  {{ selectedFont?.fontName || '选择字体' }}
                </span>
              </span>
              <v-progress-circular
                v-if="editor.fontListLoading.value"
                color="primary"
                indeterminate
                size="16"
                width="2"
              />
              <v-icon v-else :icon="fontMenuOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" />
            </v-btn>
          </template>

          <div class="font-picker__menu" role="listbox" aria-label="字体">
            <v-virtual-scroll
              v-if="editor.fontOptions.length"
              class="font-picker__virtual-list"
              :items="editor.fontOptions"
              height="330"
              :item-height="52"
            >
              <template #default="{ item: font }">
                <button
                  :key="font.id ?? font.fontName"
                  type="button"
                  class="font-picker__option"
                  :class="{ 'font-picker__option--selected': font.fontName === editor.fontFamily.value }"
                  role="option"
                  :aria-selected="font.fontName === editor.fontFamily.value"
                  @click="selectFont(font)"
                >
                  <img
                    v-if="font.imageUrl"
                    class="font-picker__option-image"
                    :src="font.imageUrl"
                    :alt="font.fontName"
                    loading="lazy"
                  />
                  <span v-else class="font-picker__option-name">{{ font.fontName }}</span>
                  <v-icon
                    v-if="font.fontName === editor.fontFamily.value"
                    class="font-picker__option-check"
                    color="primary"
                    icon="mdi-check"
                    size="16"
                  />
                </button>
              </template>
            </v-virtual-scroll>
            <div v-else-if="!editor.fontListLoading.value" class="font-picker__empty">暂无字体</div>
          </div>
        </v-menu>
      </div>
    </PanelGroup>

    <PanelGroup>
      <PanelSliderField v-model="editor.fontSize.value" label="字号" :max="1000" :min="8" :value-width="128" />
      <PanelSegmentedControl v-model="editor.fontWeight.value" aria-label="字重" :options="fontWeightOptions" />
    </PanelGroup>

    <PanelGroup>
      <PanelSegmentedControl v-model="styleSelections" aria-label="文字样式" multiple :options="styleOptions" />

      <v-color-input v-model="editor.textColor.value" class="text-color-input" label="文字颜色">
        <template #append-inner>
          <span class="color-input-icon" aria-hidden="true">
            <span class="color-input-icon__swatch" :style="{ backgroundColor: editor.textColor.value }"></span>
          </span>
        </template>
      </v-color-input>
    </PanelGroup>

    <PanelGroup>
      <div class="setting-row">
        <label>对齐</label>
        <PanelSegmentedControl v-model="editor.textAlign.value" aria-label="文字对齐" :options="alignOptions" />
      </div>

      <div class="setting-row">
        <label>方向</label>
        <PanelSegmentedControl v-model="editor.writingMode.value" aria-label="文字方向" :options="writingModeOptions" />
      </div>
    </PanelGroup>

    <PanelGroup>
      <PanelSliderField v-model="editor.letterSpacing.value" label="字距" :max="120" :min="0" />
      <PanelSliderField v-model="editor.lineHeight.value" label="行高" :max="300" :min="8" />
    </PanelGroup>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

import PanelGroup from '../PanelGroup.vue'
import PanelSegmentedControl from '../PanelSegmentedControl.vue'
import PanelSliderField from '../PanelSliderField.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})
const fontMenuOpen = ref(false)
const selectedFont = computed(() => {
  return props.editor.fontOptions.find((font) => font.fontName === props.editor.fontFamily.value) ?? null
})

onMounted(() => {
  props.editor.loadFontList()
})

watch(fontMenuOpen, (isOpen) => {
  if (isOpen) {
    props.editor.loadFontList()
  }
})

const fontWeightOptions = [
  { label: '常规', value: '400' },
  { label: '中等', value: '500' },
  { label: '加粗', value: '700' }
]

const styleOptions = [
  { label: '斜体', value: 'italic', icon: 'mdi-format-italic', iconOnly: true },
  { label: '下划线', value: 'underline', icon: 'mdi-format-underline', iconOnly: true },
  { label: '删除线', value: 'lineThrough', icon: 'mdi-format-strikethrough', iconOnly: true }
]

const alignOptions = [
  { label: '左对齐', value: 'left', icon: 'mdi-format-align-left', iconOnly: true },
  { label: '居中', value: 'center', icon: 'mdi-format-align-center', iconOnly: true },
  { label: '右对齐', value: 'right', icon: 'mdi-format-align-right', iconOnly: true }
]

const writingModeOptions = [
  { label: '横版', value: 'x' },
  { label: '竖版', value: 'y' }
]

const styleSelections = computed({
  get: getStyleSelections,
  set: setStyleSelections
})

function selectFont(font) {
  props.editor.fontFamily.value = font.fontName
  fontMenuOpen.value = false
}

function getStyleSelections() {
  const selections = []
  if (props.editor.italic.value) selections.push('italic')
  if (props.editor.underline.value) selections.push('underline')
  if (props.editor.lineThrough.value) selections.push('lineThrough')
  return selections
}

function setStyleSelections(values) {
  const selectedValues = Array.isArray(values) ? values : []
  props.editor.italic.value = selectedValues.includes('italic')
  props.editor.underline.value = selectedValues.includes('underline')
  props.editor.lineThrough.value = selectedValues.includes('lineThrough')
}
</script>
