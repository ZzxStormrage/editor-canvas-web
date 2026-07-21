<template>
  <div class="layer-attribute-editor">
    <div class="layer-attribute-header">
      <div>
        <strong>{{ editorTitle }}</strong>
        <span>{{ layerName }}</span>
      </div>
      <button type="button" class="layer-attribute-close" aria-label="关闭属性编辑" @click="emit('close')">
        <v-icon icon="mdi-close" size="17" />
      </button>
    </div>

    <template v-if="layerType === 'image'">
      <p class="layer-attribute-help">配置图片用途和描述，仅写入业务属性，不会改变图层顺序。</p>
      <v-select
        v-model="imageDraft.role"
        :items="IMAGE_ROLE_OPTIONS"
        item-title="label"
        item-value="value"
        density="compact"
        hide-details="auto"
        label="图片用途"
        variant="outlined"
      />
      <v-textarea
        v-model="imageDraft.description"
        auto-grow
        counter="200"
        density="compact"
        hide-details="auto"
        label="图片描述"
        maxlength="200"
        placeholder="例如：红色礼盒正面展示图"
        rows="3"
        variant="outlined"
      />
    </template>

    <template v-else-if="layerType === 'text'">
      <p class="layer-attribute-help">配置文字描述和 H5 用户输入规则，不会修改当前画布文字。</p>

      <v-text-field
        v-model="textDescription"
        clearable
        density="compact"
        hide-details="auto"
        label="文字描述"
        maxlength="200"
        placeholder="例如：用户姓名"
        variant="outlined"
      />

      <div class="text-rule-master">
        <div>
          <strong>启用 H5 用户输入</strong>
          <span>关闭时 H5 不执行以下限制</span>
        </div>
        <v-switch v-model="textDraft.enabled" color="primary" density="compact" hide-details inset />
      </div>

      <transition name="text-rule-reveal">
        <div v-if="textDraft.enabled" class="text-rule-content">
          <div class="text-rule-section">
            <span class="text-rule-section-title">显示方式</span>
            <label class="text-rule-toggle">
              <span>
                <strong>仅支持竖行</strong>
                <small>从上往下单列排列，不换到第二列</small>
              </span>
              <v-switch
                v-model="singleVerticalLineModel"
                color="primary"
                density="compact"
                hide-details
                inset
              />
            </label>
            <v-btn-toggle
              v-if="!isVerticalLayout"
              v-model="textDraft.layoutMode"
              class="text-layout-mode-toggle"
              color="primary"
              density="compact"
              divided
              mandatory
              variant="outlined"
            >
              <v-btn value="wrap">自动换行</v-btn>
              <v-btn value="single-line">单行适配</v-btn>
            </v-btn-toggle>
            <CompactNumberField
              v-if="isSingleLineLayout"
              v-model="textDraft.minFontSize"
              label="最小字号"
              :max="500"
            />
            <label v-if="!hasFixedTextFlow" class="text-rule-toggle">
              <span>
                <strong>允许用户主动换行</strong>
                <small>允许输入回车；达到单行长度后仍会自动换行</small>
              </span>
              <v-switch
                v-model="manualNewlineModel"
                color="primary"
                density="compact"
                :disabled="hasFixedTextFlow"
                hide-details
                inset
              />
            </label>
          </div>

          <div class="text-rule-section">
            <span class="text-rule-section-title">字符规则</span>
            <label class="text-rule-toggle">
              <span>
                <strong>仅支持英文</strong>
                <small>{{ englishOnlyHint }}</small>
              </span>
              <v-switch v-model="textDraft.englishOnly" color="primary" density="compact" hide-details inset />
            </label>
            <label class="text-rule-toggle">
              <span>
                <strong>{{ symbolRuleLabel }}</strong>
                <small>{{ symbolRuleHint }}</small>
              </span>
              <v-switch v-model="textDraft.allowSymbols" color="primary" density="compact" hide-details inset />
            </label>
          </div>

          <div class="text-rule-section">
            <span class="text-rule-section-title">长度规则</span>
            <p class="text-rule-unit-note">中文计 2，英文计 1；限制两个中文时填写 4。</p>
            <div class="text-rule-number-grid">
              <CompactNumberField
                v-if="showsLineLimits"
                v-model="textDraft.maxCharactersPerLine"
                label="单行长度"
                :max="200"
              />
              <CompactNumberField v-model="textDraft.maxCharacters" label="最大内容长度" :max="5000" />
              <CompactNumberField
                v-if="showsLineLimits"
                v-model="textDraft.maxLines"
                label="最大行数"
                :max="100"
              />
            </div>
            <p class="text-rule-summary">{{ textRuleSummary }}</p>
          </div>
        </div>
      </transition>
    </template>

    <div v-if="attributeError" class="layer-attribute-error">{{ attributeError }}</div>

    <div class="layer-attribute-footer">
      <v-btn class="layer-attribute-footer-button" size="small" variant="text" @click="emit('close')">取消</v-btn>
      <v-btn class="layer-attribute-footer-button" color="primary" size="small" variant="flat" @click="saveAttributes">
        保存配置
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { DEFAULT_TEXT_INPUT_RULES } from '../../../canvas-editor-core/src/utils/text-input-rules.js'
import { normalizeTextLayout } from '../../../canvas-editor-core/src/utils/text-layout.js'
import CompactNumberField from './CompactNumberField.vue'
const IMAGE_ROLE_OPTIONS = Object.freeze([
  { label: '普通图片', value: '' },
  { label: '背景图', value: 'background' },
  { label: '遮罩图', value: 'mask' },
  { label: 'AI 可变图', value: 'ai-variable' }
])
const IMAGE_ROLE_VALUES = new Set(IMAGE_ROLE_OPTIONS.map((item) => item.value).filter(Boolean))

const props = defineProps({
  editor: { type: Object, required: true },
  elementId: { type: String, required: true },
  layerName: { type: String, required: true },
  layerType: { type: String, required: true }
})

const emit = defineEmits(['close', 'saved'])
const attributes = props.editor.getElementAttributesById(props.elementId) ?? {}
const attributeError = ref('')
const imageDraft = reactive({
  description: typeof attributes.image?.description === 'string' ? attributes.image.description : '',
  role: IMAGE_ROLE_VALUES.has(attributes.image?.role) ? attributes.image.role : ''
})
const textDescription = ref(typeof attributes.text?.description === 'string' ? attributes.text.description : '')
const textDraft = reactive(createTextDraft(attributes.textInput, attributes.textLayout))

const editorTitle = computed(() => (props.layerType === 'image' ? '图片属性' : '文字属性'))
const isSingleLineLayout = computed(() => textDraft.layoutMode === 'single-line')
const isVerticalLayout = computed(() => textDraft.singleVerticalLine)
const hasFixedTextFlow = computed(() => isSingleLineLayout.value || isVerticalLayout.value)
const showsLineLimits = computed(() => !isVerticalLayout.value && textDraft.layoutMode === 'wrap')
const singleVerticalLineModel = computed({
  get: () => textDraft.singleVerticalLine,
  set: (value) => {
    textDraft.singleVerticalLine = Boolean(value)
    if (value) textDraft.layoutMode = 'wrap'
  }
})
const manualNewlineModel = computed({
  get: () => (hasFixedTextFlow.value ? false : textDraft.allowManualNewline),
  set: (value) => {
    textDraft.allowManualNewline = Boolean(value)
  }
})
const englishOnlyHint = computed(() => {
  return textDraft.allowSymbols
    ? '保留英文、数字、空格和英文符号'
    : '仅保留英文字母、数字和空格'
})
const symbolRuleLabel = computed(() => {
  return textDraft.englishOnly ? '支持英文符号' : '支持符号和 Emoji'
})
const symbolRuleHint = computed(() => {
  return textDraft.englishOnly
    ? 'Emoji 会被英文限制过滤'
    : '默认关闭；关闭后仅保留文字、数字和空格'
})
const textRuleSummary = computed(() => {
  const perLine = normalizeOptionalInteger(textDraft.maxCharactersPerLine)
  const maxLines = normalizeOptionalInteger(textDraft.maxLines)
  const maxCharacters = normalizeOptionalInteger(
    textDraft.maxCharacters ?? (isSingleLineLayout.value ? textDraft.maxCharactersPerLine : null)
  )

  if (isSingleLineLayout.value) {
    const lengthSummary = maxCharacters
      ? `最多约 ${Math.floor(maxCharacters / 2)} 个中文或 ${maxCharacters} 个英文。`
      : '未限制输入长度。'
    const minFontSummary = normalizeOptionalInteger(textDraft.minFontSize)
      ? `最小字号 ${textDraft.minFontSize}px`
      : '最小字号默认为模板字号的 60%'

    return `${lengthSummary}${minFontSummary}，仍放不下时允许超出。`
  }

  if (isVerticalLayout.value) {
    return maxCharacters
      ? `单列竖行，最多约 ${Math.floor(maxCharacters / 2)} 个中文或 ${maxCharacters} 个英文。`
      : '单列竖行，未限制输入长度。'
  }

  if (perLine && maxLines) {
    const capacity = perLine * maxLines
    return maxCharacters
      ? `按行数最多约展示 ${Math.min(capacity, maxCharacters)} 个字符。`
      : `按当前规则最多约展示 ${capacity} 个字符。`
  }
  if (maxCharacters) return `全文最多输入 ${maxCharacters} 个字符。`
  if (perLine) return `每行达到 ${perLine} 个字符后自动换行。`
  if (maxLines) return `最多显示 ${maxLines} 行。`
  return '未设置长度限制。'
})

function saveAttributes() {
  attributeError.value = ''
  const currentAttributes = props.editor.getElementAttributesById(props.elementId) ?? {}
  const nextAttributes = { ...currentAttributes }

  if (props.layerType === 'image') {
    const description = imageDraft.description.trim()
    const imageAttributes = isPlainObject(currentAttributes.image) ? { ...currentAttributes.image } : {}

    if (description) imageAttributes.description = description
    else delete imageAttributes.description

    if (IMAGE_ROLE_VALUES.has(imageDraft.role)) imageAttributes.role = imageDraft.role
    else delete imageAttributes.role

    if (Object.keys(imageAttributes).length) nextAttributes.image = imageAttributes
    else delete nextAttributes.image
  } else if (props.layerType === 'text') {
    const description = textDescription.value?.trim() ?? ''
    const textAttributes = isPlainObject(currentAttributes.text) ? { ...currentAttributes.text } : {}

    if (description) textAttributes.description = description
    else delete textAttributes.description

    if (Object.keys(textAttributes).length) nextAttributes.text = textAttributes
    else delete nextAttributes.text

    const textInput = buildTextInputPayload()
    if (!textInput) return
    nextAttributes.textInput = textInput

    const textLayout = buildTextLayoutPayload()
    if (attributeError.value) return
    if (textLayout) nextAttributes.textLayout = textLayout
    else delete nextAttributes.textLayout
  }

  props.editor.setElementAttributesById(props.elementId, nextAttributes, { replace: true })
  emit('saved')
  emit('close')
}

function buildTextInputPayload() {
  const maxCharactersPerLine = hasFixedTextFlow.value
    ? null
    : validateOptionalInteger(textDraft.maxCharactersPerLine, '单行长度', 200)
  if (attributeError.value) return null
  const maxCharactersSource = textDraft.maxCharacters
    ?? (isSingleLineLayout.value ? textDraft.maxCharactersPerLine : null)
  const maxCharacters = validateOptionalInteger(maxCharactersSource, '最大字符限制', 5000)
  if (attributeError.value) return null
  const maxLines = isSingleLineLayout.value
    ? 1
    : isVerticalLayout.value
      ? null
      : validateOptionalInteger(textDraft.maxLines, '最大行数', 100)
  if (attributeError.value) return null

  return {
    enabled: Boolean(textDraft.enabled),
    characterSet: textDraft.englishOnly ? 'latin' : 'any',
    allowManualNewline: hasFixedTextFlow.value ? false : Boolean(textDraft.allowManualNewline),
    allowSymbols: Boolean(textDraft.allowSymbols),
    singleVerticalLine: Boolean(textDraft.singleVerticalLine),
    maxCharactersPerLine,
    maxCharacters,
    maxLines
  }
}

function buildTextLayoutPayload() {
  if (!isSingleLineLayout.value) {
    return null
  }

  const minFontSize = validateOptionalInteger(textDraft.minFontSize, '最小字号', 500)
  if (attributeError.value) return null

  return {
    mode: 'single-line',
    overflow: 'shrink-then-visible',
    minFontSize
  }
}

function validateOptionalInteger(value, label, max) {
  const normalized = normalizeOptionalInteger(value)
  if (value !== null && value !== '' && normalized === null) {
    attributeError.value = `${label}必须是正整数`
    return null
  }
  if (normalized && normalized > max) {
    attributeError.value = `${label}不能超过 ${max}`
    return null
  }
  return normalized
}

function normalizeOptionalInteger(value) {
  if (value === null || value === '' || value === undefined) return null
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function createTextDraft(source = {}, layoutSource = {}) {
  const layout = normalizeTextLayout(layoutSource)
  const singleVerticalLine = source.singleVerticalLine === true || layout.mode === 'vertical'
  const hasExplicitLayoutMode = isPlainObject(layoutSource)
    && Object.prototype.hasOwnProperty.call(layoutSource, 'mode')
  const isLegacySingleLine = !hasExplicitLayoutMode
    && source.allowManualNewline === false
    && Number(source.maxLines) === 1
  const layoutMode = isLegacySingleLine || layout.mode === 'single-line' ? 'single-line' : 'wrap'

  return {
    enabled: source.enabled ?? DEFAULT_TEXT_INPUT_RULES.enabled,
    englishOnly: source.characterSet === 'latin',
    allowManualNewline: source.allowManualNewline ?? DEFAULT_TEXT_INPUT_RULES.allowManualNewline,
    allowSymbols: source.allowSymbols ?? DEFAULT_TEXT_INPUT_RULES.allowSymbols,
    singleVerticalLine,
    maxCharactersPerLine: source.maxCharactersPerLine ?? DEFAULT_TEXT_INPUT_RULES.maxCharactersPerLine,
    maxCharacters: source.maxCharacters ?? DEFAULT_TEXT_INPUT_RULES.maxCharacters,
    maxLines: source.maxLines ?? DEFAULT_TEXT_INPUT_RULES.maxLines,
    layoutMode,
    minFontSize: layout.minFontSize
  }
}
</script>
