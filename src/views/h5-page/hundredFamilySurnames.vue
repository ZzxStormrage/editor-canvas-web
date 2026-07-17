<template>
  <main class="page">
    <section class="canvas-section" aria-label="百家姓效果预览">
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
          <span class="heading-marker" aria-hidden="true"></span>
          <h2>输入姓氏/名字</h2>
        </div>

        <div class="name-fields">
          <label>
            <span>姓氏（必填）</span>
            <input
              v-model.trim="surname"
              type="text"
              maxlength="2"
              autocomplete="family-name"
              placeholder="请输入姓氏，如：王"
              aria-required="true"
            />
          </label>
          <label>
            <span>名字（选填）</span>
            <input
              v-model.trim="givenName"
              type="text"
              maxlength="4"
              autocomplete="given-name"
              placeholder="请输入名字，如：小明"
            />
          </label>
        </div>
      </div>

      <div class="field-section">
        <div class="section-heading">
          <span class="heading-marker" aria-hidden="true"></span>
          <h2>选择字体风格</h2>
        </div>

        <div v-if="fontStylesLoading" class="font-grid" aria-label="字体风格加载中" aria-busy="true">
          <span v-for="index in 4" :key="index" class="font-skeleton"></span>
        </div>
        <p v-else-if="fontStylesError" class="font-error" role="alert">
          {{ fontStylesError }}
        </p>
        <div v-else class="font-grid" role="group" aria-label="字体风格">
          <button
            v-for="style in fontStyles"
            :key="style.id"
            type="button"
            class="font-option"
            :class="{ 'is-selected': selectedFontId === style.id }"
            :aria-pressed="selectedFontId === style.id"
            :title="style.fontName"
            @click="selectFontStyle(style.id)"
          >
            <span class="font-sample" :style="{ fontFamily: toCssFontFamily(style.fontName) }">王</span>
            <span>{{ style.displayName }}</span>
          </button>
        </div>

        <button class="advanced-edit" type="button" @click="onAdvancedEdit">高级编辑</button>
      </div>
    </section>

    <footer class="submit-footer">
      <p v-if="saveStatus.text" class="save-status" :class="`is-${saveStatus.type}`" role="status">
        {{ saveStatus.text }}
      </p>
      <button
        class="submit-button"
        type="button"
        :disabled="saving || !surname"
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
import { computed, onMounted, ref, watch } from 'vue'

import { customerPictureApi } from '../../api/index.js'
import { loadFontFace } from '../../canvas-editor-core/src/index.js'
import CanvasDocumentViewport from '../../components/canvas-runtime/CanvasDocumentViewport.vue'

const BACKGROUND_IMAGE_URL =
  'https://ele-aiketie.ele007.com/yinxiang/202607/ba7f4d19-5ec2-4b01-9a33-900e292660eb.jpg'
const FONT_STYLE_MOCKS = [
  {
    id: 'jinshu',
    displayName: '锦书',
    fontName: '字由点字桃花诗体',
    fontUrl: 'https://ec-sh.oss-cn-beijing.aliyuncs.com/items/font/202301/119c5985a4cd4dc49b27d55c6a9f4b06.ttf'
  },
  {
    id: 'song',
    displayName: '宋体',
    fontName: '字由点字典宋',
    fontUrl: 'https://ec-sh.oss-cn-beijing.aliyuncs.com/items/font/202302/389ce07001904657ba2ff371076fdf55.ttf'
  },
  {
    id: 'hei',
    displayName: '黑体',
    fontName: '字由点字典黑55J',
    fontUrl: 'https://ec-sh.oss-cn-beijing.aliyuncs.com/items/font/202301/f2ca136502894883bd2390a60f66a3c2.ttf'
  },
  {
    id: 'xingshu',
    displayName: '行书',
    fontName: '字由点字淡墨行楷',
    fontUrl: 'https://ec-sh.oss-cn-beijing.aliyuncs.com/items/font/202301/3e6dc58b785d499e9c5545344f3917f2.ttf'
  }
]
const DEFAULT_FONT_STYLE = FONT_STYLE_MOCKS[0]

const canvasViewportRef = ref(null)
const surname = ref('王')
const givenName = ref('小明')
const fontStyles = ref([])
const selectedFontId = ref(DEFAULT_FONT_STYLE.id)
const fontStylesLoading = ref(false)
const fontStylesError = ref('')
const saving = ref(false)
const saveStatus = ref({ type: 'success', text: '' })
const nameTextBindings = [
  { description: '姓', value: surname },
  { description: '名', value: givenName }
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
      url: BACKGROUND_IMAGE_URL,
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
      elementId: 'hundred-family-background',
      attributes: {
        image: {
          role: 'background'
        }
      },
      objectFit: 'fill',
      objectPosition: 'center center'
    },
    {
      tag: 'Text',
      name: '姓氏',
      text: surname.value,
      fontFamily: DEFAULT_FONT_STYLE.fontName,
      fontUrl: DEFAULT_FONT_STYLE.fontUrl,
      fontSize: 164,
      fontWeight: 400,
      fill: '#c3262e',
      textAlign: 'center',
      verticalAlign: 'top',
      textDecoration: 'none',
      letterSpacing: 0,
      lineHeight: 190,
      writingMode: 'x',
      width: 280,
      x: 372,
      y: 78,
      locked: true,
      draggable: true,
      editable: true,
      opacity: 1,
      editConfig: {
        editSize: 'font-size'
      },
      elementId: 'hundred-family-surname',
      attributes: {
        text: {
          description: '姓'
        }
      }
    },
    {
      tag: 'Text',
      name: '名字',
      text: givenName.value,
      fontFamily: DEFAULT_FONT_STYLE.fontName,
      fontUrl: DEFAULT_FONT_STYLE.fontUrl,
      fontSize: 84,
      fontWeight: 400,
      fill: '#262626',
      textAlign: 'center',
      verticalAlign: 'top',
      textDecoration: 'none',
      letterSpacing: 6,
      lineHeight: 106,
      writingMode: 'x',
      width: 420,
      x: 302,
      y: 286,
      locked: true,
      draggable: true,
      editable: true,
      opacity: 1,
      editConfig: {
        editSize: 'font-size'
      },
      elementId: 'hundred-family-given-name',
      attributes: {
        text: {
          description: '名'
        }
      }
    }
  ]
}

const selectedFontStyle = computed(() => {
  return fontStyles.value.find((style) => style.id === selectedFontId.value) ?? DEFAULT_FONT_STYLE
})

const canvasFrameStyle = computed(() => {
  const width = Number(documentData.canvas.width)
  const height = Number(documentData.canvas.height)

  return {
    '--canvas-ratio': width / height,
    aspectRatio: `${width} / ${height}`
  }
})

/** @returns {Promise<Object[]>} 模拟字体风格列表接口。 */
async function fetchFontStyles() {
  return FONT_STYLE_MOCKS.map((style) => ({ ...style }))
}

/** @returns {Promise<void>} 加载模拟字体风格数据。 */
async function loadFontStyles() {
  fontStylesLoading.value = true
  fontStylesError.value = ''

  try {
    fontStyles.value = await fetchFontStyles()
    selectedFontId.value = fontStyles.value[0]?.id ?? DEFAULT_FONT_STYLE.id
    void Promise.allSettled(fontStyles.value.map((style) => loadFontFace(style.fontName, style.fontUrl)))
    applySelectedFontStyle()
  } catch (error) {
    console.error('Hundred family font styles failed.', error)
    fontStylesError.value = '字体风格加载失败，请稍后重试。'
  } finally {
    fontStylesLoading.value = false
  }
}

/** @param {Object} editor 核心编辑器实例。 @returns {void} */
function handleCanvasReady(editor) {
  applyNameTextValues(editor)
  applySelectedFontStyle(editor)
}

/** @param {{ editor: Object }} payload 文档加载事件。 @returns {void} */
function handleDocumentLoaded(payload) {
  payload.editor.arrangeLayersByRole({ back: ['background'] })
  applyNameTextValues(payload.editor)
  applySelectedFontStyle(payload.editor)
}

/**
 * 将姓和名同步到描述匹配的文字元素。
 *
 * @param {Object | null} [editor] 核心编辑器实例。
 * @returns {void}
 */
function applyNameTextValues(editor = canvasViewportRef.value?.getEditor?.()) {
  if (!editor) {
    return
  }

  nameTextBindings.forEach(({ description, value }) => {
    editor.getElementsByAttribute('text.description', description).forEach((element) => {
      editor.replaceText(element, value.value)
    })
  })
}

/** @param {string} styleId 字体风格 ID。 @returns {void} */
function selectFontStyle(styleId) {
  selectedFontId.value = styleId
  applySelectedFontStyle()
}

/**
 * 将当前字体应用到姓和名文字节点。
 *
 * @param {Object | null} [editor] 核心编辑器实例。
 * @returns {void}
 */
function applySelectedFontStyle(editor = canvasViewportRef.value?.getEditor?.()) {
  if (!editor) {
    return
  }

  nameTextBindings.forEach(({ description }) => {
    editor.getElementsByAttribute('text.description', description).forEach((element) => {
      editor.updateText(element, {
        fontFamily: selectedFontStyle.value.fontName,
        fontUrl: selectedFontStyle.value.fontUrl,
        width: Number(element.width)
      })
    })
  })
}

/** @param {string} fontName 字体名称。 @returns {string} CSS 字体声明。 */
function toCssFontFamily(fontName) {
  return `"${String(fontName).replaceAll('"', '')}", sans-serif`
}

watch([surname, givenName], () => {
  applyNameTextValues()
})

function onAdvancedEdit() {
  const editorJson = canvasViewportRef.value?.getEditor?.()?.exportDocument?.()
  console.log('百家姓高级编辑数据：', editorJson)
}

/** @returns {Promise<void>} 保存当前 JSON，并按需获取打印区域截图。 */
async function onSubmit() {
  if (saving.value || !surname.value) {
    return
  }

  saving.value = true
  saveStatus.value = { type: 'success', text: '' }

  try {
    const savePayload = await createSavePayload(canvasViewportRef.value?.getEditor?.())
    console.log('百家姓页面保存数据：', JSON.stringify(savePayload, null, 2))
    saveStatus.value = { type: 'success', text: '保存数据已生成' }
  } catch (error) {
    console.error('Hundred family save failed.', error)
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

  const printAreaImage = editor.getPrintAreaProperties() ? await capturePrintAreaImage(editor) : null
  return { editorJson, printAreaImage }
}

/** @param {Object} editor 核心编辑器实例。 @returns {Promise<string>} 打印区域截图地址。 */
function capturePrintAreaImage(editor) {
  return editor.capturePrintArea({
    includeBackground: false,
    includeMask: false,
    type: 'image/png',
    quality: 1,
    upload: (file) => customerPictureApi.upload(file)
  })
}

onMounted(loadFontStyles)
</script>

<style lang="scss" scoped>
.page {
  position: relative;
  display: flex;
  width: 100%;
  height: 100vh;
  margin: 0 auto;
  overflow: hidden;
  flex-direction: column;
  color: #171717;
  background: #ffffff;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
}

.canvas-section {
  --preview-max-height: clamp(190px, 34vh, 300px);

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
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.14);
}

.canvas-frame :deep(.canvas-document-viewport) {
  width: 100%;
  height: 100%;
}

.page-container {
  display: flex;
  min-height: 0;
  padding: 16px 16px 22px;
  overflow-y: auto;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 20px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.field-section {
  display: grid;
  gap: 12px;
}

.section-heading {
  display: flex;
  min-height: 22px;
  align-items: center;
  gap: 7px;
}

.heading-marker {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  flex: 0 0 auto;
  background: #d61f35;
}

.section-heading h2 {
  margin: 0;
  color: #171717;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.name-fields {
  display: grid;
  gap: 10px;
}

.name-fields label {
  display: grid;
  gap: 6px;
}

.name-fields label > span {
  color: #404040;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.name-fields input {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  outline: none;
  color: #171717;
  background: #ffffff;
  font: inherit;
  font-size: 13px;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.name-fields input::placeholder {
  color: #737373;
}

.name-fields input:focus {
  border-color: #d61f35;
  box-shadow: 0 0 0 2px rgba(214, 31, 53, 0.12);
}

.font-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.font-option,
.font-skeleton {
  min-width: 0;
  min-height: 70px;
  border-radius: 8px;
}

.font-option {
  display: flex;
  padding: 8px 4px 7px;
  border: 1px solid transparent;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  color: #525252;
  background: #eeeeef;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    color 180ms ease,
    background-color 180ms ease;
}

.font-option:hover {
  color: #262626;
  background: #e4e4e5;
}

.font-option.is-selected {
  border-color: #e11d36;
  color: #cf1530;
  background: #ffffff;
}

.font-sample {
  font-size: 25px;
  line-height: 1.05;
}

.font-skeleton {
  display: block;
  background: #eeeeef;
  animation: skeleton-pulse 1.1s ease-in-out infinite alternate;
}

.font-error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
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

.name-fields input:focus-visible,
.font-option:focus-visible,
.advanced-edit:focus-visible,
.submit-button:focus-visible {
  outline: 2px solid #c92a38;
  outline-offset: 2px;
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

@keyframes skeleton-pulse {
  from {
    opacity: 0.56;
  }

  to {
    opacity: 1;
  }
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

@media (max-height: 650px) {
  .canvas-section {
    --preview-max-height: 190px;
  }

  .page-container {
    gap: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .name-fields input,
  .font-option,
  .submit-button {
    transition: none;
  }

  .font-skeleton,
  .save-spinner {
    animation: none;
  }
}
</style>
