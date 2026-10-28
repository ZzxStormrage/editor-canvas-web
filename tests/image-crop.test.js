import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createImageCropTransform,
  createInitialCropRect,
  getImageCropContentBox,
  getImageCropPan,
  getImageCropMapping,
  normalizeImageCropRect
} from '../src/utils/image-crop.js';

test('crop preview mapping respects contain and cover image fitting', () => {
  const contain = getImageCropMapping({
    frameWidth: 400,
    frameHeight: 300,
    sourceWidth: 200,
    sourceHeight: 200,
    fit: 'contain'
  });
  const cover = getImageCropMapping({
    frameWidth: 400,
    frameHeight: 300,
    sourceWidth: 200,
    sourceHeight: 200,
    fit: 'cover'
  });

  assert.deepEqual(contain, {
    frameWidth: 400,
    frameHeight: 300,
    left: 50,
    top: 0,
    width: 300,
    height: 300,
    scaleX: 1.5,
    scaleY: 1.5
  });
  assert.deepEqual(cover, {
    frameWidth: 400,
    frameHeight: 300,
    left: 0,
    top: -50,
    width: 400,
    height: 400,
    scaleX: 2,
    scaleY: 2
  });
});

test('crop rectangles stay within the image and reject empty results', () => {
  assert.deepEqual(normalizeImageCropRect({
    left: -20,
    top: 15,
    width: 120,
    height: 500
  }, 100, 100), {
    left: 0,
    top: 15,
    width: 100,
    height: 85
  });
  assert.equal(normalizeImageCropRect({ left: 40, top: 40, width: 0, height: 10 }, 100, 100), null);
});

test('crop commit accepts the overlay state shape', () => {
  assert.deepEqual(normalizeImageCropRect({
    crop: { left: 20, top: 15, width: 60, height: 40 },
    zoom: 1.5,
    panX: 8,
    panY: -4
  }, 100, 80), {
    left: 20,
    top: 15,
    width: 60,
    height: 40
  });
});

test('crop zoom and pan become a serializable source mapping', () => {
  const mapping = getImageCropMapping({
    frameWidth: 300,
    frameHeight: 200,
    sourceWidth: 600,
    sourceHeight: 400,
    fit: 'stretch'
  });
  const rect = { left: 30, top: 20, width: 180, height: 100 };

  assert.deepEqual(createImageCropTransform({
    mapping,
    rect,
    zoom: 2,
    panX: 10,
    panY: -5
  }), {
    scaleX: 1,
    scaleY: 1,
    offsetX: -160,
    offsetY: -130
  });
});

test('moving the crop rect keeps the zoomed image content in place', () => {
  const mapping = getImageCropMapping({
    frameWidth: 300,
    frameHeight: 200,
    sourceWidth: 600,
    sourceHeight: 400,
    fit: 'stretch'
  });
  const zoomed = { mapping, zoom: 2, panX: 0, panY: 0 };
  const left = createImageCropTransform({
    ...zoomed,
    rect: { left: 0, top: 0, width: 150, height: 100 }
  });
  const right = createImageCropTransform({
    ...zoomed,
    rect: { left: 100, top: 60, width: 150, height: 100 }
  });

  // 内容在图片框坐标系中的绝对位置不应随裁剪框移动而改变。
  assert.equal(left.offsetX, right.offsetX + 100);
  assert.equal(left.offsetY, right.offsetY + 60);
});

test('content box ignores the crop rect and anchors zoom at the frame center', () => {
  const mapping = getImageCropMapping({
    frameWidth: 300,
    frameHeight: 200,
    sourceWidth: 600,
    sourceHeight: 400,
    fit: 'stretch'
  });

  assert.deepEqual(getImageCropContentBox({ mapping, zoom: 1 }), {
    left: 0,
    top: 0,
    width: 300,
    height: 200
  });
  assert.deepEqual(getImageCropContentBox({ mapping, zoom: 2, panX: 10, panY: -5 }), {
    left: -130,
    top: -110,
    width: 600,
    height: 400
  });
});

test('image dragging uses total pointer movement from the original pan', () => {
  const basisX = { x: 2, y: 0 };
  const basisY = { x: 0, y: 2 };
  const firstMove = getImageCropPan({
    basisX,
    basisY,
    deltaX: 20,
    deltaY: 8,
    startPanX: 3,
    startPanY: -2,
    zoom: 2
  });
  const laterMove = getImageCropPan({
    basisX,
    basisY,
    deltaX: 40,
    deltaY: 16,
    startPanX: 3,
    startPanY: -2,
    zoom: 2
  });

  assert.deepEqual(firstMove, { panX: 8, panY: 0 });
  assert.deepEqual(laterMove, { panX: 13, panY: 2 });
  assert.equal(laterMove.panX - firstMove.panX, 5);
  assert.equal(laterMove.panY - firstMove.panY, 2);
});

test('image dragging maps screen movement through rotated canvas axes', () => {
  assert.deepEqual(getImageCropPan({
    basisX: { x: 0, y: 2 },
    basisY: { x: -2, y: 0 },
    deltaX: -24,
    deltaY: 12,
    zoom: 1
  }), { panX: 6, panY: 12 });
});

test('saved crop metadata is excluded from Leafer input nodes', async () => {
  const { createLeaferDocumentNodes, parseEditorDocument } = await import('../src/utils/editor-document.js');
  const crop = { scaleX: 2, scaleY: 2, offsetX: -40, offsetY: -20 };
  const document = parseEditorDocument({
    version: 1,
    canvas: { width: 300, height: 200 },
    elements: [{ tag: 'Image', url: 'data:image/png;base64,AA==', width: 100, height: 80, crop }]
  });
  const [node] = createLeaferDocumentNodes(document.elements, { x: 0, y: 0 });

  assert.deepEqual(document.elements[0].crop, crop);
  assert.equal(node.crop, undefined);
});

test('initial crop rect excludes letterboxed blank of contain fitting', () => {
  const mapping = getImageCropMapping({
    frameWidth: 300,
    frameHeight: 300,
    sourceWidth: 800,
    sourceHeight: 600,
    fit: 'contain'
  });

  assert.deepEqual(createInitialCropRect({
    frameWidth: 300,
    frameHeight: 300,
    contentLeft: mapping.left,
    contentTop: mapping.top,
    contentWidth: mapping.width,
    contentHeight: mapping.height
  }), { left: 0, top: 37.5, width: 300, height: 225 });
});

test('initial crop rect stays full frame when content covers it', () => {
  assert.deepEqual(createInitialCropRect({
    frameWidth: 300,
    frameHeight: 225,
    contentLeft: 0,
    contentTop: 0,
    contentWidth: 300,
    contentHeight: 225
  }), { left: 0, top: 0, width: 300, height: 225 });
});

test('crop rect may exceed the node frame but not the image content', () => {
  const bounds = { left: -50, top: -20, width: 400, height: 320 };

  assert.deepEqual(
    normalizeImageCropRect({ left: -30, top: -10, width: 200, height: 150 }, 300, 225, bounds),
    { left: -30, top: -10, width: 200, height: 150 }
  );
  assert.deepEqual(
    normalizeImageCropRect({ left: -80, top: 100, width: 200, height: 400 }, 300, 225, bounds),
    { left: -50, top: 100, width: 170, height: 200 }
  );
  assert.equal(
    normalizeImageCropRect({ left: 400, top: 400, width: 50, height: 50 }, 300, 225, bounds),
    null
  );
});
