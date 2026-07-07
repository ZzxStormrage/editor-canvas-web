/**
 * canvas-editor-core 基础配置，初始化时会作为默认值使用。
 *
 * @author zzx
 * @since 2026-06-30
 */
export const DEFAULT_CANVAS_CONFIG = {
  width: 750,
  height: 1334,
  background: '#f7f8fa',
  showGrid: true,
  areaType: 'grid',
  autoResize: false,
  zoom: {
    min: 0.2,
    max: 4,
    step: 0.1,
    initial: 1
  },
  image: {
    maxWidthRatio: 0.8,
    maxHeightRatio: 0.8,
    lockRatio: true
  },
  text: {
    text: '双击编辑文字',
    fontFamily: 'PingFang SC',
    fontSize: 36,
    fontWeight: 'normal',
    italic: false,
    fill: '#1f2937',
    textAlign: 'center',
    textDecoration: 'none',
    letterSpacing: 0,
    verticalAlign: 'top',
    writingMode: 'x',
    lineHeight: 44,
    width: 360
  },
  grid: {
    size: 24,
    color: '#eef1f5',
    majorSize: 120,
    majorColor: '#dce2ea',
    backgroundColor: '#f7f8fa',
    background:
      'linear-gradient(#eef1f5 1px, transparent 1px), linear-gradient(90deg, #eef1f5 1px, transparent 1px), #f7f8fa',
    backgroundSize: '24px 24px'
  },
  editor: {
    keyEvent: true,
    stroke: '#4A90D9',
    strokeWidth: 1,
    pointFill: '#FFFFFF',
    pointSize: 10,
    pointRadius: 16,
    middlePoint: {
      width: 14,
      height: 6,
      cornerRadius: 3,
      fill: '#FFFFFF',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      shadow: { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(15, 23, 42, 0.2)' }
    },
    rotateGap: 45,
    moveCursor: 'move',
    buttonsDirection: 'bottom',
    buttonsMargin: 12,
    hideOnSmall: true,
    selector: true,
    editBox: true,
    hover: true,
    select: 'press',
    openInner: false,
    multipleSelect: true,
    boxSelect: true,
    moveable: true,
    resizeable: true,
    flipable: true,
    rotateable: true,
    skewable: true,
    arrowStep: 1,
    arrowFastStep: 10
  },
  leaferOptions: {}
}
