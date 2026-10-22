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

const [{ ImagePlugin }, { Group, Image: LeaferImage, Resource }] = await Promise.all([
  import('../src/plugins/feature-plugins/image/image-plugin.js'),
  import('leafer-ui')
]);

test('hidden document image loads once and renders after its first activation', async () => {
  const events = [];
  const refreshes = [];
  const plugin = new ImagePlugin();
  const image = new LeaferImage({ visible: false, width: 100, height: 80 });
  const parent = new Group();
  parent.add(image);
  const originalLoadImage = Resource.loadImage;
  let resolveLoad;
  let loadCount = 0;
  Resource.loadImage = () => {
    loadCount += 1;
    return new Promise((resolve) => {
      resolveLoad = resolve;
    });
  };
  image.forceUpdate = () => refreshes.push('forceUpdate');
  image.updateLayout = () => refreshes.push('updateLayout');
  plugin._context = {
    state: { destroyed: false },
    eventBus: { emit: (...args) => events.push(args) },
    artboard: { syncAllElements: () => refreshes.push('syncAllElements') },
    innerEditor: { update: () => refreshes.push('editorUpdate') }
  };

  try {
    plugin.restoreDocumentState(
      image,
      {
        tag: 'Image',
        url: 'https://example.com/deferred.png',
        visible: false,
        width: 100,
        height: 80,
        objectFit: 'contain'
      },
      undefined,
      { deferResource: true }
    );

    assert.equal(plugin.getSource(image), 'https://example.com/deferred.png');
    assert.equal(image.__?.__input?.fill, undefined);
    assert.equal(events.length, 0);

    image.visible = true;
    const activation = plugin.activateDeferredSource(image);
    assert.equal(await plugin.activateDeferredSource(image), false);
    assert.equal(loadCount, 1);
    assert.equal(image.__?.__input?.fill, undefined);

    resolveLoad({ width: 100, height: 80 });
    assert.equal(await activation, true);
    assert.equal(image.__?.__input?.fill?.url, 'https://example.com/deferred.png');
    assert.deepEqual(refreshes, [
      'forceUpdate',
      'updateLayout',
      'syncAllElements',
      'editorUpdate'
    ]);
    assert.equal(events[0][0], 'image:source-activated');
    assert.equal(await plugin.activateDeferredSource(image), false);
    assert.equal(events.length, 1);
  } finally {
    Resource.loadImage = originalLoadImage;
  }
});

test('failed deferred image activation can be retried', async () => {
  const events = [];
  const plugin = new ImagePlugin();
  const image = new LeaferImage({ visible: true, width: 100, height: 80 });
  const parent = new Group();
  parent.add(image);
  const originalLoadImage = Resource.loadImage;
  const originalWarn = console.warn;
  let loadCount = 0;
  Resource.loadImage = async () => {
    loadCount += 1;
    if (loadCount === 1) {
      throw new Error('network failed');
    }
    return { width: 100, height: 80 };
  };
  console.warn = () => {};
  plugin._context = {
    state: { destroyed: false },
    eventBus: { emit: (...args) => events.push(args) }
  };

  try {
    plugin.restoreDocumentState(
      image,
      { tag: 'Image', url: 'https://example.com/retry.png', visible: false },
      undefined,
      { deferResource: true }
    );

    assert.equal(await plugin.activateDeferredSource(image), false);
    assert.equal(events[0][0], 'image:source-activation-failed');
    assert.equal(await plugin.activateDeferredSource(image), true);
    assert.equal(loadCount, 2);
    assert.equal(image.__?.__input?.fill?.url, 'https://example.com/retry.png');
  } finally {
    Resource.loadImage = originalLoadImage;
    console.warn = originalWarn;
  }
});

test('detached deferred image ignores a completed resource load', async () => {
  const events = [];
  const plugin = new ImagePlugin();
  const parent = new Group();
  const image = new LeaferImage({ visible: true, width: 100, height: 80 });
  const originalLoadImage = Resource.loadImage;
  let resolveLoad;
  Resource.loadImage = () => new Promise((resolve) => {
    resolveLoad = resolve;
  });
  parent.add(image);
  plugin._context = {
    state: { destroyed: false },
    eventBus: { emit: (...args) => events.push(args) }
  };

  try {
    plugin.restoreDocumentState(
      image,
      { tag: 'Image', url: 'https://example.com/detached.png', visible: false },
      undefined,
      { deferResource: true }
    );

    const activation = plugin.activateDeferredSource(image);
    image.remove();
    resolveLoad({ width: 100, height: 80 });

    assert.equal(await activation, false);
    assert.equal(image.__?.__input?.fill, undefined);
    assert.equal(events.length, 0);
  } finally {
    Resource.loadImage = originalLoadImage;
  }
});
