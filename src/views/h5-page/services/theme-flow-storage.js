const STORAGE_PREFIX = 'ele-editor:h5-theme-flow:'
const MAX_THEMES = 20

export function loadThemeFlow(flowId) {
  const key = createStorageKey(flowId)
  if (!key) return createEmptyFlow()

  try {
    return normalizeFlow(JSON.parse(localStorage.getItem(key) || '{}'))
  } catch {
    return createEmptyFlow()
  }
}

export function saveThemeFlow(flowId, flow) {
  const key = createStorageKey(flowId)
  if (!key) return false

  try {
    localStorage.setItem(key, JSON.stringify(normalizeFlow(flow)))
    return true
  } catch (error) {
    console.warn('Theme flow state could not be saved.', error)
    return false
  }
}

export function clearThemeFlow(flowId) {
  const key = createStorageKey(flowId)
  if (!key) return false

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn('Theme flow state could not be cleared.', error)
    return false
  }
}

export function upsertTheme(flow, theme) {
  const normalizedFlow = normalizeFlow(flow)
  const normalizedTheme = normalizeTheme(theme, normalizedFlow.themes.length)
  if (!normalizedTheme) return normalizedFlow

  const themes = normalizedFlow.themes.filter((item) => item.url !== normalizedTheme.url)
  themes.push(normalizedTheme)

  return {
    themes: themes.slice(-MAX_THEMES),
    selectedThemeId: normalizedTheme.id
  }
}

function normalizeFlow(value) {
  const themes = (Array.isArray(value?.themes) ? value.themes : [])
    .flatMap((theme, index) => normalizeTheme(theme, index) ?? [])
    .slice(-MAX_THEMES)
  const selectedThemeId = themes.some((theme) => theme.id === value?.selectedThemeId)
    ? value.selectedThemeId
    : themes[themes.length - 1]?.id ?? ''

  return { themes, selectedThemeId }
}

function normalizeTheme(value, index) {
  if (!value || typeof value !== 'object') return null
  const url = normalizeUrl(value.url)
  if (!url) return null

  const backgrounds = (Array.isArray(value.backgrounds) ? value.backgrounds : [])
    .flatMap((background, backgroundIndex) => {
      const backgroundUrl = normalizeUrl(background?.url ?? background)
      if (!backgroundUrl) return []
      return [{
        id: String(background?.id || `background-${index + 1}-${backgroundIndex + 1}`),
        label: String(background?.label || `背景${backgroundIndex + 1}`),
        url: backgroundUrl,
        selected: background?.selected === true
      }]
    })

  return {
    id: String(value.id || `theme-${index + 1}`),
    label: String(value.label || `主题${index + 1}`),
    url,
    subjectId: String(value.subjectId || ''),
    backgrounds
  }
}

function normalizeUrl(value) {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  return /^(https?:\/\/|\/)/i.test(url) && !url.startsWith('//') ? url : ''
}

function createStorageKey(flowId) {
  const normalized = typeof flowId === 'string' ? flowId.trim() : ''
  return normalized && /^[\w-]{6,80}$/.test(normalized) ? `${STORAGE_PREFIX}${normalized}` : ''
}

function createEmptyFlow() {
  return { themes: [], selectedThemeId: '' }
}
