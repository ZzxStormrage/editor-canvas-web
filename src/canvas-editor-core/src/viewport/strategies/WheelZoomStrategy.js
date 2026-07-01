/**
 * 滚轮缩放策略 —— **策略模式**
 *
 * 处理桌面端鼠标滚轮和触控板滚动事件。
 *
 * 核心公式：
 *   scale = 2 ^ ( -deltaY × speed / baseDelta )
 *
 * 等价于：向下滚 = 缩小，向上滚 = 放大
 *
 * @author zzx
 * @since 2026-07-01
 */
export class WheelZoomStrategy {
  /**
   * @param {Object} data — leafer interaction 传来的 wheel 数据
   * @param {number} data.deltaY — 归一化后的滚轮增量
   * @param {number} data.x — 光标 X（画布坐标系）
   * @param {number} data.y — 光标 Y（画布坐标系）
   * @param {Object} [config] — interaction.config.wheel
   * @param {{ y: number }} [config.delta] — 基准 delta 值
   * @param {number} [config.zoomSpeed] — 缩放灵敏系数
   * @returns {{ scale: number, anchorX: number, anchorY: number } | null}
   */
  handle(data, config = {}) {
    const delta = config.delta || { y: 8.0 };
    const speed = config.zoomSpeed ?? 0.15;   // 滚轮灵敏度（越小越慢）

    const scale = Math.pow(2, -data.deltaY * speed / delta.y);

    // 忽略极小的缩放变化（防抖）
    if (Math.abs(scale - 1) < 0.001) return null;

    return {
      scale,
      anchorX: data.x,
      anchorY: data.y
    };
  }
}
