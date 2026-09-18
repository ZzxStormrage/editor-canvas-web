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
 * @param {Object} [options={}] 视口、状态和容器覆盖值。
 * @returns {{ events: Object[], stage: Object, state: Object, viewport: ViewportManager }}
 * 测试视口、缩放容器和事件。
 */
function createViewport(options = {}) {
  const stage = { x: 25, y: 40, scale: 1, ...options.stage };
  const state = {
    width: 300,
    height: 500,
    zoom: 2,
    zoomOptions: { min: 0.1, max: 10, initial: 1 },
    artboard: { x: 10, y: 20, width: 100, height: 200 },
    ...options.state
  };
  const events = [];
  const viewport = new ViewportManager(
    { interaction: null },
    {
      getBoundingClientRect: () => ({
        width: options.viewportWidth ?? 300,
        height: options.viewportHeight ?? 500
      })
    },
    stage,
    state,
    { emit: (eventName, payload) => events.push({ eventName, payload }) }
  );

  return { events, stage, state, viewport };
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

test('pinch zoom transforms from the previous center to the current center', () => {
  const { stage, state, viewport } = createViewport();

  viewport.zoom({
    scale: 1.1,
    previousAnchorX: 100,
    previousAnchorY: 100,
    anchorX: 110,
    anchorY: 100,
    source: 'pinch'
  });

  assert.equal(stage.x, 27.5);
  assert.equal(stage.y, 34);
  assert.equal(stage.scale, 2.2);
  assert.equal(state.zoom, 2.2);
});

test('pinch center movement remains active at the zoom boundary', () => {
  const { events, stage, viewport } = createViewport({
    state: { zoom: 2, zoomOptions: { min: 1, max: 2, initial: 1 } }
  });

  viewport.zoom({
    scale: 1.1,
    previousAnchorX: 100,
    previousAnchorY: 100,
    anchorX: 112,
    anchorY: 100,
    source: 'pinch'
  });

  assert.equal(stage.x, 37);
  assert.equal(stage.scale, 2);
  assert.equal(events.at(-1)?.eventName, 'viewport:pan-changed');
});

test('artboard pan is clamped to every visible edge', () => {
  const { stage, viewport } = createViewport({
    stage: { x: -50, y: -50 },
    state: { artboard: { x: 0, y: 0, width: 200, height: 300 } }
  });

  viewport.panArtboard(200, 300);
  assert.equal(Math.abs(stage.x), 0);
  assert.equal(Math.abs(stage.y), 0);

  viewport.panArtboard(-500, -700);
  assert.equal(stage.x, -100);
  assert.equal(stage.y, -100);
});

test('artboard pan centers an axis when its scaled size is smaller than the viewport', () => {
  const { stage, viewport } = createViewport({
    stage: { x: 25, y: 40 },
    state: { zoom: 1, artboard: { x: 10, y: 20, width: 100, height: 200 } }
  });

  viewport.panArtboard(80, -120);

  assert.equal(stage.x, 90);
  assert.equal(stage.y, 130);
});
