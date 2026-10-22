import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = globalThis;
for (const name of [
  'CanvasRenderingContext2D', 'Path2D', 'Image', 'PointerEvent', 'DragEvent',
  'MouseEvent', 'TouchEvent', 'KeyboardEvent', 'WheelEvent', 'Event', 'UIEvent', 'FocusEvent'
]) {
  globalThis[name] ??= class {};
}
globalThis.document = { createElement: () => ({ style: {}, getContext: () => ({}) }) };

const [
  { Group, Rect }, { DocumentPlugin }, { ElementDataPlugin }, { LayerPlugin },
  { PluginManager }, { EventBus }
] = await Promise.all([
  import('leafer-ui'),
  import('../src/plugins/feature-plugins/document/document-plugin.js'),
  import('../src/plugins/feature-plugins/element-data/element-data-plugin.js'),
  import('../src/plugins/feature-plugins/layer/layer-plugin.js'),
  import('../src/plugins/plugin-manager.js'),
  import('../src/logic/event-bus.js')
]);

test('document loading and export preserve coordinates and arbitrary metadata with core plugins', async () => {
  const manager = new PluginManager();
  const plugin = new DocumentPlugin();
  manager.register(new ElementDataPlugin());
  manager.register({ id: 'image' });
  manager.register({ id: 'text' });
  manager.register(plugin);
  const canvas = { width: 600, height: 400, background: '#ffffff' };
  const context = {
    contentLayer: new Group(),
    state: { destroyed: false },
    eventBus: new EventBus(),
    pluginManager: manager,
    artboard: {
      resize(width, height) { Object.assign(canvas, { width, height }); },
      setFill(background) { canvas.background = background; },
      getContentBounds: () => ({ x: 20, y: 30, width: canvas.width, height: canvas.height }),
      get options() { return { fill: canvas.background }; }
    }
  };
  manager.bootstrap(context);
  const input = {
    version: 1,
    canvas: { width: 300, height: 200, background: '#eeeeee' },
    elements: [{
      tag: 'Rect', elementId: 'box', x: 10, y: 15, width: 50, height: 60,
      visible: false, locked: true, attributes: { tag: { value: 'sample' } }
    }]
  };
  try {
    await plugin.load(input);
    assert.equal(context.contentLayer.children[0].x, 30);
    assert.equal(context.contentLayer.children[0].y, 45);
    const output = plugin.export();
    assert.deepEqual(output.canvas, input.canvas);
    assert.deepEqual(output.elements[0].attributes, input.elements[0].attributes);
    assert.equal(output.elements[0].elementId, 'box');
    assert.equal(output.elements[0].x, 10);
    assert.equal(output.elements[0].y, 15);
    assert.equal(output.elements[0].visible, false);
    assert.equal(output.elements[0].locked, true);
    assert.equal(input.elements[0].x, 10);
  } finally {
    manager.destroy();
  }
});

test('layer arrangement accepts caller-defined roles and preserves other relative order', () => {
  const contentLayer = new Group();
  const eventBus = new EventBus();
  const metadata = new ElementDataPlugin();
  const layer = new LayerPlugin();
  const context = { contentLayer, eventBus, state: { destroyed: false } };
  metadata.bootstrap(context);
  layer.bootstrap(context);
  const nodes = ['foreground', 'middle-a', 'background', 'middle-b'].map((name) => {
    const node = new Rect({ name, width: 10, height: 10 });
    contentLayer.add(node);
    metadata.set(node, { role: name });
    return node;
  });
  try {
    layer.arrangeByRole({ back: ['background'], front: ['foreground'] });
    assert.deepEqual(contentLayer.children.map((node) => node.name), [
      'background', 'middle-a', 'middle-b', 'foreground'
    ]);
    assert.equal(layer.getList()[0].type, 'rect');
    assert.equal(metadata.get(nodes[0]).role, 'foreground');
  } finally {
    layer.destroy();
    metadata.destroy();
  }
});
