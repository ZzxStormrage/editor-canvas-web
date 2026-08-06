<template>
  <main class="page">
    <section class="canvas-section" aria-label="生肖效果预览">
      <div v-if="documentData && !templateLoading" class="canvas-frame" :style="canvasFrameStyle">
        <CanvasDocumentViewport
          ref="canvasViewportRef"
          :document="canvasDocumentData"
          :fit-options="h5CanvasFitOptions"
          :load-options="h5CanvasLoadOptions"
          :zoom-limits="h5CanvasZoomLimits"
          @loaded="handleDocumentLoaded"
          @error="handleCanvasError"
        />
        <div v-if="!canvasLoaded" class="canvas-runtime-loading" role="status" aria-live="polite">
          <span class="save-spinner" aria-hidden="true"></span>
          <span>画布加载中...</span>
        </div>
      </div>
      <div v-else-if="templateLoading" class="canvas-loading" role="status" aria-live="polite">
        <span class="save-spinner" aria-hidden="true"></span>
        <span>模板加载中...</span>
      </div>
      <div v-else class="canvas-loading canvas-empty" role="alert">
        {{ templateError || '请提供有效的模板 ID。' }}
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
            <img :src="item.icon" alt="" class="animal-icon" />
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>

      <div class="field-section">
        <div class="section-heading">
          <h2>请输入生日</h2>
        </div>

        <div class="date-inputs">
          <label>
            <input
              :value="year"
              inputmode="numeric"
              placeholder="1990"
              @compositionstart="handleYearCompositionStart"
              @compositionend="handleYearCompositionEnd"
              @input="handleYearInput"
            />
          </label>
        </div>
      </div>
    </section>

    <footer class="submit-footer">
      <p v-if="saveStatus.type === 'error' && saveStatus.text" class="save-error" role="alert">
        {{ saveStatus.text }}
      </p>
      <button
        class="submit-button"
        type="button"
        :disabled="saving || redirecting || templateLoading || !documentData || !canvasLoaded"
        :aria-busy="saving || redirecting"
        @click="onSubmit"
      >
        {{ saving ? '保存中...' : '立即购买' }}
      </button>
    </footer>

    <div v-if="saving || redirecting" class="save-overlay" role="status" aria-live="assertive">
      <span class="save-spinner" aria-hidden="true"></span>
      <span>{{ saveProgressText }}</span>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import CanvasDocumentViewport from './components/CanvasDocumentViewport.vue'
import { useH5PageSave } from './composables/useH5PageSave.js'
import { useH5TemplateDocument } from './composables/useH5TemplateDocument.js'
import {
  applyTextInputRules,
  createH5TextInputController,
  normalizeTextInputRules
} from './services/text-input-rules.js'
import { createDocumentWithAttributeVisibility } from './services/document-visibility.js'

const type = ref(1)
const canvasViewportRef = ref(null)
const route = useRoute()
const year = ref('')
const yearRules = ref(normalizeTextInputRules({ maxCharacters: 20 }))
const canvasLoaded = ref(false)
const h5CanvasFitOptions = Object.freeze({
  padding: 0,
  viewportRatio: 1,
  expandZoomRange: true
})
const h5CanvasLoadOptions = Object.freeze({ interactive: false })
const h5CanvasZoomLimits = Object.freeze({ minRatio: 1, maxRatio: 1 })
const textInputController = createH5TextInputController()
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

const {
  documentData,
  templateLoading,
  templateError,
  handleCanvasError: handleTemplateCanvasError,
  loadTemplateFromRoute
} = useH5TemplateDocument({ errorLabel: 'Chinese zodiac' })
const {
  redirecting,
  saving,
  saveProgressText,
  saveStatus,
  resetSaveStatus,
  savePage
} = useH5PageSave({
  route,
  pageId: 'chinese-zodiac',
  defaultDesignName: '生肖定制',
  getEditor: getCanvasEditor
})

const selectedAnimal = computed(() => {
  return animalList.find((item) => item.type === type.value) ?? animalList[0]
})
const canvasDocumentData = computed(() => {
  return createDocumentWithAttributeVisibility(documentData.value, 'image.description', animalList[0].name)
})

const canvasFrameStyle = computed(() => {
  const width = Number(documentData.value?.canvas?.width)
  const height = Number(documentData.value?.canvas?.height)

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return {
      aspectRatio: '1 / 1'
    }
  }

  return {
    aspectRatio: `${width} / ${height}`
  }
})

function selectType(item) {
  type.value = item
  applySelectedAnimal()
}

/** @param {{ editor: Object }} payload 文档加载事件。 @returns {void} */
function handleDocumentLoaded(payload) {
  syncYearRulesFromDocument(payload.document)
  syncYearValueFromEditor(payload.editor)
  applySelectedAnimal(payload.editor)
  applyYearTextValue(payload.editor)
  canvasLoaded.value = true
  templateError.value = ''
}

/** @param {Event} event 输入事件。 @returns {void} */
function handleYearInput(event) {
  textInputController.handleInput(event, yearRules.value, (nextValue) => {
    year.value = nextValue
  })
}

/** @param {CompositionEvent} event 输入法组合开始事件。 @returns {void} */
function handleYearCompositionStart(event) {
  textInputController.handleCompositionStart(event)
}

/** @param {CompositionEvent} event 输入法组合结束事件。 @returns {void} */
function handleYearCompositionEnd(event) {
  textInputController.handleCompositionEnd(event, yearRules.value, (nextValue) => {
    year.value = nextValue
  })
}

/**
 * 处理统一文档资源加载失败。
 *
 * @param {*} error 画布加载错误。
 * @returns {void}
 */
function handleCanvasError(error) {
  canvasLoaded.value = false
  handleTemplateCanvasError(error)
}

/**
 * 通过核心 API 切换带 image.description 的可变图片。
 *
 * @param {Object | null} [editor] 核心编辑器实例。
 * @returns {void}
 */
function applySelectedAnimal(editor) {
  const activeEditor = editor ?? getCanvasEditor()
  activeEditor?.setElementsVisibilityByAttribute('image.description', selectedAnimal.value.name, {
    exclusive: true
  })
}

/**
 * 将年份输入值同步到描述匹配的文字元素。
 *
 * @param {Object | null} [editor] 核心编辑器实例。
 * @returns {void}
 */
function applyYearTextValue(editor) {
  const activeEditor = editor ?? getCanvasEditor()
  if (!activeEditor) {
    return
  }

  activeEditor.getElementsByAttribute('text.description', '年').forEach((element) => {
    activeEditor.replaceTextWithRules(element, year.value)
  })
}

/** @returns {Object | null} 当前画布编辑器实例。 */
function getCanvasEditor() {
  return canvasViewportRef.value?.getEditor?.() ?? null
}

/**
 * 从模板中读取年份文字，作为生产页面初始输入值。
 *
 * @param {Object | null} editor 核心编辑器实例。
 * @returns {void}
 */
function syncYearValueFromEditor(editor) {
  if (!editor) {
    return
  }

  const element = editor.getElementsByAttribute('text.description', '年')[0]
  if (element) {
    year.value = applyTextInputRules(element.text, yearRules.value)
  }
}

/**
 * 从模板 textInput 读取文字输入限制，未配置时回退到 maxCharacters: 20。
 *
 * @param {Object} document 已加载的统一文档。
 * @returns {void}
 */
function syncYearRulesFromDocument(document) {
  const element = flattenElements(document?.elements).find((item) => {
    return item.attributes?.text?.description === '年'
  })
  yearRules.value = normalizeTextInputRules(element?.attributes?.textInput ?? { maxCharacters: 20 })
}

/** @param {Object[] | undefined} elements 文档元素。 @returns {Object[]} 展平元素。 */
function flattenElements(elements) {
  if (!Array.isArray(elements)) {
    return []
  }

  return elements.flatMap((element) => [element, ...flattenElements(element.children)])
}

watch(year, () => {
  applyYearTextValue()
})

watch(
  () => [route.query.templateId, route.query.partnerId],
  () => {
    canvasLoaded.value = false
    resetSaveStatus()
    void loadTemplateFromRoute(route.query)
  },
  { immediate: true }
)

/** @returns {Promise<void>} 保存当前 JSON，并按需获取打印区域截图。 */
async function onSubmit() {
  if (
    saving.value || redirecting.value || templateLoading.value ||
    !documentData.value || !canvasLoaded.value
  ) {
    return
  }

  await savePage()
}
</script>

<style lang="scss" scoped>
.page {
  position: relative;
  display: flex;
  width: min(100%, 430px);
  height: 100vh;
  min-height: 0;
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: auto;
  flex-direction: column;
  color: #171717;
  background: #ffffff;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

.canvas-section {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  flex-direction: column;
  background: #f2f3f5;
}

.canvas-frame {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #eef0f2;
}

.canvas-frame :deep(.canvas-document-viewport) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.canvas-runtime-loading {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #525252;
  background: #ffffff;
  font-size: 13px;
}

.canvas-runtime-loading .save-spinner {
  border-color: #e5e5e5;
  border-top-color: #d61f35;
}

.canvas-loading {
  display: flex;
  width: 100%;
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #525252;
  background: #ffffff;
  font-size: 13px;
}

.canvas-loading .save-spinner {
  border-color: #e5e5e5;
  border-top-color: #d61f35;
}

.page-container {
  display: flex;
  min-height: 0;
  padding: 18px 16px 24px;
  overflow-y: auto;
  flex: 1 0 220px;
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
}

.date-inputs label {
  display: block;
}

.date-inputs input {
  width: 100%;
  height: 38px;
  padding: 0 10px;
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

.submit-footer {
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #ececec;
  flex: 0 0 auto;
  background: #ffffff;
}

.save-error {
  margin: 0 0 8px;
  color: #b42318;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
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
  .page-container {
    flex-basis: 200px;
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
