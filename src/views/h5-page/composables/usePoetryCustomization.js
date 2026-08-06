import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  normalizeMaterialGroupIds,
  normalizeMaterialPage
} from '../../../composables/canvas-editor/material-group-data.js'
import { useH5PageSave } from './useH5PageSave.js'
import { useH5TemplateDocument } from './useH5TemplateDocument.js'
import { customerMaterialGroupApi } from '../api/customer-material-group.js'
import { loadAiSubjectBackgroundOptions } from '../services/ai-subject-backgrounds.js'
import { readRouteImageOptions } from '../services/route-image-options.js'
import { readRouteValue } from '../services/route-navigation.js'
import {
  applyTextInputRules,
  extractTextInputValue,
  normalizeTextInputRules,
  supportsMultilineInput
} from '../services/text-input-rules.js'
import { clearThemeFlow, loadThemeFlow, saveThemeFlow, upsertTheme } from '../services/theme-flow-storage.js'
import { wxAPI } from '../services/wx-api.js'

const DEFAULT_IMAGE_TARGET_DESCRIPTIONS = Object.freeze(['诗词配图', 'AI主题', '原图替换', '原图定制'])
const MATERIAL_PAGE_SIZE = 1000

const AI_THEME_QUERY_KEYS = Object.freeze(['imageUrl'])
const BACKGROUND_QUERY_KEYS = Object.freeze([
  'background_img_urls',
  'backgroundImages',
  'backgroundImageUrls',
  'backgroundImageUrl'
])
const IMAGE_REPLACEMENT_TIMEOUT = 15000
const TRY_MORE_EXCLUDED_QUERY_KEYS = new Set([
  'Authorization',
  'authorization',
  'token',
  'id',
  'imageUrl',
  'themeImages',
  'aiThemes',
  'aiThemeUrls',
  'aiThemeUrl',
  'themeEntryId',
  'themeName',
  'aiSubjectIds',
  'background_img_urls',
  'backgroundImages',
  'backgroundImageUrls',
  'backgroundImageUrl',
  'fromH5TryMore',
  'skuData'
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
 * @param {boolean} [options.materialGroupMode] 是否启用人像款素材组选择。
 * @returns {Object} 页面状态和操作方法。
 */
export function usePoetryCustomization(options = {}) {
  const route = useRoute()
  const pageId = options.pageId || 'poetry-customization'
  const defaultDesignName = options.defaultDesignName || '诗词定制'
  const imageTargetDescriptions = normalizeDescriptionList(options.imageTargetDescriptions)
  const materialGroupMode = options.materialGroupMode === true
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
  const materialOptions = ref([])
  const materialOptionsLoading = ref(false)
  const materialOptionsError = ref('')
  const materialReplacing = ref(false)
  const boundMaterialGroupIds = ref([])
  const materialTargets = ref([])
  const backgroundOptions = ref([])
  const selectedAiThemeId = ref('')
  const selectedMaterialId = ref('')
  const selectedBackgroundId = ref('')
  const textFields = ref([])
  const operationStatus = ref({ type: 'success', text: '' })
  const themeFlowId = ref('')
  let themeFlow = { themes: [], selectedThemeId: '' }
  let reloadRequestId = 0
  let preserveThemeFlowOnExit = false
  const {
    documentData,
    templateLoading,
    templateError,
    handleCanvasError: handleTemplateCanvasError,
    loadTemplateFromRoute
  } = useH5TemplateDocument({ errorLabel: pageId })
  const {
    redirecting,
    saving,
    saveProgressText,
    saveStatus,
    resetSaveStatus,
    savePage
  } = useH5PageSave({
    route,
    pageId,
    defaultDesignName,
    getEditor
  })

  const canvasFrameStyle = computed(() => {
    const width = Number(documentData.value?.canvas?.width)
    const height = Number(documentData.value?.canvas?.height)

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      return { aspectRatio: '1 / 1' }
    }

    return {
      aspectRatio: `${width} / ${height}`
    }
  })

  const canSelectTheme = computed(() => {
    return canvasLoaded.value && imageTargets.value.length > 0 &&
      !imageReplacing.value && !saving.value && !redirecting.value
  })

  const canSelectBackground = computed(() => {
    return canvasLoaded.value && backgroundTargets.value.length > 0 &&
      !imageReplacing.value && !saving.value && !redirecting.value
  })

  const canSubmit = computed(() => {
    const materialReady =
      !materialGroupMode ||
      (!materialOptionsLoading.value &&
        !materialReplacing.value &&
        materialOptions.value.length > 0 &&
        materialTargets.value.length > 0)
    return canvasLoaded.value && !templateLoading.value && !imageReplacing.value &&
      !saving.value && !redirecting.value && materialReady
  })

  /** @returns {Object | null} 当前 canvas-editor-core 实例。 */
  function getEditor() {
    return canvasViewportRef.value?.getEditor?.() ?? null
  }

  /** @returns {Promise<void>} 根据路由模板 ID 重新加载页面。 */
  async function reloadTemplate() {
    const currentRequestId = ++reloadRequestId
    resetPageState()
    themeFlowId.value = String(readRouteValue(route.query.themeFlowId) || '')
    const isTryMoreContinuation = String(readRouteValue(route.query.fromH5TryMore) || '') === '1'
    if (!isTryMoreContinuation) clearThemeFlow(themeFlowId.value)
    themeFlow = loadThemeFlow(themeFlowId.value)
    const currentTheme = readRouteImageOptions(route.query, AI_THEME_QUERY_KEYS, 'ai-theme')[0]
    const routeBackgrounds = readRouteImageOptions(route.query, BACKGROUND_QUERY_KEYS, 'background')
    try {
      const apiBackgrounds = await loadAiSubjectBackgroundOptions(route.query)
      if (currentRequestId !== reloadRequestId) return
      if (currentTheme) {
        themeFlow = upsertTheme(themeFlow, {
          id: readRouteValue(route.query.themeEntryId) || currentTheme.id,
          label: readRouteValue(route.query.themeName) || currentTheme.label,
          url: currentTheme.url,
          subjectId: readRouteValue(route.query.id),
          backgrounds: apiBackgrounds.length ? apiBackgrounds : routeBackgrounds
        })
        saveThemeFlow(themeFlowId.value, themeFlow)
      }
    } catch (error) {
      if (currentRequestId !== reloadRequestId) return
      console.error('AI subject backgrounds failed to load.', error)
      if (currentTheme) {
        themeFlow = upsertTheme(themeFlow, {
          id: readRouteValue(route.query.themeEntryId) || currentTheme.id,
          label: readRouteValue(route.query.themeName) || currentTheme.label,
          url: currentTheme.url,
          subjectId: readRouteValue(route.query.id),
          backgrounds: routeBackgrounds
        })
        saveThemeFlow(themeFlowId.value, themeFlow)
      }
    }
    syncThemeOptionsFromFlow()
    const templateResult = await loadTemplateFromRoute(route.query)
    if (currentRequestId !== reloadRequestId) return
    boundMaterialGroupIds.value = materialGroupMode
      ? resolveTemplateMaterialGroupIds(templateResult?.document)
      : []
    await loadMaterialOptions(currentRequestId)
  }

  /** @returns {void} 清理上一个模板的业务状态。 */
  function resetPageState() {
    canvasLoaded.value = false
    imageReplacing.value = false
    materialReplacing.value = false
    imagePreviewUrl.value = ''
    activeTab.value = 'image'
    imageFit.value = 'contain'
    showAdvancedSettings.value = false
    imageTargets.value = []
    backgroundTargets.value = []
    materialTargets.value = []
    aiThemeOptions.value = []
    materialOptions.value = []
    materialOptionsLoading.value = false
    materialOptionsError.value = ''
    boundMaterialGroupIds.value = []
    backgroundOptions.value = []
    selectedAiThemeId.value = ''
    selectedMaterialId.value = ''
    selectedBackgroundId.value = ''
    textFields.value = []
    operationStatus.value = { type: 'success', text: '' }
    themeFlowId.value = ''
    themeFlow = { themes: [], selectedThemeId: '' }
    resetSaveStatus()
  }

  /** @returns {void} 将流程存储中的主题及当前背景同步到界面。 */
  function syncThemeOptionsFromFlow() {
    aiThemeOptions.value = themeFlow.themes.map((theme) => ({
      ...theme,
      backgrounds: cloneBackgroundOptions(theme.backgrounds)
    }))
    selectedAiThemeId.value =
      themeFlow.selectedThemeId || aiThemeOptions.value[aiThemeOptions.value.length - 1]?.id || ''
    const selectedTheme =
      aiThemeOptions.value.find((theme) => theme.id === selectedAiThemeId.value) ??
      aiThemeOptions.value[aiThemeOptions.value.length - 1]
    backgroundOptions.value = cloneBackgroundOptions(selectedTheme?.backgrounds)
    selectedBackgroundId.value = resolveInitialOption(backgroundOptions.value, '')?.id ?? ''
  }

  /** @returns {void} 保存当前主题和它的背景选中状态。 */
  function persistThemeSelection() {
    themeFlow.selectedThemeId = selectedAiThemeId.value
    themeFlow.themes = themeFlow.themes.map((theme) => {
      if (theme.id !== selectedAiThemeId.value) return theme
      return {
        ...theme,
        backgrounds: backgroundOptions.value.map((background) => ({
          ...background,
          selected: background.id === selectedBackgroundId.value
        }))
      }
    })
    saveThemeFlow(themeFlowId.value, themeFlow)
  }

  /**
   * 同步统一文档中可定制的图片和文字。
   *
   * @param {{ editor: Object }} payload 画布加载事件。
   * @returns {void}
   */
  function handleDocumentLoaded(payload) {
    if (materialGroupMode) {
      boundMaterialGroupIds.value = resolveTemplateMaterialGroupIds(documentData.value)
    }
    imageTargets.value = resolveImageTargets(payload.editor, imageTargetDescriptions)
    backgroundTargets.value = resolveBackgroundTargets(payload.editor)
    materialTargets.value = materialGroupMode
      ? resolveMaterialTargetGroups(payload.editor, boundMaterialGroupIds.value)
      : []
    textFields.value = materialGroupMode ? [] : createTextFields(payload.editor, textLabels)
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

    void applyInitialDocumentImages(payload.editor)
  }

  async function applyInitialDocumentImages(editor) {
    await applyInitialRouteImages(editor)
    await applyInitialMaterial(editor)
  }

  /** @param {Object | null} [editor] 画布实例。 @returns {Promise<void>} 应用默认素材。 */
  async function applyInitialMaterial(editor = getEditor()) {
    if (!materialGroupMode || !editor || materialOptions.value.length === 0 || materialReplacing.value) return
    if (materialTargets.value.length === 0) {
      operationStatus.value = { type: 'warning', text: '模板图片图层未绑定素材组。' }
      return
    }
    await selectMaterial(materialOptions.value[0], editor)
  }

  /** @param {Object} option 素材选项。 @param {Object | null} [editor] 画布实例。 @returns {Promise<void>} */
  async function selectMaterial(option, editor = getEditor()) {
    const targets = resolveMaterialTargetsForGroup(materialTargets.value, option?.groupId)
    if (!option?.url || !editor || materialReplacing.value || targets.length === 0) return
    materialReplacing.value = true
    operationStatus.value = { type: 'success', text: '' }
    try {
      await withTimeout(
        replaceImageTargets(editor, option.url, targets, 'contain'),
        IMAGE_REPLACEMENT_TIMEOUT
      )
      selectedMaterialId.value = option.id
    } catch (error) {
      console.error('[portrait-customization] 素材替换失败', error)
      operationStatus.value = { type: 'error', text: '素材切换失败，请重试。' }
    } finally {
      materialReplacing.value = false
    }
  }

  /** @param {number} [requestId] 当前页面请求 ID。 @returns {Promise<void>} 加载模板图片图层绑定的素材。 */
  async function loadMaterialOptions(requestId = reloadRequestId) {
    if (!materialGroupMode) return
    const groupIds = boundMaterialGroupIds.value
    materialOptions.value = []
    selectedMaterialId.value = ''
    materialOptionsError.value = ''
    if (groupIds.length === 0) return

    materialOptionsLoading.value = true
    try {
      const partnerId = readRouteValue(route.query.partnerId)
      const requestOptions = partnerId ? { partnerId } : {}
      const responses = await Promise.all(
        groupIds.map((groupId) =>
          customerMaterialGroupApi.materials(groupId, { page: 0, size: MATERIAL_PAGE_SIZE }, requestOptions)
        )
      )
      if (requestId !== reloadRequestId) return
      materialOptions.value = resolveMaterialOptions(responses, groupIds)
      selectedMaterialId.value = materialOptions.value[0]?.id || ''
      await applyInitialMaterial()
    } catch (error) {
      if (requestId !== reloadRequestId) return
      console.error('[portrait-customization] 素材组加载失败', error)
      materialOptionsError.value = '素材加载失败，请稍后重试。'
    } finally {
      if (requestId === reloadRequestId) materialOptionsLoading.value = false
    }
  }

  /** @param {*} error 画布加载错误。 @returns {void} */
  function handleCanvasError(error) {
    canvasLoaded.value = false
    handleTemplateCanvasError(error)
  }

  /** @returns {void} 返回小程序 AI 主题选择页继续生成主题。 */
  function tryMoreThemes() {
    const productInfoId = readRouteValue(route.query.productInfoId)
    const skuId = readRouteValue(route.query.skuId)
    const templateId = readRouteValue(route.query.templateId)
    const quantity = readRouteValue(route.query.quantity)
    if (!productInfoId || !skuId || !templateId || !quantity) {
      operationStatus.value = { type: 'warning', text: '缺少定制参数，暂时无法继续选择主题。' }
      return
    }

    persistThemeSelection()
    const query = new URLSearchParams()
    Object.entries(route.query).forEach(([key, value]) => {
      if (TRY_MORE_EXCLUDED_QUERY_KEYS.has(key)) return
      const values = Array.isArray(value) ? value : [value]
      values.forEach((item) => {
        if (item !== null && item !== undefined && item !== '') query.append(key, String(item))
      })
    })
    const skuData = readRouteValue(route.query.skuData)
    const redirectPath = readRouteValue(route.query.redirectPath)
    const aiSubjectIds = readRouteValue(route.query.aiSubjectIds)
    if (aiSubjectIds) query.set('aiSubjectIds', normalizeAiSubjectIds(aiSubjectIds))
    if (skuData) query.set('selectedSkuData', decodeRepeatedly(String(skuData)))
    if (redirectPath) query.set('redirectPath', decodeRepeatedly(String(redirectPath)))
    query.set('themeFlowId', themeFlowId.value)
    query.set('fromH5TryMore', '1')
    const url = `/subPackage2/template-list/ai-topic/index?${query.toString()}`

    preserveThemeFlowOnExit = true
    if (!wxAPI.redirectTo({ url })) {
      preserveThemeFlowOnExit = false
      operationStatus.value = { type: 'warning', text: '请在微信小程序中继续选择主题。' }
    }
  }

  function handlePageExit() {
    if (!preserveThemeFlowOnExit) clearThemeFlow(themeFlowId.value)
  }

  /**
   * 应用路由中默认选中的主题和背景图。
   *
   * @param {Object} editor 编辑器实例。
   * @returns {Promise<void>} 路由图片应用完成。
   */
  async function applyInitialRouteImages(editor) {
    const themeOption =
      aiThemeOptions.value.find((option) => option.id === selectedAiThemeId.value) ??
      resolveInitialOption(aiThemeOptions.value, String(imageTargets.value[0]?.url ?? ''))
    const backgroundOption =
      backgroundOptions.value.find((option) => {
        return option.id === selectedBackgroundId.value
      }) ?? resolveInitialOption(backgroundOptions.value, String(backgroundTargets.value[0]?.url ?? ''))

    selectedAiThemeId.value = themeOption?.id ?? ''
    selectedBackgroundId.value = backgroundOption?.id ?? ''
    imagePreviewUrl.value = themeOption?.url ?? getImageSource(editor, imageTargets.value[0])

    const currentThemeUrl = getImageSource(editor, imageTargets.value[0])
    const currentBackgroundUrl = getImageSource(editor, backgroundTargets.value[0])
    const tasks = []
    if (themeOption && imageTargets.value.length > 0 && themeOption.url !== currentThemeUrl) {
      tasks.push(() => replaceImages(editor, themeOption.url))
    }
    if (backgroundOption && backgroundTargets.value.length > 0 && backgroundOption.url !== currentBackgroundUrl) {
      tasks.push(() => replaceImageTargets(editor, backgroundOption.url, backgroundTargets.value, 'stretch'))
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
      await withTimeout(replaceImages(editor, option.url), IMAGE_REPLACEMENT_TIMEOUT)
      selectedAiThemeId.value = option.id
      imagePreviewUrl.value = option.url
      backgroundOptions.value = cloneBackgroundOptions(option.backgrounds)
      const backgroundOption = resolveInitialOption(backgroundOptions.value, '')
      selectedBackgroundId.value = backgroundOption?.id ?? ''
      if (backgroundOption && backgroundTargets.value.length > 0) {
        await withTimeout(
          replaceImageTargets(editor, backgroundOption.url, backgroundTargets.value, 'stretch'),
          IMAGE_REPLACEMENT_TIMEOUT
        )
      }
      persistThemeSelection()
    } catch (error) {
      console.error('Poetry AI theme replacement failed.', error)
      operationStatus.value = { type: 'error', text: '主题图片切换失败。' }
    } finally {
      imageReplacing.value = false
    }
  }

  /**
   * 将 H5 内生成的 AI 图片加入本次主题列表并立即应用到画布。
   *
   * @param {Object} result AI 主题组件生成结果。
   * @returns {Promise<void>} 图片应用完成。
   */
  async function addGeneratedTheme(result) {
    const imageUrl = String(result?.imageUrl ?? '').trim()
    if (!imageUrl) {
      operationStatus.value = { type: 'error', text: 'AI 生成结果缺少图片地址。' }
      return
    }

    const backgrounds = (Array.isArray(result?.backgroundImageUrls) ? result.backgroundImageUrls : []).map(
      (url, index) => ({
        id: 'background-' + (result?.topicId || 'generated') + '-' + (index + 1),
        label: '背景' + (index + 1),
        url
      })
    )
    themeFlow = upsertTheme(themeFlow, {
      id: result?.themeEntryId,
      label: result?.themeName,
      url: imageUrl,
      subjectId: result?.topicId,
      backgrounds
    })
    saveThemeFlow(themeFlowId.value, themeFlow)
    syncThemeOptionsFromFlow()

    const option = aiThemeOptions.value.find((item) => item.id === themeFlow.selectedThemeId)
    if (option) await selectAiTheme(option)
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
      await withTimeout(
        replaceImageTargets(editor, option.url, backgroundTargets.value, 'stretch'),
        IMAGE_REPLACEMENT_TIMEOUT
      )
      selectedBackgroundId.value = option.id
      persistThemeSelection()
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
   * @returns {string} 实际写入的文字。
   */
  function updateTextField(fieldId, value) {
    const field = textFields.value.find((item) => item.id === fieldId)
    const editor = getEditor()

    if (!field || !editor) {
      return String(value ?? '')
    }

    const nextValue = applyTextInputRules(value, field.rules)
    field.value = nextValue
    editor.getElementsByAttribute('text.description', field.description).forEach((element) => {
      if (String(element.text ?? '') !== nextValue) {
        editor.replaceTextWithRules(element, nextValue)
      }
    })
    return nextValue
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
      route.query.themeFlowId,
      route.query.themeEntryId,
      route.query.themeName,
      route.query.fromH5TryMore,
      route.query.imageUrl,
      route.query.id,
      route.query.aiSubjectIds,
      route.query.aiThemeUrl,
      route.query.aiThemeUrls,
      route.query.aiThemes,
      route.query.background_img_urls,
      route.query.backgroundImages,
      route.query.backgroundImageUrls,
      route.query.backgroundImageUrl
    ],
    () => {
      void reloadTemplate()
    },
    { immediate: true }
  )

  onMounted(() => window.addEventListener('pagehide', handlePageExit))
  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', handlePageExit)
    handlePageExit()
  })

  return {
    activeTab,
    addGeneratedTheme,
    aiThemeOptions,
    loadMaterialOptions,
    materialOptions,
    materialOptionsError,
    materialOptionsLoading,
    materialReplacing,
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
    redirecting,
    saveProgressText,
    saveStatus,
    saving,
    selectAiTheme,
    selectMaterial,
    selectBackground,
    selectedAiThemeId,
    selectedMaterialId,
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
 * @param {boolean} [includeRoleTargets=true] 是否包含 ai-variable 角色节点。
 * @returns {Object[]} 可替换图片节点。
 */
function resolveImageTargets(editor, descriptions, includeRoleTargets = true) {
  const targets = descriptions.flatMap((description) => {
    return editor.getElementsByAttribute('image.description', description)
  })
  const roleTargets = includeRoleTargets ? editor.getElementsByRole('ai-variable') : []

  return [...new Set([...targets, ...roleTargets])]
}

/**
 * 合并模板图片图层绑定的多个素材组，并在各组内按素材 URL 去重。
 *
 * @param {Array<*>} responses 素材组分页响应。
 * @param {Array<string | number>} groupIds 素材组 ID。
 * @returns {Array<{ id: string, label: string, url: string, groupId: string | number }>} 素材选项。
 */
export function resolveMaterialOptions(responses, groupIds) {
  const materialKeys = new Set()

  return (Array.isArray(responses) ? responses : []).flatMap((response, index) => {
    const groupId = groupIds?.[index]
    const page = normalizeMaterialPage(response, { page: 0, size: MATERIAL_PAGE_SIZE })

    return page.items.reduce((options, material) => {
      const materialKey = `${groupId}\u0000${material.materialUrl}`
      if (materialKeys.has(materialKey)) return options

      materialKeys.add(materialKey)
      options.push({
        id: `material-${groupId}-${material.id}`,
        label: material.materialName,
        url: material.materialUrl,
        groupId
      })
      return options
    }, [])
  })
}

/**
 * 从统一模板文档中递归读取图片图层绑定的素材组 ID。
 *
 * @param {Object | null | undefined} document 统一模板文档。
 * @returns {Array<string | number>} 去重后的素材组 ID。
 */
export function resolveTemplateMaterialGroupIds(document) {
  const ids = flattenDocumentElements(document?.elements).reduce((result, element) => {
    if (String(element?.tag ?? '').toLowerCase() !== 'image') return result

    const groupId = element?.attributes?.image?.materialGroupId
    if (groupId !== undefined && groupId !== null && groupId !== '') result.push(groupId)
    return result
  }, [])

  return normalizeMaterialGroupIds(ids)
}

/**
 * 按模板素材组绑定收集画布图片节点。
 *
 * @param {Object} editor 编辑器实例。
 * @param {Array<string | number>} groupIds 素材组 ID。
 * @returns {Array<{ groupId: string | number, targets: Object[] }>} 分组后的图片节点。
 */
export function resolveMaterialTargetGroups(editor, groupIds) {
  if (!editor?.getElementsByAttribute) return []

  return normalizeMaterialGroupIds(groupIds).reduce((groups, groupId) => {
    const aliases = [groupId]
    const stringId = String(groupId)
    if (!aliases.includes(stringId)) aliases.push(stringId)
    const numberId = Number(groupId)
    if (Number.isSafeInteger(numberId) && numberId > 0 && !aliases.includes(numberId)) {
      aliases.push(numberId)
    }
    const targets = [...new Set(aliases.flatMap((id) => {
      return editor.getElementsByAttribute('image.materialGroupId', id)
    }))]

    if (targets.length > 0) groups.push({ groupId, targets })
    return groups
  }, [])
}

/**
 * @param {Array<{ groupId: string | number, targets: Object[] }>} groups 图片节点分组。
 * @param {string | number} groupId 素材所属分组。
 * @returns {Object[]} 对应分组的图片节点。
 */
export function resolveMaterialTargetsForGroup(groups, groupId) {
  return (Array.isArray(groups) ? groups : []).find((group) => {
    return String(group.groupId) === String(groupId)
  })?.targets ?? []
}

/** @param {Object} editor 编辑器实例。 @returns {Object[]} 背景图片节点。 */
function resolveBackgroundTargets(editor) {
  return editor.getElementsByRole('background')
}

/**
 * @param {Object} editor 编辑器实例。
 * @param {Object | undefined} target 图片节点。
 * @returns {string} 图片 URL。
 */
function getImageSource(editor, target) {
  return String(editor.image?.getSource?.(target) ?? '')
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

  return options.find((option) => option.selected) ?? options.find((option) => option.url === currentUrl) ?? options[0]
}

function cloneBackgroundOptions(options) {
  return (Array.isArray(options) ? options : []).map((option) => ({ ...option }))
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

    const rules = normalizeTextInputRules(element.attributes?.textInput)
    fields.set(description, {
      id: String(element.elementId ?? description),
      description,
      label: resolveTextLabel(description, labels),
      value: extractTextInputValue(element),
      multiline: resolveMultilineField(description, rules),
      rules
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
 * @param {boolean} [preserveFrame=true] 是否保持原节点外框。
 * @returns {Promise<void>} 全部图片替换完成。
 */
async function replaceImageTargets(editor, imageUrl, targets, fit, preserveFrame = true) {
  await Promise.all(
    targets.map((target) =>
      editor.replaceImage(target, imageUrl, {
        fit,
        allowLocked: true,
        preserveFrame
      })
    )
  )
}

function withTimeout(promise, timeout) {
  let timer
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('图片加载超时，请重试。')), timeout)
    })
  ]).finally(() => clearTimeout(timer))
}

function decodeRepeatedly(value) {
  let result = value

  for (let round = 0; round < 5; round += 1) {
    try {
      const decoded = decodeURIComponent(result)
      if (decoded === result) break
      result = decoded
    } catch {
      break
    }
  }

  return result
}

function normalizeAiSubjectIds(value) {
  const decoded = decodeRepeatedly(String(value)).trim()
  if (!decoded) return ''

  try {
    const parsed = JSON.parse(decoded)
    if (Array.isArray(parsed)) return parsed.map(String).join(',')
  } catch {
    // Comma-separated values are the normal route format.
  }

  return decoded
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',')
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
    return supportsMultilineInput(rules)
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
    文本替换: labels.replacement,
    文案替换: labels.replacement,
    主标题: labels.title,
    副标题: '副标题',
    落款: '落款'
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
