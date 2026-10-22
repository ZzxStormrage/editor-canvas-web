/**
 * 编辑器使用的 Vuetify 主题名称。
 * 在 createVuetify({ theme.defaultTheme }) 中引用，方便后续切换主题。
 *
 * @type {string}
 */
export const EDITOR_THEME_NAME = 'canvasLight';

/**
 * 编辑器主题色配置。
 * Vuetify 会把 colors 转换成 --v-theme-* CSS 变量，业务样式只读取变量取色。
 * 这里保留业务语义色，但不覆盖 Vuetify 组件内部 class。
 *
 * @type {Record<string, string>}
 */
export const EDITOR_THEME_COLORS = {
  background: '#f5f5f7',
  'on-background': '#1d1d1f',
  surface: '#ffffff',
  'on-surface': '#1d1d1f',
  primary: '#007aff',
  'on-primary': '#ffffff',
  secondary: '#5856d6',
  'on-secondary': '#ffffff',
  accent: '#5ac8fa',
  error: '#ef4444',
  'on-error': '#ffffff',
  info: '#2563eb',
  'on-info': '#ffffff',
  success: '#16a34a',
  'on-success': '#ffffff',
  warning: '#f59e0b',
  'on-warning': '#172033',
  'primary-soft': '#e8f2ff',
  panel: '#ffffff',
  workspace: '#ececf0',
  canvas: '#f2f2f5',
  grid: '#d9d9df',
  text: '#1d1d1f',
  muted: '#636366',
  subtle: '#8e8e93',
  line: '#e3e3e8',
  outline: '#aeaeb2',
  control: '#f5f5f7',
  shadow: '#1d1d1f'
};

/**
 * Vuetify 组件默认配置。
 * 这里只使用 Vuetify 公开 props，例如 variant、density、color、rounded。
 * 页面局部尺寸差异在组件模板里继续用 props 单独声明。
 *
 * @type {Object}
 */
export const EDITOR_COMPONENT_DEFAULTS = {
  VBtn: {
    rounded: 'md',
    variant: 'flat',
    density: 'compact',
    size: 'small',
    height: 34
  },
  VBtnToggle: {
    color: 'primary',
    density: 'compact',
    rounded: 'md',
    variant: 'tonal'
  },
  VChip: {
    density: 'compact',
    rounded: 'md',
    size: 'small'
  },
  VSlider: {
    color: 'primary',
    density: 'compact',
    hideDetails: true
  },
  VTextField: {
    density: 'compact',
    variant: 'outlined',
    bgColor: 'surface',
    color: 'primary',
    hideDetails: true,
    rounded: 'md'
  },
  VColorInput: {
    density: 'compact',
    variant: 'outlined',
    bgColor: 'surface',
    color: 'primary',
    hideDetails: true,
    flat: true,
    rounded: 'md',
    mode: 'hex',
    modes: ['hex'],
    hideActions: true,
    hidePip: true,
    showSwatches: true,
    swatchesMaxHeight: 92,
    swatches: [
      ['#111827', '#374151', '#6b7280', '#ffffff'],
      ['#007aff', '#5ac8fa', '#5856d6', '#34c759'],
      ['#ef4444', '#f59e0b', '#16a34a', '#ec4899']
    ]
  },
  VNumberInput: {
    reverse: false,
    controlVariant: 'default',
    label: '',
    hideInput: false,
    inset: false,
    variant: 'solo-filled',
    density: 'compact',
    bgColor: 'surface',
    color: 'primary',
    hideDetails: true,
    flat: true,
    rounded: 0,
    VBtn: {
      rounded: 0,
      variant: 'text'
    }
  },
  VSelect: {
    density: 'compact',
    variant: 'outlined',
    bgColor: 'surface',
    color: 'primary',
    hideDetails: true,
    flat: true,
    rounded: 'md'
  }
};
