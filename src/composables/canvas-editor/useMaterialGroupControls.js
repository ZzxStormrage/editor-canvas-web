import { computed, ref } from 'vue'

import { customMaterialGroupApi } from '../../api/index.js'
import {
  mergeMaterialPages,
  normalizeMaterialGroups,
  normalizeMaterialPage
} from './material-group-data.js'

const DEFAULT_MATERIAL_PAGE_SIZE = 20

/**
 * 管理宿主注入的素材组和组内素材分页。
 *
 * 素材组元数据来自跨端配置消息，组内图片由编辑器应用层按需请求；该能力不会写入
 * canvas-editor-core 或统一画布 JSON。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor
 * 获取编辑器实例。
 * @param {((message: string, type: 'success' | 'error') => void) | null} notify 消息通知方法。
 * @returns {Object} 素材组状态和操作。
 */
export function useMaterialGroupControls(getEditor, notify = null) {
  const materialGroups = ref([])
  const activeMaterialGroupId = ref(null)
  const materials = ref([])
  const materialTotal = ref(0)
  const materialPage = ref(-1)
  const materialLoading = ref(false)
  const materialLoadingMore = ref(false)
  const materialHasMore = ref(false)
  const materialError = ref('')
  const addingMaterialId = ref(null)
  const customizableMaterialIds = ref(new Set())
  let partnerId = null
  let selectionVersion = 0

  const activeMaterialGroup = computed(() => {
    return materialGroups.value.find((group) => {
      return String(group.id) === String(activeMaterialGroupId.value)
    }) ?? null
  })

  /**
   * 应用宿主传入的素材组，并请求指定默认组或第一组。
   *
   * @param {*} response 素材组数组或分页响应。
   * @param {{ partnerId?: string | number | null,
   * activeGroupId?: string | number | null }} [options={}] 请求上下文。
   * @returns {Promise<Object[]>} 第一组素材或空数组。
   */
  async function setMaterialGroups(response, options = {}) {
    selectionVersion += 1
    partnerId = normalizeMaterialRequestPartnerId(options.partnerId)
    materialGroups.value = normalizeMaterialGroups(response)
    resetMaterialState()

    const initialGroup = resolveInitialMaterialGroup(
      materialGroups.value,
      options.activeGroupId
    )
    return initialGroup ? selectMaterialGroup(initialGroup.id) : []
  }

  /**
   * 选择素材组并从第一页重新请求素材。
   *
   * @param {string | number} groupId 素材组 ID。
   * @returns {Promise<Object[]>} 当前组第一页素材。
   */
  async function selectMaterialGroup(groupId) {
    const group = materialGroups.value.find((item) => String(item.id) === String(groupId))
    if (!group) {
      return []
    }

    selectionVersion += 1
    activeMaterialGroupId.value = group.id
    resetMaterialPage()
    return loadMaterialPage(0)
  }

  /**
   * 加载当前素材组下一页。
   *
   * @returns {Promise<Object[]>} 新增素材。
   */
  async function loadMoreMaterials() {
    if (
      !activeMaterialGroup.value
      || materialLoading.value
      || materialLoadingMore.value
      || !materialHasMore.value
      || materialError.value
    ) {
      return []
    }

    return loadMaterialPage(materialPage.value + 1)
  }

  /**
   * 重试当前失败的素材请求。
   *
   * @returns {Promise<Object[]>} 请求得到的素材。
   */
  function retryMaterials() {
    materialError.value = ''
    return loadMaterialPage(materials.value.length ? materialPage.value + 1 : 0)
  }

  /**
   * 将素材图片添加到画布，图片插件会按原始比例缩放并居中。
   *
   * @param {Object} material 素材对象。
   * @returns {Promise<Object | null>} 新图片节点。
   */
  async function addMaterialToCanvas(material) {
    const editor = getEditor()
    const materialUrl = String(material?.materialUrl ?? '').trim()
    const materialId = String(material?.id ?? materialUrl)

    if (!editor || !materialUrl || addingMaterialId.value) {
      return null
    }

    addingMaterialId.value = materialId
    try {
      const image = await editor.image.add(materialUrl)
      if (customizableMaterialIds.value.has(materialId)) {
        editor.elementData?.set?.(image, { customization: { enabled: true } })
      }
      notify?.('素材已添加', 'success')
      return image
    } catch (error) {
      console.error('Material image add failed.', error)
      notify?.(error.message || '素材添加失败。', 'error')
      return null
    } finally {
      addingMaterialId.value = null
    }
  }

  /** @param {string | number} materialId 素材 ID。 @returns {void} */
  function toggleMaterialCustomization(materialId) {
    const key = String(materialId)
    const next = new Set(customizableMaterialIds.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    customizableMaterialIds.value = next
  }

  /** @param {string | number} materialId 素材 ID。 @returns {boolean} 是否开放定制。 */
  function isMaterialCustomizationEnabled(materialId) {
    return customizableMaterialIds.value.has(String(materialId))
  }

  /**
   * 请求指定页素材，并忽略切组后返回的旧请求。
   *
   * @private
   * @param {number} page 页码，从 0 开始。
   * @returns {Promise<Object[]>} 当前请求新增素材。
   */
  async function loadMaterialPage(page) {
    const group = activeMaterialGroup.value
    if (!group || materialLoading.value || materialLoadingMore.value) {
      return []
    }

    const requestVersion = selectionVersion
    const isFirstPage = page === 0
    materialError.value = ''
    materialLoading.value = isFirstPage
    materialLoadingMore.value = !isFirstPage

    try {
      const response = await customMaterialGroupApi.materials(
        group.id,
        { page, size: DEFAULT_MATERIAL_PAGE_SIZE },
        { partnerId }
      )
      if (requestVersion !== selectionVersion) {
        return []
      }

      const result = normalizeMaterialPage(response, {
        page,
        size: DEFAULT_MATERIAL_PAGE_SIZE
      })
      materials.value = isFirstPage
        ? result.items
        : mergeMaterialPages(materials.value, result.items)
      materialPage.value = page
      materialTotal.value = Math.max(result.totalElements, materials.value.length)
      materialHasMore.value = result.hasMore
        && (!result.hasKnownTotal || materials.value.length < materialTotal.value)
      return result.items
    } catch (error) {
      if (requestVersion === selectionVersion) {
        materialError.value = error.message || '素材加载失败。'
        console.error('Material group request failed.', error)
      }
      return []
    } finally {
      if (requestVersion === selectionVersion) {
        materialLoading.value = false
        materialLoadingMore.value = false
      }
    }
  }

  /** @returns {void} 清空素材组和分页状态。 */
  function resetMaterialState() {
    activeMaterialGroupId.value = null
    resetMaterialPage()
  }

  /** @returns {void} 清空当前组分页状态。 */
  function resetMaterialPage() {
    materials.value = []
    materialTotal.value = 0
    materialPage.value = -1
    materialHasMore.value = false
    materialLoading.value = false
    materialLoadingMore.value = false
    materialError.value = ''
    addingMaterialId.value = null
  }

  return {
    materialGroups,
    activeMaterialGroupId,
    activeMaterialGroup,
    materials,
    materialTotal,
    materialLoading,
    materialLoadingMore,
    materialHasMore,
    materialError,
    addingMaterialId,
    customizableMaterialIds,
    toggleMaterialCustomization,
    isMaterialCustomizationEnabled,
    setMaterialGroups,
    selectMaterialGroup,
    loadMoreMaterials,
    retryMaterials,
    addMaterialToCanvas
  }
}

/**
 * 获取配置指定的默认素材组；无匹配项时回退到第一组。
 *
 * @param {Object[]} materialGroups 素材组列表。
 * @param {string | number | null | undefined} activeGroupId 默认素材组 ID。
 * @returns {Object | null} 初始素材组。
 */
export function resolveInitialMaterialGroup(materialGroups, activeGroupId) {
  if (!Array.isArray(materialGroups) || materialGroups.length === 0) {
    return null
  }

  return materialGroups.find((group) => {
    return String(group.id) === String(activeGroupId)
  }) ?? materialGroups[0]
}

/**
 * 归一化素材接口可选的分销商 ID。
 *
 * 后台未配置、传入 0 或传入无效文本时返回 null，素材请求将不携带 X-Partner-Id。
 *
 * @param {*} value 分销商 ID。
 * @returns {number | null} 可用于请求头的正整数。
 */
export function normalizeMaterialRequestPartnerId(value) {
  const source = Array.isArray(value) ? value[0] : value
  const number = Number(source)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}
