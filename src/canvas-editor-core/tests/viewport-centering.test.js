import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = globalThis;
for (const name of [
  'CanvasRenderingContext2D',
  'Path2D',
  'Image',
  'PointerEvent',
  'DragEvent'
]) {
  globalThis[name] ??= class {};
}
globalThis.document = {
  createElement: () => ({
    style: {},
    getContext: () => ({})
  })
};

const { ViewportManager } = await import('../src/viewport/ViewportManager.js');

/**
 * 创建可观察位移的视口测试对象。
 *
 * @returns {{ stage: Object, viewport: ViewportManager }} 测试视口与缩放容器。
 */
function createViewport() {
  const stage = { x: 25, y: 40, scale: 1 };
  const state = {
    width: 300,
    height: 500,
    zoom: 2,
    zoomOptions: { min: 0.1, max: 10, initial: 1 },
    artboard: { x: 10, y: 20, width: 100, height: 200 }
  };
  const viewport = new ViewportManager(
    { interaction: null },
    { getBoundingClientRect: () => ({ width: 300, height: 500 }) },
    stage,
    state,
    { emit() {} }
  );

  return { stage, viewport };
}

test('centerArtboard can keep horizontal pinch position while centering vertically', () => {
  const { stage, viewport } = createViewport();

  viewport.centerArtboard({ horizontal: false, vertical: true });

  assert.equal(stage.x, 25);
  assert.equal(stage.y, 10);
  assert.equal(stage.scale, 2);
});

test('centerArtboard still centers both axes by default', () => {
  const { stage, viewport } = createViewport();

  viewport.centerArtboard();

  assert.equal(stage.x, 30);
  assert.equal(stage.y, 10);
});
