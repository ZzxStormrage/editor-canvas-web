/**
 * 编辑器配置归一化工具。
 *
 * 将外部传入的编辑器配置与默认值合并，覆盖到 DEFAULT_CANVAS_CONFIG.editor。
 *
 * @author zzx
 * @since 2026-07-01
 */

/**
 * 归一化编辑器配置。
 *
 * @param {Object} [userEditor={}] 外部传入的编辑器选项。
 * @param {Object} [defaults={}] 默认编辑器配置。
 * @returns {Object} 归一化后的编辑器配置。
 */
export function normalizeEditorOptions(userEditor = {}, defaults = {}) {
  const theme = normalizeThemeOptions(userEditor.theme, defaults.theme)

  return {
    theme,
    stroke: userEditor.stroke ?? theme.primaryColor ?? defaults.stroke,
    strokeWidth: userEditor.strokeWidth ?? defaults.strokeWidth,
    pointFill: userEditor.pointFill ?? theme.surfaceColor ?? defaults.pointFill,
    pointSize: userEditor.pointSize ?? defaults.pointSize,
    pointRadius: userEditor.pointRadius ?? defaults.pointRadius,
    middlePoint: userEditor.middlePoint ?? createMiddlePointOptions(defaults.middlePoint, theme),
    rotateGap: userEditor.rotateGap ?? defaults.rotateGap,
    rotateSnap: userEditor.rotateSnap ?? defaults.rotateSnap,
    moveSnap: userEditor.moveSnap ?? defaults.moveSnap,
    circle: userEditor.circle ?? createCircleOptions(defaults.circle, theme),
    circleDirection: userEditor.circleDirection ?? defaults.circleDirection,
    circleMargin: userEditor.circleMargin ?? defaults.circleMargin,
    moveCursor: userEditor.moveCursor ?? defaults.moveCursor,
    buttonsDirection: userEditor.buttonsDirection ?? defaults.buttonsDirection,
    buttonsMargin: userEditor.buttonsMargin ?? defaults.buttonsMargin,
    hideRotatePoints: userEditor.hideRotatePoints ?? defaults.hideRotatePoints,
    hideOnSmall: userEditor.hideOnSmall ?? defaults.hideOnSmall,
    keyEvent: userEditor.keyEvent ?? defaults.keyEvent,
    selector: userEditor.selector ?? defaults.selector,
    editBox: userEditor.editBox ?? defaults.editBox,
    hover: userEditor.hover ?? defaults.hover,
    hoverStyle: mergePlainObject(defaults.hoverStyle, userEditor.hoverStyle),
    hoverPathType: userEditor.hoverPathType ?? defaults.hoverPathType,
    selectedStyle: mergePlainObject(defaults.selectedStyle, userEditor.selectedStyle),
    selectedPathType: userEditor.selectedPathType ?? defaults.selectedPathType,
    select: userEditor.select ?? defaults.select,
    openInner: userEditor.openInner ?? defaults.openInner,
    multipleSelect: userEditor.multipleSelect ?? defaults.multipleSelect,
    boxSelect: userEditor.boxSelect ?? defaults.boxSelect,
    moveable: userEditor.moveable ?? defaults.moveable,
    resizeable: userEditor.resizeable ?? defaults.resizeable,
    flipable: userEditor.flipable ?? defaults.flipable,
    rotateable: userEditor.rotateable ?? defaults.rotateable,
    skewable: userEditor.skewable ?? defaults.skewable,
    arrowStep: userEditor.arrowStep ?? defaults.arrowStep,
    arrowFastStep: userEditor.arrowFastStep ?? defaults.arrowFastStep,
    beforeMove: userEditor.beforeMove,
    beforeRotate: userEditor.beforeRotate
  }
}

function normalizeThemeOptions(userTheme = {}, defaults = {}) {
  return mergePlainObject(defaults, userTheme ?? {})
}

function createMiddlePointOptions(defaults = {}, theme = {}) {
  return {
    ...defaults,
    fill: theme.surfaceColor ?? defaults.fill,
    stroke: theme.borderColor ?? defaults.stroke,
    shadow: theme.middleHandleShadow ?? defaults.shadow
  }
}

function createCircleOptions(defaults = {}, theme = {}) {
  return {
    ...defaults,
    fill: theme.surfaceColor ?? defaults.fill,
    stroke: theme.borderColor ?? defaults.stroke
  }
}

function mergePlainObject(base = {}, patch = {}) {
  const merged = { ...base }

  Object.entries(patch).forEach(([key, value]) => {
    const baseValue = base[key]
    const shouldDeepMerge = isPlainObject(baseValue) && isPlainObject(value)
    merged[key] = shouldDeepMerge ? mergePlainObject(baseValue, value) : value
  })

  return merged
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}
