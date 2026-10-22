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
  const minorGrid = createGridDotsNode(options.grid.color);
  const majorGrid = createGridDotsNode(options.grid.majorColor);
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
  // Freeform-style canvas surfaces use one quiet dot rhythm instead of
  // competing minor and major line grids.
  majorGrid.visible = false;

  if (!showGrid) {
    return;
  }

  minorGrid.fill = options.grid.color;
  minorGrid.path = createDotPath(size, options.grid.size, 1.35);
}

/**
 * 创建网格点节点。
 *
 * @param {string} color 点颜色。
 * @returns {Path} 网格线节点。
 */
function createGridDotsNode(color) {
  return new Path({
    path: '',
    fill: color,
    strokeWidth: 0,
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
function createDotPath(size, step, radius) {
  const paths = [];
  const bounds = new Bounds(0, 0, size.width, size.height);

  for (let x = bounds.minX; x <= bounds.maxX; x += step) {
    for (let y = bounds.minY; y <= bounds.maxY; y += step) {
      paths.push(
        `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} `
        + `A ${radius} ${radius} 0 1 0 ${x - radius} ${y}`
      );
    }
  }

  return paths.join(' ');
}
