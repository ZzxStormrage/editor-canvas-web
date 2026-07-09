/**
 * 编辑器使用的 Vuetify 主题名称。
 * 在 createVuetify({ theme.defaultTheme }) 中引用，方便后续切换主题。
 *
 * @type {string}
 */
export const EDITOR_THEME_NAME = 'eleLight';

/**
 * 编辑器主题色配置。
 * Vuetify 会把 colors 转换成 --v-theme-* CSS 变量，业务样式只读取变量取色。
 * 这里保留业务语义色，但不覆盖 Vuetify 组件内部 class。
 *
 * @type {Record<string, string>}
 */
export const EDITOR_THEME_COLORS = {
  background: '#f7f9fd',
  'on-background': '#172033',
  surface: '#ffffff',
  'on-surface': '#172033',
  primary: '#7c3aed',
  'on-primary': '#ffffff',
  secondary: '#22c7d5',
  'on-secondary': '#ffffff',
  accent: '#ec6cff',
  error: '#ef4444',
  'on-error': '#ffffff',
  info: '#2563eb',
  'on-info': '#ffffff',
  success: '#16a34a',
  'on-success': '#ffffff',
  warning: '#f59e0b',
  'on-warning': '#172033',
  'primary-soft': '#f3edff',
  panel: '#ffffff',
  workspace: '#eef1f8',
  canvas: '#f4f7fc',
  grid: '#dce3ef',
  text: '#172033',
  muted: '#667085',
  subtle: '#8a92a3',
  line: '#edf0f5',
  outline: '#97a2b6',
  control: '#f1f2f6',
  shadow: '#1c2439'
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
    rounded: 'lg',
    variant: 'flat',
    density: 'comfortable'
  },
  VBtnToggle: {
    color: 'primary',
    density: 'comfortable',
    rounded: 'lg',
    variant: 'tonal'
  },
  VChip: {
    density: 'comfortable',
    rounded: 'lg'
  },
  VSlider: {
    color: 'primary',
    density: 'compact',
    hideDetails: true
  },
  VTextField: {
    density: 'compact',
    variant: 'solo-filled',
    bgColor: 'control',
    color: 'primary',
    hideDetails: true,
    hideSpinButtons: true,
    flat: true,
    rounded: 'lg'
  },
  VSelect: {
    density: 'compact',
    variant: 'solo-filled',
    bgColor: 'control',
    color: 'primary',
    hideDetails: true,
    flat: true,
    rounded: 'lg'
  }
};
