/**
 * 双指捏合缩放策略 —— **策略模式**
 *
 * 处理移动端 touch 事件的 pinch 手势。
 *
 * 算法：
 *   1. 计算上一帧两指距离 (prevDist)
 *   2. 计算当前帧两指距离 (currDist)
 *   3. scale = currDist / prevDist
 *   4. 锚点 = 两指中心
 *
 * @author zzx
 * @since 2026-07-01
 */
export class PinchZoomStrategy {
  /**
   * @param {Array} list — leafer interaction 传来的触点列表
   *   结构：[{ from: {x,y}, to: {x,y} }, { from: {x,y}, to: {x,y} }]
   * @returns {{ scale: number, anchorX: number, anchorY: number } | null}
   */
  handle(list) {
    if (!list || list.length < 2) return null;

    const prevDist = this.#dist(list, 'from');
    const currDist = this.#dist(list, 'to');

    if (prevDist <= 0 || currDist <= 0) return null;

    const scale = currDist / prevDist;

    // 忽略极小变化
    if (Math.abs(scale - 1) < 0.002) return null;

    // 两指中心
    const anchorX = (list[0].to.x + list[1].to.x) / 2;
    const anchorY = (list[0].to.y + list[1].to.y) / 2;

    return { scale, anchorX, anchorY };
  }

  /**
   * 计算两个触点之间的欧几里得距离。
   * @param {Array} list
   * @param {'from'|'to'} key
   * @returns {number}
   */
  #dist(list, key) {
    const dx = list[1][key].x - list[0][key].x;
    const dy = list[1][key].y - list[0][key].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
