import assert from 'node:assert/strict';
import test from 'node:test';

import { useImageCrop } from '../useImageCrop.js';

/** @param {Object} [overrides={}] 覆盖编辑器方法。 @returns {Object} 最小编辑器替身。 */
function createEditor(overrides = {}) {
  return {
    beginSelectedImageCrop: () => ({
      source: 'https://example.com/a.png',
      frameWidth: 120,
      frameHeight: 80,
      contentLeft: 0,
      contentTop: 0,
      contentWidth: 120,
      contentHeight: 80,
      projection: { left: 0, top: 0, basisX: { x: 1, y: 0 }, basisY: { x: 0, y: 1 } }
    }),
    getImageCropProjection: () => ({ left: 0, top: 0, basisX: { x: 1, y: 0 }, basisY: { x: 0, y: 1 } }),
    commitSelectedImageCrop: () => ({ width: 60 }),
    cancelSelectedImageCrop: () => true,
    ...overrides
  };
}

test('entering crop exposes frame size and resets transform', () => {
  const crop = useImageCrop(() => createEditor());
  assert.equal(crop.startSelectedImageCrop(), true);
  assert.equal(crop.imageCropActive.value, true);
  assert.deepEqual(crop.imageCropState.value.crop, { left: 0, top: 0, width: 120, height: 80 });
  assert.equal(crop.imageCropState.value.zoom, 1);
});

test('commit failure still leaves crop mode', () => {
  const crop = useImageCrop(() => createEditor({ commitSelectedImageCrop: () => null }));
  crop.startSelectedImageCrop();

  assert.equal(crop.commitSelectedImageCrop(), false);
  assert.equal(crop.imageCropActive.value, false, '提交失败后必须退出裁剪视图');
  assert.equal(crop.imageCropState.value, null);
});

test('commit error notifies and leaves crop mode', () => {
  const messages = [];
  const crop = useImageCrop(
    () => createEditor({
      commitSelectedImageCrop: () => { throw new Error('裁剪几何无效'); }
    }),
    (text, type) => messages.push({ text, type })
  );
  crop.startSelectedImageCrop();

  assert.equal(crop.commitSelectedImageCrop(), false);
  assert.equal(crop.imageCropActive.value, false);
  assert.deepEqual(messages, [{ text: '裁剪几何无效', type: 'error' }]);
});

test('cancel leaves crop mode and clears state', () => {
  const crop = useImageCrop(() => createEditor());
  crop.startSelectedImageCrop();

  assert.equal(crop.cancelSelectedImageCrop(), true);
  assert.equal(crop.imageCropActive.value, false);
  assert.equal(crop.imageCropState.value, null);
  assert.equal(crop.cancelSelectedImageCrop(), false, '重复取消应为空操作');
});

test('projection refresh exits crop mode when the target is gone', () => {
  let lost = false;
  const crop = useImageCrop(() => createEditor({
    getImageCropProjection: () => (lost
      ? null
      : { left: 0, top: 0, basisX: { x: 1, y: 0 }, basisY: { x: 0, y: 1 } })
  }));
  crop.startSelectedImageCrop();
  crop.refreshImageCropProjection();
  assert.equal(crop.imageCropActive.value, true, '目标存在时应保持裁剪');

  lost = true;
  crop.refreshImageCropProjection();
  assert.equal(crop.imageCropActive.value, false, '目标丢失后应自动退出裁剪');
  assert.equal(crop.imageCropState.value, null);
});

test('crop-ended event handler clears the overlay state', () => {
  const crop = useImageCrop(() => createEditor());
  crop.startSelectedImageCrop();

  crop.handleCropEnded();
  assert.equal(crop.imageCropActive.value, false);
  assert.equal(crop.imageCropState.value, null);
});
