import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useH5PageSave } from './useH5PageSave.js'
import { useH5TemplateDocument } from './useH5TemplateDocument.js'
import { readRouteImageOptions } from '../services/route-image-options.js'
import {
  navigateToH5RedirectPath,
  readH5RedirectPath
} from '../services/route-navigation.js'

const DEFAULT_IMAGE_TARGET_DESCRIPTIONS = Object.freeze([
  '诗词配图',
  'AI主题',
  '原图替换',
  '原图定制'
])

const AI_THEME_QUERY_KEYS = Object.freeze(['aiThemes', 'aiThemeUrls', 'aiThemeUrl'])
const BACKGROUND_QUERY_KEYS = Object.freeze([
  'backgroundImages',
  'backgroundImageUrls',
  'backgroundImageUrl'
])

/**
 * 管理主题图片定制页的模板、图片、文案和保存状态。
 *
 * @param {Object} [options={}] 页面业务配置。
 * @param {string} [options.pageId] 保存消息中的页面标识。
 * @param {string} [options.defaultDesignName] 默认设计名称。
 * @param {string[]} [options.imageTargetDescriptions] 可替换图片描述。
 * @param {string} [options.replacementTextLabel] 通用替换文本的表单名称。
 * @param {string} [options.titleTextLabel] 主标题文本的表单名称。
 * @returns {Object} 页面状态和操作方法。
 */
export function usePoetryCustomization(options = {}) {
  const route = useRoute()
  const router = useRouter()
  const pageId = options.pageId || 'poetry-customization'
  const defaultDesignName = options.defaultDesignName || '诗词定制'
  const imageTargetDescriptions = normalizeDescriptionList(options.imageTargetDescriptions)
  const textLabels = {
    replacement: options.replacementTextLabel || '诗词内容',
    title: options.titleTextLabel || '诗词标题'
  }
  const canvasViewportRef = ref(null)
  const activeTab = ref('image')
  const canvasLoaded = ref(false)
  const imageReplacing = ref(false)
  const imagePreviewUrl = ref('')
  const imageFit = ref('contain')
  const showAdvancedSettings = ref(false)
  const imageTargets = ref([])
  const backgroundTargets = ref([])
  const aiThemeOptions = ref([])
  const backgroundOptions = ref([])
  const selectedAiThemeId = ref('')
  const selectedBackgroundId = ref('')
  const textFields = ref([])
  const operationStatus = ref({ type: 'success', text: '' })
  const {
    documentData,
    templateLoading,
    templateError,
    handleCanvasError: handleTemplateCanvasError,
    loadTemplateFromRoute
  } = useH5TemplateDocument({ errorLabel: pageId })
  const {
    saving,
    saveStatus,
    resetSaveStatus,
    savePage
  } = useH5PageSave({
    route,
    router,
    pageId,
    defaultDesignName,
    getEditor: () => getEditor(),
    onBeforeNavigateBack: () => {
      saveStatus.value = { type: 'success', text: '保存成功，正在返回' }
    }
  })

  const canvasFrameStyle = computed(() => {
    const width = Number(documentData.value?.canvas?.width)
    const height = Number(documentData.value?.canvas?.height)

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      return { '--canvas-ratio': 1, aspectRatio: '1 / 1' }
    }

    return {
      '--canvas-ratio': width / height,
      aspectRatio: `${width} / ${height}`
    }
  })

  const canSelectTheme = computed(() => {
    return canvasLoaded.value && imageTargets.value.length > 0 && !imageReplacing.value && !saving.value
  })

  const canSelectBackground = computed(() => {
    return canvasLoaded.value && backgroundTargets.value.length > 0 && !imageReplacing.value && !saving.value
  })

  const canSubmit = computed(() => {
    return canvasLoaded.value && !templateLoading.value && !imageReplacing.value && !saving.value
  })

  /** @returns {Object | null} 当前 canvas-editor-core 实例。 */
  function getEditor() {
    return canvasViewportRef.value?.getEditor?.() ?? null
  }

  /** @returns {Promise<void>} 根据路由模板 ID 重新加载页面。 */
  async function reloadTemplate() {
    resetPageState()
    aiThemeOptions.value = readRouteImageOptions(route.query, AI_THEME_QUERY_KEYS, 'ai-theme')
    backgroundOptions.value = readRouteImageOptions(
      route.query,
      BACKGROUND_QUERY_KEYS,
      'background'
    )
    await loadTemplateFromRoute(route.query)
  }

  /** @returns {void} 清理上一个模板的业务状态。 */
  function resetPageState() {
    canvasLoaded.value = false
    imageReplacing.value = false
    imagePreviewUrl.value = ''
    activeTab.value = 'image'
    imageFit.value = 'contain'
    showAdvancedSettings.value = false
    imageTargets.value = []
    backgroundTargets.value = []
    aiThemeOptions.value = []
    backgroundOptions.value = []
    selectedAiThemeId.value = ''
    selectedBackgroundId.value = ''
    textFields.value = []
    operationStatus.value = { type: 'success', text: '' }
    resetSaveStatus()
  }

  /**
   * 同步统一文档中可定制的图片和文字。
   *
   * @param {{ editor: Object }} payload 画布加载事件。
   * @returns {void}
   */
  function handleDocumentLoaded(payload) {
    imageTargets.value = resolveImageTargets(payload.editor, imageTargetDescriptions)
    backgroundTargets.value = resolveBackgroundTargets(payload.editor)
    textFields.value = createTextFields(payload.editor, textLabels)
    canvasLoaded.value = true
    templateError.value = ''

    if (aiThemeOptions.value.length > 0 && imageTargets.value.length === 0) {
      operationStatus.value = {
        type: 'warning',
        text: '模板未配置可替换图片标记。'
      }
      return
    }

    if (backgroundOptions.value.length > 0 && backgroundTargets.value.length === 0) {
      operationStatus.value = {
        type: 'warning',
        text: '模板未配置背景图标记。'
      }
      return
    }

    void applyInitialRouteImages(payload.editor)
  }

  /** @param {*} error 画布加载错误。 @returns {void} */
  function handleCanvasError(error) {
    canvasLoaded.value = false
    handleTemplateCanvasError(error)
  }

  /** @returns {Promise<void>} 返回 redirectPath 页面重新选择主题。 */
  async function tryMoreThemes() {
    const redirectPath = readH5RedirectPath(route)
    if (!redirectPath) {
      operationStatus.value = {
        type: 'warning',
        text: '当前页面未配置返回地址。'
      }
      return
    }

    await navigateToH5RedirectPath(redirectPath, router)
  }

  /**
   * 应用路由中默认选中的主题和背景图。
   *
   * @param {Object} editor 编辑器实例。
   * @returns {Promise<void>} 路由图片应用完成。
   */
  async function applyInitialRouteImages(editor) {
    const themeOption = resolveInitialOption(
      aiThemeOptions.value,
      String(imageTargets.value[0]?.url ?? '')
    )
    const backgroundOption = resolveInitialOption(
      backgroundOptions.value,
      String(backgroundTargets.value[0]?.url ?? '')
    )

    selectedAiThemeId.value = themeOption?.id ?? ''
    selectedBackgroundId.value = backgroundOption?.id ?? ''
    imagePreviewUrl.value = themeOption?.url ?? String(imageTargets.value[0]?.url ?? '')

    const currentThemeUrl = String(imageTargets.value[0]?.url ?? '')
    const currentBackgroundUrl = String(backgroundTargets.value[0]?.url ?? '')
    const tasks = []
    if (themeOption && imageTargets.value.length > 0 && themeOption.url !== currentThemeUrl) {
      tasks.push(() => replaceImages(editor, themeOption.url))
    }
    if (
      backgroundOption
      && backgroundTargets.value.length > 0
      && backgroundOption.url !== currentBackgroundUrl
    ) {
      tasks.push(() => replaceImageTargets(
        editor,
        backgroundOption.url,
        backgroundTargets.value,
        'stretch'
      ))
    }
    if (tasks.length === 0) {
      return
    }

    imageReplacing.value = true
    operationStatus.value = { type: 'success', text: '' }
    try {
      await Promise.all(tasks.map((task) => task()))
    } catch (error) {
      console.error('Poetry route image initialization failed.', error)
      operationStatus.value = { type: 'error', text: '路由图片加载失败，请检查图片地址。' }
    } finally {
      imageReplacing.value = false
    }
  }

  /**
   * 使用路由提供的 AI 主题图片。
   *
   * @param {{ id: string, url: string }} option 主题选项。
   * @returns {Promise<void>} 主题切换完成。
   */
  async function selectAiTheme(option) {
    const editor = getEditor()
    if (!editor || !option?.url || !canSelectTheme.value) {
      return
    }

    imageReplacing.value = true
    operationStatus.value = { type: 'success', text: '' }
    try {
      await replaceImages(editor, option.url)
      selectedAiThemeId.value = option.id
      imagePreviewUrl.value = option.url
    } catch (error) {
      console.error('Poetry AI theme replacement failed.', error)
      operationStatus.value = { type: 'error', text: '主题图片切换失败。' }
    } finally {
      imageReplacing.value = false
    }
  }

  /**
   * 切换图片在当前模板框中的适配方式。
   *
   * @param {'contain' | 'cover'} fit 图片适配方式。
   * @returns {Promise<void>} 图片适配完成。
   */
  async function setImageFit(fit) {
    if (!['contain', 'cover'].includes(fit)) {
      return
    }

    imageFit.value = fit
    const editor = getEditor()
    if (!editor || imageTargets.value.length === 0 || !imagePreviewUrl.value) {
      return
    }

    imageReplacing.value = true
    try {
      await replaceImages(editor, imagePreviewUrl.value)
    } catch (error) {
      console.error('Poetry image fit update failed.', error)
      operationStatus.value = { type: 'error', text: '图片适配方式更新失败。' }
    } finally {
      imageReplacing.value = false
    }
  }

  /**
   * 使用路由提供的背景图片替换模板背景图层。
   *
   * @param {{ id: string, url: string }} option 背景选项。
   * @returns {Promise<void>} 背景切换完成。
   */
  async function selectBackground(option) {
    const editor = getEditor()
    if (!editor || !option?.url || !canSelectBackground.value) {
      return
    }

    imageReplacing.value = true
    operationStatus.value = { type: 'success', text: '' }
    try {
      await replaceImageTargets(editor, option.url, backgroundTargets.value, 'stretch')
      selectedBackgroundId.value = option.id
    } catch (error) {
      console.error('Poetry background replacement failed.', error)
      operationStatus.value = { type: 'error', text: '背景图片切换失败。' }
    } finally {
      imageReplacing.value = false
    }
  }

  /**
   * 使用当前页面的图片目标和适配方式执行替换。
   *
   * @param {Object} editor 编辑器实例。
   * @param {string} imageUrl 新图片地址。
   * @returns {Promise<void>} 全部图片替换完成。
   */
  function replaceImages(editor, imageUrl) {
    return replaceImageTargets(editor, imageUrl, imageTargets.value, imageFit.value)
  }

  /**
   * 将表单内容替换到相同 text.description 的全部文字节点。
   *
   * @param {string} fieldId 文字字段 ID。
   * @param {string} value 新文字内容。
   * @returns {void}
   */
  function updateTextField(fieldId, value) {
    const field = textFields.value.find((item) => item.id === fieldId)
    const editor = getEditor()

    if (!field || !editor) {
      return
    }

    field.value = value
    editor.getElementsByAttribute('text.description', field.description).forEach((element) => {
      editor.replaceText(element, value)
    })
  }

  /** @returns {Promise<void>} 保存统一 JSON、预览图和打印区域。 */
  async function submitDesign() {
    if (!canSubmit.value) {
      return
    }

    operationStatus.value = { type: 'success', text: '' }
    await savePage()
  }

  watch(
    () => [
      route.query.templateId,
      route.query.partnerId,
      route.query.aiThemes,
      route.query.aiThemeUrls,
      route.query.aiThemeUrl,
      route.query.backgroundImages,
      route.query.backgroundImageUrls,
      route.query.backgroundImageUrl
    ],
    () => {
      void reloadTemplate()
    },
    { immediate: true }
  )

  return {
    activeTab,
    aiThemeOptions,
    backgroundOptions,
    canvasFrameStyle,
    canvasLoaded,
    canvasViewportRef,
    canSelectBackground,
    canSelectTheme,
    canSubmit,
    documentData,
    handleCanvasError,
    handleDocumentLoaded,
    imageFit,
    imagePreviewUrl,
    imageReplacing,
    operationStatus,
    saveStatus,
    saving,
    selectAiTheme,
    selectBackground,
    selectedAiThemeId,
    selectedBackgroundId,
    setImageFit,
    showAdvancedSettings,
    submitDesign,
    templateError,
    templateLoading,
    textFields,
    tryMoreThemes,
    updateTextField
  }
}

/**
 * @param {Object} editor 编辑器实例。
 * @param {string[]} descriptions 图片描述列表。
 * @returns {Object[]} 可替换图片节点。
 */
function resolveImageTargets(editor, descriptions) {
  const targets = descriptions.flatMap((description) => {
    return editor.getElementsByAttribute('image.description', description)
  })
  const roleTargets = editor.getElementsByRole('ai-variable')

  return [...new Set([...targets, ...roleTargets])]
}

/** @param {Object} editor 编辑器实例。 @returns {Object[]} 背景图片节点。 */
function resolveBackgroundTargets(editor) {
  return editor.getElementsByRole('background')
}

/**
 * @param {Object[]} options 路由图片选项。
 * @param {string} currentUrl 模板当前图片地址。
 * @returns {Object | null} 初始选项。
 */
function resolveInitialOption(options, currentUrl) {
  if (!Array.isArray(options) || options.length === 0) {
    return null
  }

  return options.find((option) => option.selected)
    ?? options.find((option) => option.url === currentUrl)
    ?? options[0]
}

/**
 * @param {Object} editor 编辑器实例。
 * @param {{ replacement: string, title: string }} labels 页面文案标签。
 * @returns {Object[]} 动态文案字段。
 */
function createTextFields(editor, labels) {
  const fields = new Map()
  const document = editor.exportDocument?.()

  flattenDocumentElements(document?.elements).forEach((element) => {
    if (String(element.tag).toLowerCase() !== 'text') {
      return
    }

    const description = normalizeDescription(element.attributes?.text?.description)
    if (!description || fields.has(description)) {
      return
    }

    const rules = element.attributes?.textInput ?? {}
    fields.set(description, {
      id: String(element.elementId ?? description),
      description,
      label: resolveTextLabel(description, labels),
      value: String(element.text ?? ''),
      multiline: resolveMultilineField(description, rules),
      maxLength: normalizeMaxLength(rules.maxCharacters)
    })
  })

  return [...fields.values()]
}

/**
 * 递归展开统一文档元素，包含组合内的子元素。
 *
 * @param {Object[] | undefined} elements 统一文档元素。
 * @returns {Object[]} 展开后的元素数组。
 */
function flattenDocumentElements(elements) {
  if (!Array.isArray(elements)) {
    return []
  }

  return elements.flatMap((element) => {
    return [element, ...flattenDocumentElements(element.children)]
  })
}

/**
 * @param {Object} editor 编辑器实例。
 * @param {string} imageUrl 新图片地址。
 * @param {Object[]} targets 可替换图片节点。
 * @param {'contain' | 'cover'} fit 图片适配方式。
 * @returns {Promise<void>} 全部图片替换完成。
 */
async function replaceImageTargets(editor, imageUrl, targets, fit) {
  await Promise.all(
    targets.map((target) => editor.replaceImage(target, imageUrl, {
      fit,
      allowLocked: true
    }))
  )
}

/** @param {string} value 文字描述。 @returns {string} 归一化描述。 */
function normalizeDescription(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * @param {string} description 文字描述。
 * @param {Object} rules 文字输入规则。
 * @returns {boolean} 是否使用多行输入。
 */
function resolveMultilineField(description, rules) {
  if (rules.enabled === true) {
    return Number(rules.maxLines) > 1 || Boolean(rules.allowManualNewline)
  }

  return /(诗词|正文|内容|文案)/.test(description)
}

/**
 * @param {string} description 模板文字描述。
 * @param {{ replacement: string, title: string }} labels 页面文案标签。
 * @returns {string} 表单标题。
 */
function resolveTextLabel(description, labels) {
  const labelMap = {
    '文本替换': labels.replacement,
    '文案替换': labels.replacement,
    '主标题': labels.title,
    '副标题': '副标题',
    '落款': '落款'
  }

  return labelMap[description] ?? description
}

/** @param {*} value 图片描述配置。 @returns {string[]} 可替换图片描述。 */
function normalizeDescriptionList(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_IMAGE_TARGET_DESCRIPTIONS]
  }

  const descriptions = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  return descriptions.length ? [...new Set(descriptions)] : [...DEFAULT_IMAGE_TARGET_DESCRIPTIONS]
}

/** @param {*} value 模板字符限制。 @returns {number} 安全的 maxlength。 */
function normalizeMaxLength(value) {
  const maxLength = Number(value)
  return Number.isInteger(maxLength) && maxLength > 0 ? Math.min(maxLength, 5000) : 500
}
