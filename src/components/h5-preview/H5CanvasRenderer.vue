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
        :wrap="element.attributes.textInput.maxCharactersPerLine ? 'hard' : 'soft'"
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

import { resolveH5ElementType } from '../../services/h5-document.js';

const props = defineProps({
  document: { type: Object, required: true }
});

const inputValues = reactive({});

watch(
  () => props.document,
  initializeInputValues,
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
    writingMode: element.writingMode === 'y' ? 'vertical-rl' : undefined,
    objectFit: resolveH5ElementType(element) === 'image' ? element.objectFit ?? 'fill' : undefined,
    objectPosition: resolveH5ElementType(element) === 'image'
      ? element.objectPosition ?? 'center center'
      : undefined
  };
}

function updateTextInput(element, event) {
  const rules = element.attributes.textInput;
  const nextValue = applyTextRules(event.target.value, rules);
  inputValues[element.elementId] = nextValue;
  event.target.value = nextValue;
}

function applyTextRules(value, rules) {
  let result = String(value ?? '');

  if (!rules.allowManualNewline) result = result.replaceAll(/\r?\n/g, '');
  if (rules.characterSet === 'latin') result = result.replaceAll(/[^\x20-\x7E\r\n]/g, '');
  if (!rules.allowSymbols) result = result.replaceAll(/[^\p{L}\p{N}\s]/gu, '');
  if (rules.maxCharacters) result = truncateByWeightedLength(result, rules.maxCharacters);
  if (rules.maxCharactersPerLine) result = wrapByWeightedLength(result, rules.maxCharactersPerLine);
  if (rules.maxLines) result = result.split(/\r?\n/).slice(0, rules.maxLines).join('\n');

  return result;
}

function truncateByWeightedLength(value, maxLength) {
  let length = 0;
  let result = '';

  for (const character of value) {
    const characterLength = getWeightedCharacterLength(character);
    if (length + characterLength > maxLength) break;
    length += characterLength;
    result += character;
  }
  return result;
}

function wrapByWeightedLength(value, maxLength) {
  return value
    .split(/\r?\n/)
    .flatMap((line) => {
      const lines = [];
      let current = '';
      let length = 0;

      for (const character of line) {
        const characterLength = getWeightedCharacterLength(character);
        if (current && length + characterLength > maxLength) {
          lines.push(current);
          current = '';
          length = 0;
        }
        current += character;
        length += characterLength;
      }
      lines.push(current);
      return lines;
    })
    .join('\n');
}

function getWeightedCharacterLength(character) {
  return character.codePointAt(0) <= 0xff ? 1 : 2;
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
