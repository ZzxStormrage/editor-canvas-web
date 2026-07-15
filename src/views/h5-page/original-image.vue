<template>
  <main class="page">
    <section class="web-view" aria-label="原图定制预览">
      <H5CanvasRenderer :document="documentData" />
    </section>

    <section class="page-container">
      <h2 class="title">上传照片</h2>
      <div class="upload-row">
        <div class="upload-preview">
          <img v-if="imageUrl" :src="imageUrl" alt="已上传照片" />
          <span v-else class="image-placeholder" aria-hidden="true">▧</span>
        </div>
        <label class="switch-button">
          <input type="file" accept="image/*" @change="handleUpload" />
          {{ imageUrl ? '切换图片' : '选择图片' }}
        </label>
      </div>

      <h2 class="title">输入文字</h2>
      <input v-model="caption" class="text-input" type="text" placeholder="自定义输入" maxlength="30" />

      <button class="edit-link" type="button" @click="editPreview">高级编辑</button>
      <button class="submit-button" type="button" @click="submit">立即购买</button>
    </section>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue'
import H5CanvasRenderer from '../../components/h5-preview/H5CanvasRenderer.vue'
import { applyH5Document } from '../../services/h5-document.js'
import '../../assets/scss/h5-preview.scss'

const imageUrl = ref('')
const caption = ref('')
const documentData = ref({
  version: 1,
  canvas: { width: 332, height: 418, background: '#d9d9d9' },
  elements: [
    { tag: 'Rect', x: 0, y: 0, width: 332, height: 418, fill: '#d9d9d9', elementId: 'original-bg' },
    {
      tag: 'Text',
      type: 'caption',
      text: '',
      x: 20,
      y: 188,
      width: 292,
      fill: '#ffffff',
      fontFamily: '"PingFang SC"',
      fontSize: 28,
      lineHeight: 36,
      textAlign: 'center',
      verticalAlign: 'top',
      draggable: true,
      editable: true,
      elementId: 'original-caption'
    }
  ]
})

watch(caption, (text) => updateCaption(text))

function updateCaption(text) {
  const next = {
    ...documentData.value,
    elements: documentData.value.elements.map((item) => (item.type === 'caption' ? { ...item, text } : item))
  }
  documentData.value = applyH5Document(JSON.stringify(next))
}

function handleUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    imageUrl.value = String(reader.result)
    const next = {
      ...documentData.value,
      elements: documentData.value.elements.map((item) =>
        item.elementId === 'original-bg' ? { ...item, tag: 'Image', url: imageUrl.value, fill: undefined } : item
      )
    }
    documentData.value = applyH5Document(JSON.stringify(next))
  }
  reader.readAsDataURL(file)
}

function editPreview() {
  document.querySelector('.web-view')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function submit() {
  applyH5Document(JSON.stringify(documentData.value))
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 0 24px 40px;
  color: #111;
  background: #fff;
  font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.web-view {
  display: flex;
  width: 220px;
  height: 220px;
  margin: 14px auto 34px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background: #d9d9d9;
}
.web-view :deep(.h5-canvas) {
  flex: 0 0 auto;
  width: auto;
  height: 100%;
}
.page-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.title {
  margin: 0;
  padding-left: 8px;
  border-left: 3px solid #dd2032;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-left: 58px;
}
.upload-preview {
  display: flex;
  width: 83px;
  height: 83px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background: #d9d9d9;
}
.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-placeholder {
  color: #999;
  font-size: 24px;
}
.switch-button {
  display: inline-flex;
  height: 24px;
  padding: 0 11px;
  align-items: center;
  border: 1px solid #dd2032;
  border-radius: 4px;
  color: #dd2032;
  font-size: 12px;
  cursor: pointer;
}
.switch-button input {
  display: none;
}
.text-input {
  box-sizing: border-box;
  width: 100%;
  height: 25px;
  padding: 0 9px;
  border: 1px solid #c9c9c9;
  border-radius: 5px;
  font: inherit;
  font-size: 12px;
  outline: none;
}
.text-input:focus {
  border-color: #dd2032;
}
.edit-link {
  align-self: flex-end;
  margin-top: 108px;
  padding: 0;
  border: 0;
  color: #333;
  background: transparent;
  font-size: 11px;
  text-decoration: underline;
  cursor: pointer;
}
.submit-button {
  width: 100%;
  height: 38px;
  margin-top: -2px;
  border: 0;
  border-radius: 4px;
  color: #fff;
  background: #e4002b;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.submit-button:focus-visible,
.switch-button:focus-within {
  outline: 2px solid #dd2032;
  outline-offset: 2px;
}
@media (min-width: 750px) {
  .page {
    width: 375px;
    margin: 0 auto;
  }
}
</style>
