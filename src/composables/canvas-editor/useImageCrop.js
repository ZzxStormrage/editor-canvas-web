import { ref } from 'vue';

import { createInitialCropRect } from '../../utils/image-crop.js';

/**
 * 管理图片裁剪模式及其预览、提交和取消生命周期。
 * @param {() => Object | null} getEditor 获取编辑器实例。
 * @param {Function | null} notify 应用通知方法。
 * @returns {Object} 裁剪视图状态与操作方法。
 */
export function useImageCrop(getEditor, notify = null) {
  const imageCropActive = ref(false);
  const imageCropState = ref(null);

  /** @returns {boolean} 是否成功进入裁剪模式。 */
  function startSelectedImageCrop() {
    if (imageCropActive.value) return false;
    const initial = getEditor()?.beginSelectedImageCrop?.();
    if (!initial) return false;

    imageCropState.value = {
      ...initial,
      // 默认裁剪框取「图片框 ∩ 实际内容」，避免一进入裁剪就圈进空白。
      crop: createInitialCropRect(initial),
      zoom: 1,
      panX: 0,
      panY: 0
    };
    imageCropActive.value = true;
    return true;
  }

  /** @returns {void} 根据当前画布变换刷新裁剪框投影。 */
  function refreshImageCropProjection() {
    if (!imageCropActive.value || !imageCropState.value) return;
    const projection = getEditor()?.getImageCropProjection?.();
    if (projection) {
      imageCropState.value.projection = projection;
      return;
    }
    // 目标节点被删除或文档被替换时插件已结束会话，视图层同步退出。
    resetCropState();
  }

  /** @returns {void} 结束裁剪视图状态。 */
  function resetCropState() {
    imageCropActive.value = false;
    imageCropState.value = null;
  }

  /**
   * 响应插件侧的裁剪会话结束事件。
   *
   * 撤销、打开项目、删除图片等操作会让插件主动结束会话，此时视图层必须退出遮罩。
   *
   * @returns {void}
   */
  function handleCropEnded() {
    resetCropState();
  }

  /**
   * 提交裁剪。
   *
   * 插件在成功、几何失效和抛出异常三种路径下都会结束自己的裁剪会话，
   * 因此视图状态必须无条件复位，否则遮罩会停在失效状态且无法再次提交。
   *
   * @returns {boolean} 是否成功提交裁剪。
   */
  function commitSelectedImageCrop() {
    if (!imageCropActive.value || !imageCropState.value) return false;
    const state = imageCropState.value;
    try {
      const committed = getEditor()?.commitSelectedImageCrop?.(state);
      resetCropState();
      return Boolean(committed);
    } catch (error) {
      resetCropState();
      notify?.(error?.message || '图片裁剪失败。', 'error');
      return false;
    }
  }

  /** @returns {boolean} 是否取消了活动裁剪。 */
  function cancelSelectedImageCrop() {
    if (!imageCropActive.value) return false;
    getEditor()?.cancelSelectedImageCrop?.();
    resetCropState();
    return true;
  }

  return {
    imageCropActive,
    imageCropState,
    startSelectedImageCrop,
    refreshImageCropProjection,
    handleCropEnded,
    commitSelectedImageCrop,
    cancelSelectedImageCrop
  };
}
