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
    maxHeightRatio: 0.8
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
  leaferOptions: {}
};
