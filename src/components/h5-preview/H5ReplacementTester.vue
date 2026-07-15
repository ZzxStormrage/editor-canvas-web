<template>
  <section class="h5-replacement-tester" aria-labelledby="h5-replacement-title">
    <header class="h5-replacement-header">
      <div>
        <span>运行时 API</span>
        <h2 id="h5-replacement-title">替换功能测试</h2>
      </div>
      <small>保持原位置与外框</small>
    </header>

    <p
      v-if="status.text"
      class="h5-replacement-status"
      :class="`h5-replacement-status--${status.type}`"
      role="status"
    >
      {{ status.text }}
    </p>

    <div class="h5-replacement-fields">
      <div class="h5-replacement-field">
        <label for="h5-image-element">图片元素</label>
        <div class="h5-replacement-control">
          <select
            id="h5-image-element"
            v-model="selectedImageId"
            :disabled="imageElements.length === 0 || replacingImage"
          >
            <option v-if="imageElements.length === 0" value="">暂无图片元素</option>
            <option
              v-for="(element, index) in imageElements"
              :key="element.elementId"
              :value="element.elementId"
            >
              {{ getElementLabel(element, index, '图片') }}
            </option>
          </select>
          <button
            type="button"
            :disabled="!selectedImageId || replacingImage"
            @click="openImagePicker"
          >
            {{ replacingImage ? '替换中' : '替换图片' }}
          </button>
        </div>
        <input
          ref="imagePicker"
          type="file"
          accept="image/*"
          tabindex="-1"
          hidden
          @change="replaceImage"
        />
      </div>

      <div class="h5-replacement-field">
        <label for="h5-text-element">文本元素</label>
        <select
          id="h5-text-element"
          v-model="selectedTextId"
          :disabled="textElements.length === 0"
        >
          <option v-if="textElements.length === 0" value="">暂无文本元素</option>
          <option
            v-for="(element, index) in textElements"
            :key="element.elementId"
            :value="element.elementId"
          >
            {{ getElementLabel(element, index, '文本') }}
          </option>
        </select>
        <div class="h5-replacement-control">
          <input
            id="h5-text-content"
            v-model="textContent"
            type="text"
            aria-label="新的文字内容"
            :disabled="!selectedTextId"
            placeholder="输入新的文字内容"
            @keyup.enter="replaceText"
          />
          <button type="button" :disabled="!selectedTextId" @click="replaceText">
            替换文字
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import {
  replaceH5Image,
  replaceH5Text,
  resolveH5ElementType
} from '../../services/h5-document.js';

const props = defineProps({
  document: { type: Object, required: true }
});

const emit = defineEmits(['update:document']);
const imagePicker = ref(null);
const selectedImageId = ref('');
const selectedTextId = ref('');
const textContent = ref('');
const replacingImage = ref(false);
const status = ref({ type: 'success', text: '' });

const imageElements = computed(() => getElementsByType('image'));
const textElements = computed(() => getElementsByType('text'));

watch(imageElements, syncImageSelection, { immediate: true });
watch(textElements, syncTextSelection, { immediate: true });
watch(selectedTextId, syncTextContent);

function getElementsByType(type) {
  return props.document.elements.filter((element) => {
    return element.elementId && resolveH5ElementType(element) === type;
  });
}

function syncImageSelection(elements) {
  if (!elements.some((element) => element.elementId === selectedImageId.value)) {
    selectedImageId.value = elements[0]?.elementId ?? '';
  }
}

function syncTextSelection(elements) {
  if (!elements.some((element) => element.elementId === selectedTextId.value)) {
    selectedTextId.value = elements[0]?.elementId ?? '';
  }
  syncTextContent();
}

function syncTextContent() {
  const element = textElements.value.find((item) => item.elementId === selectedTextId.value);
  textContent.value = String(element?.text ?? '');
}

function getElementLabel(element, index, fallback) {
  const description = element.attributes?.image?.description
    ?? element.attributes?.text?.description;
  const content = resolveH5ElementType(element) === 'text' ? element.text : description;
  const normalizedContent = String(content ?? '').replace(/\s+/g, ' ').trim();
  return normalizedContent.slice(0, 18) || `${fallback} ${index + 1}`;
}

function openImagePicker() {
  status.value = { type: 'success', text: '' };
  imagePicker.value?.click();
}

async function replaceImage(event) {
  const file = event.target.files?.[0];
  if (!file || !selectedImageId.value) return;

  replacingImage.value = true;
  status.value = { type: 'success', text: '' };

  try {
    const nextDocument = await replaceH5Image(
      props.document,
      selectedImageId.value,
      file
    );
    emit('update:document', nextDocument);
    status.value = { type: 'success', text: '图片替换成功，元素外框未改变。' };
  } catch (error) {
    status.value = { type: 'error', text: error.message || '图片替换失败。' };
  } finally {
    replacingImage.value = false;
    event.target.value = '';
  }
}

function replaceText() {
  if (!selectedTextId.value) return;

  try {
    const nextDocument = replaceH5Text(
      props.document,
      selectedTextId.value,
      textContent.value
    );
    emit('update:document', nextDocument);
    status.value = { type: 'success', text: '文字替换成功，原样式已保留。' };
  } catch (error) {
    status.value = { type: 'error', text: error.message || '文字替换失败。' };
  }
}
</script>
