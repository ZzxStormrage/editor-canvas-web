// ─────────────────────────────────────────────────────────────────────────────
// 编辑器主题基础色
// -----------------------------------------------------------------------------
// 这里集中定义选择框、操作按钮、旋转按钮、吸附辅助线等编辑器控件的视觉 token。
// DEFAULT_CANVAS_CONFIG.editor.theme 会引用这些变量，外部也可以通过 init({ editor:
// { theme: ... } }) 覆盖同名字段，实现整套编辑器控件换肤。
// ─────────────────────────────────────────────────────────────────────────────

/** 编辑器主色：选择框描边、控制点 hover、吸附辅助线默认使用该颜色。 */
const EDITOR_THEME_PRIMARY = '#4A90D9'

/** 浮层和按钮的基础背景色。 */
const EDITOR_THEME_SURFACE = '#FFFFFF'

/** 浮层、按钮、控制点的边框颜色。 */
const EDITOR_THEME_BORDER = '#e5e7eb'

/** 正常状态图标与文字颜色。 */
const EDITOR_THEME_TEXT = '#111827'

/** 禁用状态图标与文字颜色。 */
const EDITOR_THEME_DISABLED_TEXT = '#a8b0bd'

/** 禁用状态按钮背景色。 */
const EDITOR_THEME_DISABLED_FILL = '#f7f8fa'

/** 鼠标经过按钮或菜单项时的背景色。 */
const EDITOR_THEME_HOVER_FILL = '#f3f4f6'

/** 透明按钮背景，用于保持可点击区域但不显示底色。 */
const EDITOR_THEME_TRANSPARENT_FILL = 'rgba(255, 255, 255, 0)'

/** 通用浮层阴影，用于顶部按钮组和旋转按钮。 */
const EDITOR_THEME_SHADOW = { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(15, 23, 42, 0.14)' }

/** 层级菜单阴影，略大于按钮阴影以突出弹层层级。 */
const EDITOR_THEME_MENU_SHADOW = { x: 0, y: 6, blur: 16, spread: 0, color: 'rgba(15, 23, 42, 0.14)' }

/** 边中间缩放把手默认阴影。 */
const EDITOR_THEME_HANDLE_SHADOW = { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(15, 23, 42, 0.2)' }

/** 边中间缩放把手 hover 阴影。 */
const EDITOR_THEME_HANDLE_HOVER_SHADOW = { x: 0, y: 3, blur: 10, spread: 0, color: 'rgba(37, 99, 235, 0.24)' }

/** 旋转角度提示的半透明背景色。 */
const EDITOR_THEME_ROTATION_TIP_FILL = 'rgba(0, 0, 0, 0.7)'

/** 内层画板默认阴影。 */
const ARTBOARD_SHADOW = { x: 0, y: 12, blur: 32, spread: 0, color: 'rgba(15, 23, 42, 0.18)' }

/**
 * 编辑器控件默认主题。
 *
 * 该对象只负责编辑器控件层的颜色和阴影，不影响画布内容元素本身。
 * 主要消费方：
 * - @leafer-in/editor 原生选择框配置：stroke、pointFill、middlePoint、circle。
 * - EditorActionButtons：锁定、复制、删除、层级、旋转按钮及菜单。
 * - editor-snap：移动吸附时显示的虚线辅助线。
 *
 * @type {Object}
 */
export const DEFAULT_EDITOR_THEME = {
  /** 主色：选择框描边、把手 hover、吸附辅助线。 */
  primaryColor: EDITOR_THEME_PRIMARY,

  /** 控件表面色：按钮组、菜单、旋转按钮的背景。 */
  surfaceColor: EDITOR_THEME_SURFACE,

  /** 控件边框色：按钮组、菜单、旋转按钮、把手描边。 */
  borderColor: EDITOR_THEME_BORDER,

  /** 正常文字和图标颜色。 */
  textColor: EDITOR_THEME_TEXT,

  /** 禁用文字和图标颜色。 */
  disabledTextColor: EDITOR_THEME_DISABLED_TEXT,

  /** 禁用按钮背景色。 */
  disabledFillColor: EDITOR_THEME_DISABLED_FILL,

  /** 鼠标经过按钮或菜单项时的填充色。 */
  hoverFillColor: EDITOR_THEME_HOVER_FILL,

  /** 未 hover 的透明按钮填充色。 */
  transparentFillColor: EDITOR_THEME_TRANSPARENT_FILL,

  /** 顶部按钮组和旋转按钮阴影。 */
  shadow: EDITOR_THEME_SHADOW,

  /** 层级菜单阴影。 */
  menuShadow: EDITOR_THEME_MENU_SHADOW,

  /** 边中间缩放把手默认阴影。 */
  middleHandleShadow: EDITOR_THEME_HANDLE_SHADOW,

  /** 边中间缩放把手 hover 阴影。 */
  middleHandleHoverShadow: EDITOR_THEME_HANDLE_HOVER_SHADOW,

  /** 旋转角度提示背景色。 */
  rotationTipFill: EDITOR_THEME_ROTATION_TIP_FILL,

  /** 旋转角度提示文字色。 */
  rotationTipTextColor: EDITOR_THEME_SURFACE,

  /** 移动吸附辅助线颜色，默认跟随主色。 */
  snapGuideColor: EDITOR_THEME_PRIMARY
}

/**
 * canvas-editor-core 基础配置，初始化时会作为默认值使用。
 *
 * 配置按能力域分组：
 * - zoom：视口缩放范围和步进。
 * - image/text：默认素材和文本创建参数。
 * - grid：画布背景网格参数。
 * - editor：选择框、控制点、快捷键、吸附和主题。
 * - leaferOptions：透传给 Leafer App 的底层配置。
 *
 * @author zzx
 * @since 2026-06-30
 * @type {Object}
 */
export const DEFAULT_CANVAS_CONFIG = {
  /** 默认画布宽度，单位为设计坐标。 */
  width: 750,

  /** 默认画布高度，单位为设计坐标。 */
  height: 1334,

  /** 默认画布背景色。 */
  background: '#f7f8fa',

  /** 是否显示网格；会与 areaType 保持联动。 */
  showGrid: true,

  /** 画布区域类型：grid 表示网格背景，blank 表示纯色背景。 */
  areaType: 'grid',

  /** 是否跟随容器尺寸自动调整画布视口。 */
  autoResize: false,

  /** 视口缩放配置。 */
  zoom: {
    /** 最小缩放倍数。 */
    min: 0.2,
    /** 最大缩放倍数。 */
    max: 4,
    /** 顶部按钮单次缩放步进，0.01 表示每次变化 1%。 */
    step: 0.01,
    /** 初始化缩放倍数。 */
    initial: 1
  },

  /** 图片插件默认配置。 */
  image: {
    /** 新增图片时相对画布宽度的最大占比。 */
    maxWidthRatio: 0.8,
    /** 新增图片时相对画布高度的最大占比。 */
    maxHeightRatio: 0.8,
    /** 默认保持图片宽高比。 */
    lockRatio: true
  },

  /** 文本插件默认配置。 */
  text: {
    /** 新增文本的默认内容。 */
    text: '双击编辑文字',
    /** 默认字体。 */
    fontFamily: 'PingFang SC',
    /** 默认字号。 */
    fontSize: 36,
    /** 默认字重。 */
    fontWeight: 'normal',
    /** 是否斜体。 */
    italic: false,
    /** 文本填充颜色。 */
    fill: '#1f2937',
    /** 文本水平对齐方式。 */
    textAlign: 'center',
    /** 文本装饰线。 */
    textDecoration: 'none',
    /** 字间距。 */
    letterSpacing: 0,
    /** 文本垂直对齐方式。 */
    verticalAlign: 'top',
    /** 书写方向：x 为横排，y 为竖排。 */
    writingMode: 'x',
    /** 默认行高。 */
    lineHeight: 44,
    /** 默认文本框宽度。 */
    width: 360
  },

  /** 画布网格配置。 */
  grid: {
    /** 小网格尺寸。 */
    size: 24,
    /** 小网格线颜色。 */
    color: '#eef1f5',
    /** 大网格尺寸。 */
    majorSize: 120,
    /** 大网格线颜色。 */
    majorColor: '#dce2ea',
    /** 网格区域底色，通常跟随画布背景色。 */
    backgroundColor: '#f7f8fa',
    /** CSS 背景声明，供 DOM 场景或调试视图复用。 */
    background:
      'linear-gradient(#eef1f5 1px, transparent 1px), linear-gradient(90deg, #eef1f5 1px, transparent 1px), #f7f8fa',
    /** CSS 背景尺寸，需与小网格尺寸保持一致。 */
    backgroundSize: '24px 24px'
  },

  /** 内层白色画板配置，后续素材新增、吸附和超出透明度都以它为操作区域。 */
  artboard: {
    /** 是否启用内层画板。 */
    enabled: true,
    /** 画板宽度。 */
    width: 375,
    /** 画板高度。 */
    height: 667,
    /** 画板最小宽度。 */
    minWidth: 120,
    /** 画板最小高度。 */
    minHeight: 120,
    /** 画板填充色。 */
    fill: '#ffffff',
    /** 画板阴影。 */
    shadow: ARTBOARD_SHADOW,
    /** 内容元素超过画板时的透明度；选择框和编辑按钮始终保持正常不透明。 */
    overflowOpacity: 0.05
  },
  /** Leafer 官方 Editor 和自定义编辑控件的配置。 */
  editor: {
    /** 编辑器控件主题，外部可覆盖同名字段实现换肤。 */
    theme: DEFAULT_EDITOR_THEME,

    /** 是否启用编辑器键盘事件。 */
    keyEvent: true,

    /** 选择框描边颜色，默认跟随主题主色。 */
    stroke: EDITOR_THEME_PRIMARY,

    /** 选择框描边宽度。 */
    strokeWidth: 1,

    /** 四角控制点填充色，默认跟随主题表面色。 */
    pointFill: EDITOR_THEME_SURFACE,

    /** 四角控制点尺寸。 */
    pointSize: 10,

    /** 四角控制点圆角。 */
    pointRadius: 16,

    /** 边中间缩放把手样式，用于控制上下高度或左右宽度。 */
    middlePoint: {
      /** 把手宽度。 */
      width: 14,
      /** 把手高度。 */
      height: 6,
      /** 把手圆角。 */
      cornerRadius: 3,
      /** 把手填充色。 */
      fill: EDITOR_THEME_SURFACE,
      /** 把手描边色。 */
      stroke: EDITOR_THEME_BORDER,
      /** 把手描边宽度。 */
      strokeWidth: 1,
      /** 把手默认阴影。 */
      shadow: EDITOR_THEME_HANDLE_SHADOW
    },

    /** Leafer 原生旋转角度吸附间隔。 */
    rotateGap: 45,

    /** 自定义旋转吸附配置。 */
    rotateSnap: {
      /** 是否启用旋转吸附。 */
      enabled: true,
      /** 吸附角度步进，例如 15 表示每 15 度吸附一次。 */
      step: 15,
      /** 距离目标角度多少度以内触发吸附。 */
      threshold: 3
    },

    /** 移动吸附配置。 */
    moveSnap: {
      /** 是否启用移动吸附。 */
      enabled: true,
      /** 距离目标线多少设计像素以内触发吸附。 */
      threshold: 6,
      /** 是否吸附到画布边缘和中心线。 */
      canvas: true,
      /** 是否吸附到同层其他元素的边缘和中心线。 */
      elements: true
    },

    /** 独立旋转按钮样式，使用 Leafer circle 控制点承载。 */
    circle: {
      /** 旋转按钮宽度。 */
      width: 30,
      /** 旋转按钮高度。 */
      height: 30,
      /** 旋转按钮圆角。 */
      cornerRadius: 8,
      /** 旋转按钮背景色。 */
      fill: EDITOR_THEME_SURFACE,
      /** 旋转按钮描边色。 */
      stroke: EDITOR_THEME_BORDER,
      /** 旋转按钮描边宽度。 */
      strokeWidth: 1
    },

    /** 旋转按钮相对选择框的位置。 */
    circleDirection: 'bottom',

    /** 旋转按钮与选择框之间的距离。 */
    circleMargin: 12,

    /** 鼠标经过选择框主体时的移动光标。 */
    moveCursor: 'move',

    /** 自定义操作按钮组位于选择框上方。 */
    buttonsDirection: 'top',

    /** 操作按钮组与选择框之间的距离。 */
    buttonsMargin: 12,

    /** 隐藏 Leafer 默认透明旋转控制点，只保留下方旋转按钮。 */
    hideRotatePoints: true,

    /** 元素过小时是否隐藏控制点，避免 UI 拥挤。 */
    hideOnSmall: true,

    /** 是否启用选择器。 */
    selector: true,

    /** 是否显示编辑框。 */
    editBox: true,

    /** 是否启用 hover 高亮。 */
    hover: true,

    /** 鼠标滑过元素时使用外框路径绘制 hover 边框。 */
    hoverPathType: 'box',

    /** 鼠标滑过元素时的边框样式。 */
    hoverStyle: {
      /** hover 边框颜色，默认跟随主题主色。 */
      stroke: EDITOR_THEME_PRIMARY,
      /** hover 边框宽度。 */
      strokeWidth: 1
    },

    /** 选中元素时使用外框路径绘制选中边框。 */
    selectedPathType: 'box',

    /** 选择触发方式：press 表示按下即选中。 */
    select: 'press',

    /** 双击选中元素时打开官方内部编辑器，例如 Text 会进入 TextEditor。 */
    openInner: 'double',

    /** 是否允许多选。 */
    multipleSelect: true,

    /** 是否允许框选。 */
    boxSelect: true,

    /** 是否允许移动元素。 */
    moveable: true,

    /** 是否允许缩放元素。 */
    resizeable: true,

    /** 是否允许翻转元素。 */
    flipable: true,

    /** 是否允许旋转元素。 */
    rotateable: true,

    /** 是否允许倾斜元素。 */
    skewable: true,

    /** 方向键单次移动距离。 */
    arrowStep: 1,

    /** 按住 Shift 时方向键单次移动距离。 */
    arrowFastStep: 10
  },

  /** 透传给 Leafer App 的底层配置。 */
  leaferOptions: {}
}
