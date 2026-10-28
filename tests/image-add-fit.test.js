import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = globalThis;
for (const name of [
  'CanvasRenderingContext2D',
  'Path2D',
  'Image',
  'PointerEvent',
  'DragEvent',
  'MouseEvent',
  'TouchEvent',
  'KeyboardEvent',
  'WheelEvent',
  'Event',
  'UIEvent',
  'FocusEvent'
]) {
  globalThis[name] ??= class {};
}
globalThis.document = {
  createElement: () => ({
    style: {},
    getContext: () => ({})
  })
};

const [{ ImagePlugin }, { Group, Resource }] = await Promise.all([
  import('../src/plugins/feature-plugins/image/image-plugin.js'),
  import('leafer-ui')
]);

test('image add supports cover without changing its requested frame', async () => {
  const plugin = new ImagePlugin();
  const contentLayer = new Group();
  const originalLoadImage = Resource.loadImage;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const renders = [];
  const editorUpdates = [];
  const eventNames = [];
  Resource.loadImage = async () => ({ width: 2000, height: 1000 });
  globalThis.requestAnimationFrame = (callback) => {
    queueMicrotask(() => callback(0));
    return 1;
  };
  plugin._context = {
    contentLayer,
    eventBus: {
      emit: (eventName) => eventNames.push(eventName)
    },
    leafer: {
      forceRender: () => renders.push(contentLayer.children.length)
    },
    innerEditor: {
      update: () => editorUpdates.push('editor'),
      updateEditBox: () => editorUpdates.push('edit-box')
    },
    state: {
      width: 500,
      height: 500,
      imageOptions: { maxWidthRatio: 0.8, maxHeightRatio: 0.8 }
    }
  };

  try {
    const image = await plugin.add('https://example.com/background.png', {
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      fit: 'cover',
      select: false
    });

    assert.equal(image.width, 500);
    assert.equal(image.height, 500);
    assert.equal(plugin.getFit(image), 'cover');
    assert.equal(image.__?.__input?.fill?.mode, 'cover');
    assert.equal(image.__?.__input?.fill?.url, 'https://example.com/background.png');
    assert.deepEqual(eventNames, ['image:added']);
    assert.deepEqual(editorUpdates, ['editor', 'edit-box']);
    assert.deepEqual(renders, [1]);
  } finally {
    Resource.loadImage = originalLoadImage;
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete globalThis.requestAnimationFrame;
    }
  }
});
