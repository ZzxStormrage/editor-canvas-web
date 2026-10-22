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
  const interaction = options.interaction ?? null;
  const listeners = new Map();
  const view = {
    style: { touchAction: 'pan-x', overscrollBehavior: 'auto' },
    addEventListener: (type, listener, eventOptions) => {
      listeners.set(type, { listener, eventOptions });
    },
    removeEventListener: (type) => listeners.delete(type),
    dispatch: (type, properties = {}) => {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...properties
      };
      listeners.get(type)?.listener(event);
      return event;
    },
    getBoundingClientRect: () => ({
      width: options.viewportWidth ?? 300,
      height: options.viewportHeight ?? 500
    })
  };
  const viewport = new ViewportManager(
    { interaction },
    view,
    stage,
    state,
    { emit: (eventName, payload) => events.push({ eventName, payload }) }
  );

  return { events, listeners, stage, state, view, viewport };
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

test('two-finger horizontal movement pans the canvas without changing zoom', () => {
  const interaction = { config: { wheel: {} } };
  const { listeners, stage, state, view, viewport } = createViewport({ interaction });

  viewport.setupInteraction();
  interaction.multiTouch(null, [
    { from: { x: 100, y: 200 }, to: { x: 116, y: 200 } },
    { from: { x: 200, y: 200 }, to: { x: 216, y: 200 } }
  ]);

  assert.equal(stage.x, 41);
  assert.equal(stage.y, 40);
  assert.equal(stage.scale, 2);
  assert.equal(state.zoom, 2);
  assert.equal(view.style.touchAction, 'none');
  assert.equal(view.style.overscrollBehavior, 'none');
  assert.equal(view.dispatch('wheel', { ctrlKey: true }).defaultPrevented, true);
  assert.equal(view.dispatch('wheel').defaultPrevented, true);
  assert.equal(view.dispatch('gesturechange').defaultPrevented, true);

  viewport.destroy();
  assert.equal(view.style.touchAction, 'pan-x');
  assert.equal(view.style.overscrollBehavior, 'auto');
  assert.equal(listeners.size, 0);
});

test('wheel scrolling pans while modified wheel input zooms the canvas', () => {
  const interaction = { config: { wheel: {} } };
  const { stage, state, viewport } = createViewport({
    interaction,
    stage: { x: -25, y: -40 },
    state: {
      artboard: { x: 0, y: 0, width: 200, height: 300 }
    }
  });

  viewport.setupInteraction();
  interaction.wheel({ deltaX: -24, deltaY: 12, ctrlKey: false, metaKey: false });

  assert.ok(Math.abs(stage.x + 9.4) < 1e-9);
  assert.ok(Math.abs(stage.y + 47.8) < 1e-9);
  assert.equal(state.zoom, 2);

  interaction.wheel({
    deltaX: 0,
    deltaY: -8,
    x: 140,
    y: 220,
    ctrlKey: true,
    metaKey: false
  });

  assert.ok(state.zoom > 2);
  assert.equal(stage.scale, state.zoom);
  viewport.destroy();
});

test('workspace pan continues beyond the calculated workspace edges', () => {
  const { stage, viewport } = createViewport({
    stage: { x: -50, y: -50 },
    state: {
      artboard: { x: 0, y: 0, width: 200, height: 300 },
      workspace: { x: -100, y: -100, width: 200, height: 300 }
    }
  });

  viewport.panArtboard(200, 300);
  assert.equal(stage.x, 150);
  assert.equal(stage.y, 250);

  viewport.panArtboard(-500, -700);
  assert.equal(stage.x, -350);
  assert.equal(stage.y, -450);
});

test('canvas pan uses the dotted workspace bounds instead of the white artboard', () => {
  const { stage, viewport } = createViewport({
    stage: { x: 0, y: 0 },
    state: {
      artboard: { x: 100, y: 100, width: 80, height: 120 },
      workspace: { x: -600, y: -400, width: 1400, height: 1100 }
    }
  });

  viewport.panArtboard(-500, -300);

  assert.equal(stage.x, -500);
  assert.equal(stage.y, -300);
});

test('canvas remains movable after zooming out below viewport size', () => {
  const { stage, state, viewport } = createViewport({
    stage: { x: 150, y: 200 },
    state: {
      zoom: 0.1,
      workspace: { x: -2000, y: -3000, width: 4000, height: 6000 }
    }
  });

  viewport.panArtboard(-40, 45);

  assert.equal(stage.x, 110);
  assert.equal(stage.y, 245);
  assert.equal(state.zoom, 0.1);
});
