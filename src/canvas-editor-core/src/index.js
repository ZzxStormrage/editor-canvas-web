import { Group, Leafer, Bounds, isString } from 'leafer-ui';

import { createArea } from './area.js';
import { EventBus } from './logic/event-bus.js';
import { PluginManager } from './plugins/plugin-manager.js';
import { registerDefaultPlugins } from './plugins/index.js';
import { normalizeZoom } from './utils/zoom.js';
import { normalizeGridOptions } from './utils/grid.js';
import { resolveView, resolveSize } from './utils/view.js';
import { createResizeObserver } from './utils/dom.js';
import { normalizeInitOptions, normalizeAreaType, normalizeShowGrid } from './utils/options.js';
import { assertNotDestroyed } from './utils/assert.js';
import { setupZoomInteraction } from './utils/interaction-zoom.js';

/**
 * 初始化画布编辑器。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {Object} options 初始化参数。
 * @param {string | HTMLElement | HTMLCanvasElement} options.view 画布挂载容器。
 * @param {number} [options.width=750] 画布宽度。
 * @param {number} [options.height=1334] 画布高度。
 * @param {string} [options.background='#f7f8fa'] 画布背景色。
 * @param {boolean} [options.showGrid=true] 是否显示网格背景。
 * @param {'grid' | 'blank'} [options.areaType='grid'] 画布区域类型。
 * @param {Object} [options.grid] 网格配置。
 * @param {Object} [options.zoom] 缩放配置。
 * @param {Object} [options.image] 图片导入配置。
 * @param {number} [options.pixelRatio] 画布像素比。
 * @param {boolean} [options.autoResize=false] 是否跟随容器尺寸自动缩放。
 * @param {Object} [options.leaferOptions] 透传给 Leafer 的额外配置。
 * @returns {Object} 编辑器实例上下文。
 * @throws {EditorError} 当初始化参数非法时抛出。
 */
export function init(options = {}) {
  const normalizedOptions = normalizeInitOptions(options);
  const view = resolveView(normalizedOptions.view);
  const size = resolveSize(view, normalizedOptions);

  const leafer = new Leafer({
    view,
    width: size.width,
    height: size.height,
    fill: 'transparent',
    pixelRatio: normalizedOptions.pixelRatio,
    type: 'design',
    ...normalizedOptions.leaferOptions
  });
  const stage = new Group({
    x: 0,
    y: 0,
    scale: normalizedOptions.zoom.initial
  });
  const contentLayer = new Group({
    x: 0,
    y: 0
  });
  const area = createArea(size, normalizedOptions);
  const eventBus = new EventBus();
  const pluginManager = new PluginManager();
  const state = {
    view,
    width: size.width,
    height: size.height,
    zoom: normalizedOptions.zoom.initial,
    zoomOptions: normalizedOptions.zoom,
    imageOptions: normalizedOptions.image,
    background: normalizedOptions.background,
    showGrid: normalizedOptions.showGrid,
    areaType: normalizedOptions.areaType,
    grid: normalizedOptions.grid,
    destroyed: false
  };
  const context = {
    leafer,
    stage,
    contentLayer,
    eventBus,
    state
  };

  // area（网格+背景）直接挂到 leafer 上，不随 stage.scale 缩放
  // contentLayer 挂在 stage 上，参与缩放
  stage.add(contentLayer);
  leafer.add(area, 0);
  leafer.add(stage, 1);
  registerDefaultPlugins(pluginManager);
  pluginManager.bootstrap(context);

  const imagePlugin = pluginManager.get('image');

  const editor = {
    leafer,
    stage,
    contentLayer,
    eventBus,
    pluginManager,
    image: imagePlugin,
    state,

    /**
     * 调整画布尺寸。
     *
     * @param {number} width 新宽度。
     * @param {number} height 新高度。
     * @returns {Object} 编辑器实例。
     */
    resize(width, height) {
      assertNotDestroyed(state);

      const nextSize = new Bounds(0, 0, Number(width), Number(height));

      state.width = nextSize.width;
      state.height = nextSize.height;
      leafer.resize(nextSize);
      eventBus.emit('canvas:resized', { width: nextSize.width, height: nextSize.height });

      return editor;
    },

    /**
     * 设置画布背景色。
     *
     * @param {string} background 背景色。
     * @returns {Object} 编辑器实例。
     */
    setBackground(background) {
      assertNotDestroyed(state);

      state.background = background;
      state.grid = normalizeGridOptions({ background, backgroundColor: background }, state.grid);
      eventBus.emit('canvas:background-changed', { background });

      return editor;
    },

    /**
     * 设置缩放比例。
     *
     * @param {number} zoom 缩放值。
     * @returns {Object} 编辑器实例。
     */
    setZoom(zoom) {
      assertNotDestroyed(state);

      state.zoom = normalizeZoom(zoom, state.zoomOptions);
      stage.scale = state.zoom;
      eventBus.emit('viewport:zoom-changed', { zoom: state.zoom });

      return editor;
    },

    /**
     * 放大画布。
     *
     * @param {number} [step] 步进值，默认使用 zoomOptions.step。
     * @returns {Object} 编辑器实例。
     */
    zoomIn(step = state.zoomOptions.step) {
      assertNotDestroyed(state);
      return editor.setZoom(state.zoom + step);
    },

    /**
     * 缩小画布。
     *
     * @param {number} [step] 步进值，默认使用 zoomOptions.step。
     * @returns {Object} 编辑器实例。
     */
    zoomOut(step = state.zoomOptions.step) {
      assertNotDestroyed(state);
      return editor.setZoom(state.zoom - step);
    },

    /**
     * 重置缩放。
     *
     * @returns {Object} 编辑器实例。
     */
    resetZoom() {
      assertNotDestroyed(state);
      return editor.setZoom(state.zoomOptions.initial);
    },

    /**
     * 设置画布区域类型。
     *
     * @param {string} areaType 区域类型 'grid' 或 'blank'。
     * @returns {Object} 编辑器实例。
     */
    setAreaType(areaType) {
      assertNotDestroyed(state);

      state.areaType = normalizeAreaType(areaType);
      state.showGrid = state.areaType === 'grid';
      eventBus.emit('canvas:area-type-changed', { areaType: state.areaType });

      return editor;
    },

    /**
     * 设置网格可见性。
     *
     * @param {boolean} showGrid 是否显示网格。
     * @returns {Object} 编辑器实例。
     */
    setShowGrid(showGrid) {
      assertNotDestroyed(state);

      state.showGrid = normalizeShowGrid(showGrid);
      state.areaType = state.showGrid ? 'grid' : 'blank';
      eventBus.emit('canvas:grid-visibility-changed', { showGrid: state.showGrid });

      return editor;
    },

    /**
     * 设置网格配置。
     *
     * @param {Object} [grid] 网格配置。
     * @returns {Object} 编辑器实例。
     */
    setGrid(grid = {}) {
      assertNotDestroyed(state);

      state.grid = normalizeGridOptions(grid, state.grid);
      state.background = state.grid.backgroundColor;
      eventBus.emit('canvas:grid-changed', { grid: state.grid });

      return editor;
    },

    /**
     * 销毁编辑器。
     *
     * @returns {void}
     */
    destroy() {
      if (state.destroyed) {
        return;
      }

      pluginManager.destroy();
      eventBus.clear();
      leafer.destroy();
      state.destroyed = true;
    }
  };

  let resizeObserver = null;

  if (normalizedOptions.autoResize) {
    resizeObserver = createResizeObserver(view, editor);
  }

  // 注入 leafer-ui 交互层的缩放逻辑：滚轮 / 双指捏合 / Safari 手势
  setupZoomInteraction(editor);

  return editor;
}
