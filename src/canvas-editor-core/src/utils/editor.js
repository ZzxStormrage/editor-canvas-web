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
  return {
    stroke: userEditor.stroke ?? defaults.stroke,
    strokeWidth: userEditor.strokeWidth ?? defaults.strokeWidth,
    pointFill: userEditor.pointFill ?? defaults.pointFill,
    pointSize: userEditor.pointSize ?? defaults.pointSize,
    pointRadius: userEditor.pointRadius ?? defaults.pointRadius,
    middlePoint: userEditor.middlePoint ?? defaults.middlePoint,
    rotateGap: userEditor.rotateGap ?? defaults.rotateGap,
    moveCursor: userEditor.moveCursor ?? defaults.moveCursor,
    buttonsDirection: userEditor.buttonsDirection ?? defaults.buttonsDirection,
    buttonsMargin: userEditor.buttonsMargin ?? defaults.buttonsMargin,
    hideOnSmall: userEditor.hideOnSmall ?? defaults.hideOnSmall,
    keyEvent: userEditor.keyEvent ?? defaults.keyEvent,
    selector: userEditor.selector ?? defaults.selector,
    editBox: userEditor.editBox ?? defaults.editBox,
    hover: userEditor.hover ?? defaults.hover,
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
    arrowFastStep: userEditor.arrowFastStep ?? defaults.arrowFastStep
  }
}
