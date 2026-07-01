import { MathHelper } from 'leafer-ui';

/**
 * 在 leafer 的 Interaction 实例上覆盖 zoom/wheel/multiTouch 方法，
 * 实现滚轮缩放、移动端双指缩放（pinch）和 Safari 手势缩放。
 *
 * 原理：leafer-ui 的 InteractionBase 已对 DOM wheel/touch/gesture 事件做了完整捕获，
 * 但 zoom/wheel/multiTouch 三个方法是空的 stub，注释说明 "@leafer-in/viewport will rewrite"。
 * 我们在这三个 stub 上注入编辑器自身的缩放逻辑。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {Object} editor 编辑器实例。
 */
export function setupZoomInteraction(editor) {
  const { leafer, stage, state, eventBus } = editor;
  const interaction = leafer.interaction;
  if (!interaction) return;

  // ── 核心：zoom(data) —— 由 wheel 和 multiTouch 共同调用 ──
  interaction.zoom = function (data) {
    const scale = data.scale || 1;
    const curZoom = state.zoom;
    const newZoom = MathHelper.within(
      curZoom * scale,
      state.zoomOptions.min,
      state.zoomOptions.max
    );
    const ratio = newZoom / curZoom;

    // 缩放以鼠标/触摸中心点为锚点
    if (data.x != null && data.y != null) {
      // data.x / data.y 是画布坐标系下的坐标（由 Interaction.getLocal 产出）
      stage.x = data.x - (data.x - stage.x) * ratio;
      stage.y = data.y - (data.y - stage.y) * ratio;
    }

    state.zoom = newZoom;
    stage.scale = newZoom;
    eventBus.emit('viewport:zoom-changed', { zoom: newZoom });
  };

  // ── 滚轮缩放（桌面端）──
  interaction.wheel = function (data) {
    const config = interaction.config.wheel;
    const delta = config.delta || { y: 8.0 };
    const zoomSpeed = config.zoomSpeed ?? 0.15;

    // deltaY > 0 = 向下滚动 → 缩小  |  deltaY < 0 = 向上滚动 → 放大
    const scale = Math.pow(2, -data.deltaY * zoomSpeed / delta.y);

    interaction.zoom({
      ...data,
      scale,
      totalScale: state.zoom
    });
  };

  // ── 移动端双指缩放（pinch）──
  interaction.multiTouch = function (_data, list) {
    if (!list || list.length < 2) return;

    /**
     * 计算两个触点间的距离。
     * list 结构：[{ from: {x,y}, to: {x,y} }, { from: {x,y}, to: {x,y} }]
     */
    const dist = (list, key) => {
      const dx = list[1][key].x - list[0][key].x;
      const dy = list[1][key].y - list[0][key].y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const prevDist = dist(list, 'from');
    const currDist = dist(list, 'to');
    if (prevDist <= 0 || currDist <= 0) return;

    const scale = currDist / prevDist;

    // 以两指中心为缩放锚点
    const cx = (list[0].to.x + list[1].to.x) / 2;
    const cy = (list[0].to.y + list[1].to.y) / 2;

    interaction.zoom({
      x: cx,
      y: cy,
      scale,
      totalScale: state.zoom
    });
  };

  // ── 缩放结束清理 ──
  interaction.transformEnd = function () {
    // 暂不需要清理；保留以便后续添加惯性等逻辑
  };
}
