<template>
  <div
    class="h5-canvas"
    :style="{
      aspectRatio: `${document.canvas.width} / ${document.canvas.height}`,
      background: document.canvas.background || '#ffffff'
    }"
  >
    <template v-for="element in document.elements" :key="element.elementId || element.innerId">
      <textarea
        v-if="isEditableText(element)"
        :value="inputValues[element.elementId]"
        class="h5-element h5-text-input"
        :aria-label="element.attributes?.text?.description || element.name || '文本输入'"
        :data-description="element.attributes?.text?.description || undefined"
        :style="resolveElementStyle(element)"
        :wrap="resolveTextInputWrap(element)"
        @compositionstart="handleTextCompositionStart"
        @compositionend="handleTextCompositionEnd(element, $event)"
        @input="updateTextInput(element, $event)"
      />
      <div
        v-else-if="resolveH5ElementType(element) === 'text'"
        class="h5-element h5-text"
        :data-description="element.attributes?.text?.description || undefined"
        :style="resolveElementStyle(element)"
      >
        {{ element.text }}
      </div>
      <img
        v-else-if="resolveH5ElementType(element) === 'image'"
        class="h5-element h5-image"
        :src="element.url"
        :alt="element.attributes?.image?.description || element.name || ''"
        :style="resolveElementStyle(element)"
      />
      <div
        v-else
        class="h5-element h5-shape"
        :style="resolveElementStyle(element)"
      ></div>
    </template>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

import { loadDocumentFonts } from '../../canvas-editor-core/src/utils/font.js';
import { resolveH5ElementType } from '../../services/h5-document.js';
import { createH5TextInputController } from '../../views/h5-page/services/text-input-rules.js';

const props = defineProps({
  document: { type: Object, required: true }
});

const inputValues = reactive({});
const textInputController = createH5TextInputController();

watch(
  () => props.document,
  (document) => {
    initializeInputValues();
    void loadDocumentFonts(document?.elements).catch((error) => {
      console.warn('H5 document font loading failed.', error);
    });
  },
  { immediate: true, deep: true }
);

function initializeInputValues() {
  Object.keys(inputValues).forEach((key) => delete inputValues[key]);
  props.document.elements.forEach((element) => {
    if (isEditableText(element)) {
      inputValues[element.elementId] = String(element.text ?? '');
    }
  });
}

function isEditableText(element) {
  return resolveH5ElementType(element) === 'text' && element.attributes?.textInput?.enabled === true;
}

function resolveElementStyle(element) {
  const canvas = props.document.canvas;
  const width = Number(element.width ?? 0);
  const height = Number(element.height ?? estimateTextHeight(element));
  const transforms = [];

  if (Number(element.rotation)) transforms.push(`rotate(${Number(element.rotation)}deg)`);
  if (Number(element.skewX)) transforms.push(`skewX(${Number(element.skewX)}deg)`);
  if (Number(element.skewY)) transforms.push(`skewY(${Number(element.skewY)}deg)`);
  if (Number(element.scaleX ?? 1) !== 1 || Number(element.scaleY ?? 1) !== 1) {
    transforms.push(`scale(${Number(element.scaleX ?? 1)}, ${Number(element.scaleY ?? 1)})`);
  }

  return {
    left: toPercent(element.x, canvas.width),
    top: toPercent(element.y, canvas.height),
    width: toPercent(width, canvas.width),
    height: height ? toPercent(height, canvas.height) : 'auto',
    opacity: element.opacity ?? 1,
    transform: transforms.join(' ') || undefined,
    transformOrigin: element.origin || 'center center',
    color: resolveColor(element.fill, '#1f2937'),
    background: resolveH5ElementType(element) === 'shape' ? resolveColor(element.fill, 'transparent') : undefined,
    borderColor: resolveColor(element.stroke, 'transparent'),
    borderWidth: element.strokeWidth ? toCanvasUnit(element.strokeWidth, canvas.width) : undefined,
    borderRadius: resolveBorderRadius(element.cornerRadius, canvas.width),
    fontFamily: element.fontFamily,
    fontSize: toCanvasUnit(element.fontSize ?? 16, canvas.width),
    fontWeight: element.fontWeight,
    fontStyle: element.italic ? 'italic' : undefined,
    letterSpacing: toCanvasUnit(element.letterSpacing ?? 0, canvas.width),
    lineHeight: element.lineHeight ? String(Number(element.lineHeight) / Number(element.fontSize || 16)) : undefined,
    textAlign: element.textAlign,
    textDecoration: resolveTextDecoration(element.textDecoration),
    writingMode: isSingleVerticalLine(element) || element.writingMode === 'y' ? 'vertical-rl' : undefined,
    whiteSpace: isSingleVerticalLine(element) ? 'pre' : undefined,
    overflowWrap: isSingleVerticalLine(element) ? 'normal' : undefined,
    objectFit: resolveH5ElementType(element) === 'image' ? element.objectFit ?? 'fill' : undefined,
    objectPosition: resolveH5ElementType(element) === 'image'
      ? element.objectPosition ?? 'center center'
      : undefined
  };
}

/**
 * 获取 H5 文本输入框的换行策略。
 *
 * @param {Object} element 文本元素。
 * @returns {'off' | 'hard' | 'soft'} textarea 换行模式。
 */
function resolveTextInputWrap(element) {
  if (isSingleVerticalLine(element)) return 'off'
  return element.attributes?.textInput?.maxCharactersPerLine ? 'hard' : 'soft'
}

/**
 * 判断元素是否启用了 H5 单列竖行约束。
 *
 * @param {Object} element 文本元素。
 * @returns {boolean} 是否强制单列竖行。
 */
function isSingleVerticalLine(element) {
  return element.attributes?.textInput?.enabled === true
    && element.attributes.textInput.singleVerticalLine === true
}

function updateTextInput(element, event) {
  textInputController.handleInput(event, element.attributes.textInput, (nextValue) => {
    if (inputValues[element.elementId] !== nextValue) {
      inputValues[element.elementId] = nextValue;
    }
  });
}

function handleTextCompositionStart(event) {
  textInputController.handleCompositionStart(event);
}

function handleTextCompositionEnd(element, event) {
  textInputController.handleCompositionEnd(event, element.attributes.textInput, (nextValue) => {
    if (inputValues[element.elementId] !== nextValue) {
      inputValues[element.elementId] = nextValue;
    }
  });
}

function estimateTextHeight(element) {
  const lines = String(element.text ?? '').split('\n').length;
  return Number(element.lineHeight ?? element.fontSize ?? 16) * lines;
}

function toPercent(value, total) {
  return `${(Number(value ?? 0) / Number(total)) * 100}%`;
}

function toCanvasUnit(value, canvasWidth) {
  return `${(Number(value ?? 0) / Number(canvasWidth)) * 100}cqw`;
}

function resolveColor(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function resolveBorderRadius(value, canvasWidth) {
  const radius = Array.isArray(value) ? value[0] : value;
  return radius ? toCanvasUnit(radius, canvasWidth) : undefined;
}

function resolveTextDecoration(value) {
  if (value === 'under') return 'underline';
  if (value === 'delete') return 'line-through';
  if (value === 'under-delete') return 'underline line-through';
  return value === 'none' ? 'none' : value;
}
</script>
