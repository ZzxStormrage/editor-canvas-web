/**
 * 计算画布滚动条的滑块尺寸与位置。
 *
 * @param {{ viewportSize: number, contentSize: number, contentStart: number, trackSize: number, minThumbSize?: number }} options 滚动区域尺寸与位置。
 * @returns {{ visible: boolean, thumbSize: number, thumbPosition: number, maxThumbPosition: number, maxContentOffset: number, contentOffset: number }} 滚动条状态。
 */
export function getScrollbarMetrics({
  viewportSize,
  contentSize,
  contentStart,
  trackSize,
  minThumbSize = 28
}) {
  const viewport = Math.max(0, Number(viewportSize) || 0);
  const content = Math.max(0, Number(contentSize) || 0);
  const track = Math.max(0, Number(trackSize) || 0);
  const maxContentOffset = Math.max(0, content - viewport);
  const visible = maxContentOffset > 1 && track > 0;

  if (!visible) {
    return {
      visible: false,
      thumbSize: track,
      thumbPosition: 0,
      maxThumbPosition: 0,
      maxContentOffset,
      contentOffset: 0
    };
  }

  const thumbSize = Math.min(
    track,
    Math.max(minThumbSize, track * viewport / content)
  );
  const maxThumbPosition = track - thumbSize;
  const contentOffset = Math.min(maxContentOffset, Math.max(0, -contentStart));

  return {
    visible,
    thumbSize,
    thumbPosition: contentOffset / maxContentOffset * maxThumbPosition,
    maxThumbPosition,
    maxContentOffset,
    contentOffset
  };
}
