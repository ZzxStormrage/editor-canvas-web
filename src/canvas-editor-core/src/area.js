import { Group, Path, Rect, Bounds } from 'leafer-ui';

const areaParts = new WeakMap();

/**
 * 创建画布区域背景。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {Object} options 归一化后的初始化参数。
 * @returns {Group} 区域背景节点组。
 */
export function createArea(size, options) {
  const background = new Rect({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    fill: options.background,
    hittable: false,
    editable: false,
    draggable: false
  });
  const minorGrid = createGridPathNode(options.grid.color);
  const majorGrid = createGridPathNode(options.grid.majorColor);
  const area = new Group({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    hittable: false,
    hitChildren: false,
    editable: false,
    draggable: false
  });

  areaParts.set(area, {
    background,
    minorGrid,
    majorGrid
  });

  area.add([background, minorGrid, majorGrid]);
  updateArea(area, size, options);

  return area;
}

/**
 * 同步区域背景。
 *
 * @param {Group} area 区域背景节点组。
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {Object} options 区域配置。
 * @returns {void}
 */
export function updateArea(area, size, options) {
  const { background, minorGrid, majorGrid } = areaParts.get(area);

  area.width = size.width;
  area.height = size.height;
  background.width = size.width;
  background.height = size.height;
  background.fill = options.grid.backgroundColor;

  const showGrid = options.showGrid ?? options.areaType === 'grid';
  minorGrid.visible = showGrid;
  majorGrid.visible = showGrid;

  if (!showGrid) {
    return;
  }

  minorGrid.stroke = options.grid.color;
  minorGrid.path = createGridPath(size, options.grid.size, options.grid.majorSize);
  majorGrid.stroke = options.grid.majorColor;
  majorGrid.path = createGridPath(size, options.grid.majorSize);
}

/**
 * 创建网格线节点。
 *
 * @param {string} stroke 线条颜色。
 * @returns {Path} 网格线节点。
 */
function createGridPathNode(stroke) {
  return new Path({
    path: '',
    stroke,
    strokeWidth: 1,
    hittable: false,
    editable: false,
    draggable: false
  });
}

/**
 * 使用 Bounds 创建网格 Path 字符串。
 *
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {number} step 网格间距。
 * @param {number} [skipStep] 跳过的主网格间距。
 * @returns {string} Path 字符串。
 */
function createGridPath(size, step, skipStep) {
  const paths = [];
  const bounds = new Bounds(0, 0, size.width, size.height);

  for (let x = bounds.minX; x <= bounds.maxX; x += step) {
    if (shouldSkipLine(x, skipStep)) {
      continue;
    }

    paths.push(`M ${x} ${bounds.minY} V ${bounds.maxY}`);
  }

  for (let y = bounds.minY; y <= bounds.maxY; y += step) {
    if (shouldSkipLine(y, skipStep)) {
      continue;
    }

    paths.push(`M ${bounds.minX} ${y} H ${bounds.maxX}`);
  }

  return paths.join(' ');
}

/**
 * 判断当前网格线是否应该跳过。
 *
 * @param {number} position 线条位置。
 * @param {number} [skipStep] 跳过间距。
 * @returns {boolean} 是否跳过。
 */
function shouldSkipLine(position, skipStep) {
  return skipStep ? position % skipStep === 0 : false;
}
