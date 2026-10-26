import { Group } from 'leafer-ui';

const areaViews = new WeakMap();
const viewStyles = new WeakMap();
const BACKGROUND_STYLES = [
  'backgroundColor', 'backgroundImage', 'backgroundRepeat',
  'backgroundSize', 'backgroundPosition'
];

/**
 * 创建画布区域；装饰背景由 CSS 绘制，不进入 Canvas 命中检测。
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {Object} options 归一化后的初始化参数。
 * @param {HTMLElement} view Leafer 的交互 DOM 容器。
 * @returns {Group} 不含绘制节点的区域容器。
 */
export function createArea(size, options, view) {
  const area = new Group({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    hittable: false,
    hitSelf: false,
    hitChildren: false,
    editable: false,
    draggable: false
  });

  areaViews.set(area, view);
  viewStyles.set(view, Object.fromEntries(
    BACKGROUND_STYLES.map((key) => [key, view.style[key]])
  ));
  updateArea(area, size, options);
  return area;
}

/**
 * 同步区域背景；网格显示、颜色和间距继续使用编辑器原有配置。
 * @param {Group} area 区域容器。
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {Object} options 区域配置。
 * @returns {void}
 */
export function updateArea(area, size, options) {
  const view = areaViews.get(area);
  area.width = size.width;
  area.height = size.height;

  const showGrid = options.showGrid ?? options.areaType === 'grid';
  const step = options.grid.size;
  // 固定屏幕坐标的点阵不随内容变换，不需要逐帧生成路径。
  Object.assign(view.style, {
    backgroundColor: options.grid.backgroundColor ?? options.background,
    backgroundImage: showGrid
      ? 'radial-gradient(circle, ' + options.grid.color + ' 1.35px, transparent 1.5px)'
      : 'none',
    backgroundRepeat: 'repeat',
    backgroundSize: step + 'px ' + step + 'px',
    backgroundPosition: -step / 2 + 'px ' + -step / 2 + 'px'
  });
}

/**
 * 销毁装饰背景，还原容器原有样式。
 * @param {HTMLElement} view 编辑器交互容器。
 * @returns {void}
 */
export function destroyArea(view) {
  const styles = viewStyles.get(view);
  if (styles) {
    Object.assign(view.style, styles);
    viewStyles.delete(view);
  }
}
