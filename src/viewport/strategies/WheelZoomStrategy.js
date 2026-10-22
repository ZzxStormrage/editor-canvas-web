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
    const configuredDelta = Number(config.delta?.y);
    const baseDelta = Number.isFinite(configuredDelta) && configuredDelta > 0
      ? configuredDelta
      : 8;
    const configuredSpeed = Number(config.zoomSpeed);
    const speed = Number.isFinite(configuredSpeed) && configuredSpeed > 0
      ? configuredSpeed
      : 0.15;
    const wheelDelta = Number(data?.deltaY);

    if (!Number.isFinite(wheelDelta) || wheelDelta === 0) return null;

    // 不同浏览器和设备的单次 deltaY 可能从个位数到 120。限制到一个基准步长，
    // 避免普通鼠标滚动一次就从最小缩放跳到最大缩放。
    const normalizedDelta = Math.max(-baseDelta, Math.min(baseDelta, wheelDelta));

    const scale = Math.pow(2, -normalizedDelta * speed / baseDelta);

    // 忽略极小的缩放变化（防抖）
    if (Math.abs(scale - 1) < 0.001) return null;

    return {
      scale,
      anchorX: data.x,
      anchorY: data.y
    };
  }
}
