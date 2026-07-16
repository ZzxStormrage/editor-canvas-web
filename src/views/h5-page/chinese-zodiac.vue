<template>
  <main class="page">
    <section class="canvas-section" aria-label="生肖效果预览">
      <div class="canvas-frame" :style="canvasFrameStyle">
        <CanvasDocumentViewport
          ref="canvasViewportRef"
          :document="documentData"
          @ready="handleCanvasReady"
          @loaded="handleDocumentLoaded"
        />
      </div>
    </section>

    <section class="page-container">
      <div class="field-section">
        <div class="section-heading">
          <h2>选择生肖</h2>
          <span>{{ selectedAnimal.name }}</span>
        </div>

        <div class="animal-grid">
          <button
            v-for="item in animalList"
            :key="item.type"
            type="button"
            class="animal-option"
            :class="{ 'is-selected': type === item.type }"
            :aria-pressed="type === item.type"
            @click="selectType(item.type)"
          >
            <img :src="resolveAnimalIcon(item)" alt="" class="animal-icon" />
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>

      <div class="field-section">
        <div class="section-heading">
          <h2>输入出生年月日</h2>
        </div>

        <div class="date-inputs">
          <label>
            <span>年</span>
            <input v-model="year" inputmode="numeric" maxlength="4" placeholder="1990" />
          </label>
          <label>
            <span>月</span>
            <input v-model="month" inputmode="numeric" maxlength="2" placeholder="01" />
          </label>
          <label>
            <span>日</span>
            <input v-model="day" inputmode="numeric" maxlength="2" placeholder="01" />
          </label>
        </div>

        <button class="advanced-edit" type="button" @click="onAdvancedEdit">高级编辑</button>
      </div>
    </section>

    <footer class="submit-footer">
      <p
        v-if="saveStatus.text"
        class="save-status"
        :class="`is-${saveStatus.type}`"
        role="status"
        aria-live="polite"
      >
        {{ saveStatus.text }}
      </p>
      <button
        class="submit-button"
        type="button"
        :disabled="saving"
        :aria-busy="saving"
        @click="onSubmit"
      >
        {{ saving ? '保存中...' : '立即购买' }}
      </button>
    </footer>

    <div v-if="saving" class="save-overlay" role="status" aria-live="assertive">
      <span class="save-spinner" aria-hidden="true"></span>
      <span>正在保存...</span>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'

import { pictureApi } from '../../api/index.js'
import CanvasDocumentViewport from '../../components/canvas-runtime/CanvasDocumentViewport.vue'

const type = ref(1)
const canvasViewportRef = ref(null)
const year = ref('1990')
const month = ref('01')
const day = ref('01')
const saving = ref(false)
const saveStatus = ref({ type: 'success', text: '' })

const animalList = [
  { type: 1, name: '鼠', icon: 'https://xiaoxiang.ele007.com/file/image/animal1.png' },
  { type: 2, name: '牛', icon: 'https://xiaoxiang.ele007.com/file/image/animal2.png' },
  { type: 3, name: '虎', icon: 'https://xiaoxiang.ele007.com/file/image/animal3.png' },
  { type: 4, name: '兔', icon: 'https://xiaoxiang.ele007.com/file/image/animal4.png' },
  { type: 5, name: '龙', icon: 'https://xiaoxiang.ele007.com/file/image/animal5.png' },
  { type: 6, name: '蛇', icon: 'https://xiaoxiang.ele007.com/file/image/animal6.png' },
  { type: 7, name: '马', icon: 'https://xiaoxiang.ele007.com/file/image/animal7.png' },
  { type: 8, name: '羊', icon: 'https://xiaoxiang.ele007.com/file/image/animal8.png' },
  { type: 9, name: '猴', icon: 'https://xiaoxiang.ele007.com/file/image/animal9.png' },
  { type: 10, name: '鸡', icon: 'https://xiaoxiang.ele007.com/file/image/animal10.png' },
  { type: 11, name: '狗', icon: 'https://xiaoxiang.ele007.com/file/image/animal11.png' },
  { type: 12, name: '猪', icon: 'https://xiaoxiang.ele007.com/file/image/animal12.png' }
]

const documentData = {
  version: 1,
  canvas: {
    width: 1024,
    height: 1024,
    background: '#ffffff'
  },
  elements: [
    {
      tag: 'Image',
      url: 'https://ele-aiketie.ele007.com/yinxiang/202607/466cce2b-2aac-4bab-b77c-9381657bd494.png',
      visible: true,
      x: 147.33227344992054,
      y: 102.39999999999998,
      width: 729.3354531001589,
      height: 819.2,
      lockRatio: true,
      draggable: true,
      editable: true,
      opacity: 1,
      elementId: 'OVXQnrMQiaiF_-SCPCCih',
      attributes: {
        image: {
          description: '羊'
        }
      },
      objectFit: 'fill',
      objectPosition: 'center center'
    },
    {
      tag: 'Image',
      url: 'https://ele-aiketie.ele007.com/yinxiang/202607/909ae1dd-543c-4534-ab10-b22cfc79cf74.png',
      name: '背景图',
      visible: true,
      locked: true,
      x: 0,
      y: 0,
      width: 1024,
      height: 1024,
      lockRatio: false,
      draggable: true,
      editable: true,
      hittable: false,
      hitChildren: false,
      hitSelf: false,
      opacity: 1,
      elementId: 'NZ-1V9ORNTtUlFkz3NyT7',
      attributes: {
        image: {
          role: 'background'
        }
      },
      objectFit: 'fill',
      objectPosition: 'center center'
    },
    {
      tag: 'Image',
      url: 'https://ele-aiketie.ele007.com/yinxiang/202607/3cf1025c-78da-4114-ae1f-3729191ce83b.png',
      visible: true,
      x: 102.39999999999998,
      y: 102.39999999999995,
      width: 819.2,
      height: 819.2,
      lockRatio: true,
      draggable: true,
      editable: true,
      opacity: 1,
      elementId: 'OY8qERyz18IC7itPqFEYA',
      attributes: {
        image: {
          description: '鼠'
        }
      },
      objectFit: 'fill',
      objectPosition: 'center center'
    },
    {
      tag: 'Image',
      url: 'https://ele-aiketie.ele007.com/yinxiang/202607/5aaa01ee-5b10-4be7-8caf-854ec2ae1000.png',
      name: '遮罩图',
      visible: true,
      locked: true,
      x: 0,
      y: 0,
      width: 1024,
      height: 1024,
      lockRatio: false,
      draggable: true,
      editable: true,
      hittable: false,
      hitChildren: false,
      hitSelf: false,
      opacity: 1,
      elementId: 'JoN9kNTGXcqCxBpHhBvFr',
      attributes: {
        image: {
          role: 'mask'
        }
      },
      objectFit: 'fill',
      objectPosition: 'center center'
    },
    {
      tag: 'Rect',
      name: '打印区域',
      x: 136.99999999999994,
      y: 138.00000000000006,
      width: 750,
      height: 750,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      lockRatio: false,
      draggable: true,
      editable: true,
      fill: 'rgba(124, 58, 237, 0.14)',
      stroke: '#7c3aed',
      strokeWidth: 2,
      editConfig: {
        editSize: 'size',
        lockRatio: false,
        rotateable: false,
        skewable: false
      },
      opacity: 1,
      elementId: 'KnIf1dUhBMV-1VMOsxuaF',
      attributes: {}
    }
  ]
}

const selectedAnimal = computed(() => {
  return animalList.find((item) => item.type === type.value) ?? animalList[0]
})

const describedImageMap = computed(() => {
  return new Map(
    documentData.elements
      .map((element) => [getImageDescription(element), element])
      .filter(([description]) => description)
  )
})

const canvasFrameStyle = computed(() => {
  const width = Number(documentData.canvas.width)
  const height = Number(documentData.canvas.height)

  return {
    '--canvas-ratio': width / height,
    aspectRatio: `${width} / ${height}`
  }
})

function getImageDescription(element) {
  return typeof element.attributes?.image?.description === 'string' ? element.attributes.image.description.trim() : ''
}

function resolveAnimalIcon(item) {
  return describedImageMap.value.get(item.name)?.url || item.icon
}

function selectType(item) {
  type.value = item
  applySelectedAnimal()
}

/** @param {Object} editor 核心编辑器实例。 @returns {void} */
function handleCanvasReady(editor) {
  applySelectedAnimal(editor)
}

/** @param {{ editor: Object }} payload 文档加载事件。 @returns {void} */
function handleDocumentLoaded(payload) {
  payload.editor.arrangeLayersByRole({
    back: ['background'],
    front: ['mask']
  })
  applySelectedAnimal(payload.editor)
}

/**
 * 通过核心 API 切换带 image.description 的可变图片。
 *
 * @param {Object | null} [editor] 核心编辑器实例。
 * @returns {void}
 */
function applySelectedAnimal(editor = canvasViewportRef.value?.getEditor?.()) {
  editor?.setElementsVisibilityByAttribute('image.description', selectedAnimal.value.name, {
    exclusive: true
  })
}

function onAdvancedEdit() {
  // TODO: 高级编辑
}

/** @returns {Promise<void>} 保存当前 JSON，并按需获取打印区域截图。 */
async function onSubmit() {
  if (saving.value) {
    return
  }

  saving.value = true
  saveStatus.value = { type: 'success', text: '' }

  try {
    const savePayload = await createSavePayload(canvasViewportRef.value?.getEditor?.())
    console.log('生肖页面保存数据：', JSON.stringify(savePayload, null, 2))
    saveStatus.value = { type: 'success', text: '保存数据已生成' }
  } catch (error) {
    console.error('Chinese zodiac save failed.', error)
    saveStatus.value = { type: 'error', text: error.message || '保存失败，请稍后重试。' }
  } finally {
    saving.value = false
  }
}

/**
 * @param {Object | null} editor 核心编辑器实例。
 * @returns {Promise<{ editorJson: Object, printAreaImage: string | null }>} 页面保存数据。
 */
async function createSavePayload(editor) {
  if (!editor) {
    throw new Error('画布尚未加载完成。')
  }

  const editorJson = editor.exportDocument()
  if (!editorJson) {
    throw new Error('无法获取当前画布 JSON。')
  }

  const printAreaImage = editor.getPrintAreaProperties()
    ? await capturePrintAreaImage(editor)
    : null

  return { editorJson, printAreaImage }
}

/**
 * @param {Object} editor 核心编辑器实例。
 * @returns {Promise<string>} 打印区域截图上传地址。
 */
function capturePrintAreaImage(editor) {
  return editor.capturePrintArea({
    includeBackground: false,
    includeMask: false,
    type: 'image/png',
    quality: 1,
    upload: (file) => pictureApi.upload(file)
  })
}
</script>

<style lang="scss" scoped>
.page {
  position: relative;
  display: flex;
  width: 100%;
  height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  flex-direction: column;
  color: #171717;
  background: #ffffff;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

.canvas-section {
  --preview-max-height: clamp(210px, 42dvh, 380px);

  display: flex;
  min-height: 0;
  padding: 12px 16px;
  align-items: center;
  justify-content: center;
  flex: 0 1 auto;
  background: #f2f3f5;
}

.canvas-frame {
  width: min(100%, calc(var(--preview-max-height) * var(--canvas-ratio)));
  max-height: var(--preview-max-height);
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.12);
}

.canvas-frame :deep(.canvas-document-viewport) {
  width: 100%;
  height: 100%;
}

.page-container {
  display: flex;
  min-height: 0;
  padding: 18px 16px 24px;
  overflow-y: auto;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 22px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.field-section {
  display: grid;
  gap: 12px;
}

.section-heading {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h2 {
  margin: 0;
  color: #171717;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
}

.section-heading > span {
  color: #bd1e2c;
  font-size: 12px;
  font-weight: 700;
}

.animal-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.animal-option {
  display: flex;
  min-width: 0;
  min-height: 58px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  color: #525252;
  background: #f2f3f5;
  font: inherit;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    color 180ms ease,
    background-color 180ms ease;
}

.animal-option:hover {
  color: #262626;
  background: #e7e8eb;
}

.animal-option.is-selected {
  border-color: #c92a38;
  color: #b51f2d;
  background: #ffffff;
}

.animal-option:focus-visible,
.advanced-edit:focus-visible,
.submit-button:focus-visible,
.date-inputs input:focus-visible {
  outline: 2px solid #c92a38;
  outline-offset: 2px;
}

.animal-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.animal-option span {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.date-inputs {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 8px;
}

.date-inputs label {
  position: relative;
  display: block;
}

.date-inputs label > span {
  position: absolute;
  top: 50%;
  right: 10px;
  color: #737373;
  font-size: 12px;
  pointer-events: none;
  transform: translateY(-50%);
}

.date-inputs input {
  width: 100%;
  height: 38px;
  padding: 0 30px 0 10px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  outline: none;
  color: #171717;
  background: #ffffff;
  font: inherit;
  font-size: 14px;
}

.date-inputs input::placeholder {
  color: #737373;
}

.advanced-edit {
  justify-self: end;
  padding: 2px 0;
  border: 0;
  color: #666666;
  background: transparent;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.advanced-edit:hover {
  color: #b51f2d;
}

.submit-footer {
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #ececec;
  flex: 0 0 auto;
  background: #ffffff;
}

.save-status {
  margin: 0 0 8px;
  color: #237a42;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}

.save-status.is-error {
  color: #b42318;
}

.submit-button {
  width: 100%;
  height: 46px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  color: #ffffff;
  background: #d61f35;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 180ms ease;
}

.submit-button:hover {
  background: #bb172b;
}

.submit-button:active {
  background: #a81224;
}

.submit-button:disabled {
  background: #a3a3a3;
  cursor: not-allowed;
}

.save-overlay {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: #ffffff;
  background: rgba(23, 23, 23, 0.68);
  font-size: 14px;
  font-weight: 700;
}

.save-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.36);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: save-spinner-rotate 700ms linear infinite;
}

@keyframes save-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 600px) {
  .page {
    max-width: 430px;
    box-shadow: 0 0 0 1px #e5e7eb;
  }
}

@media (max-height: 640px) {
  .canvas-section {
    --preview-max-height: 210px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animal-option,
  .submit-button {
    transition: none;
  }

  .save-spinner {
    animation-duration: 1400ms;
  }
}
</style>
