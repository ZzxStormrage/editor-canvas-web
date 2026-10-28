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
  { Group, Image: LeaferImage },
  { DocumentPlugin },
  { ElementDataPlugin },
  { ImagePlugin },
  { PluginManager },
  { EventBus },
  { parseEditorDocument, createLeaferDocumentNodes, getDocumentNodeSource, DOCUMENT_NODE_SOURCE_KEY },
  { getElementDataContainer }
] = await Promise.all([
  import('leafer-ui'),
  import('../src/plugins/feature-plugins/document/document-plugin.js'),
  import('../src/plugins/feature-plugins/element-data/element-data-plugin.js'),
  import('../src/plugins/feature-plugins/image/image-plugin.js'),
  import('../src/plugins/plugin-manager.js'),
  import('../src/logic/event-bus.js'),
  import('../src/utils/editor-document.js'),
  import('../src/utils/element-data.js')
]);

const CROP = { scaleX: 1.5, scaleY: 1.5, offsetX: -12.5, offsetY: 8 };

/** @returns {Object} 带裁剪信息的图片文档节点。 */
function createCroppedImageElement() {
  return {
    tag: 'Image',
    elementId: 'cropped-image',
    x: 10,
    y: 20,
    width: 120,
    height: 80,
    url: 'https://example.com/cropped.png',
    objectFit: 'stretch',
    sourceWidth: 300,
    sourceHeight: 200,
    crop: { ...CROP }
  };
}

/**
 * 组装与 core-integration 一致的最小上下文。
 *
 * @returns {{ manager: Object, context: Object, documentPlugin: Object, imagePlugin: Object }}
 */
function createContext() {
  const manager = new PluginManager();
  const documentPlugin = new DocumentPlugin();
  const imagePlugin = new ImagePlugin();
  const canvas = { width: 600, height: 400, background: '#ffffff' };
  manager.register(new ElementDataPlugin());
  manager.register(imagePlugin);
  manager.register({ id: 'text' });
  manager.register(documentPlugin);

  const context = {
    contentLayer: new Group(),
    state: { destroyed: false },
    eventBus: new EventBus(),
    pluginManager: manager,
    artboard: {
      resize(width, height) { Object.assign(canvas, { width, height }); },
      setFill(background) { canvas.background = background; },
      getContentBounds: () => ({ x: 0, y: 0, width: canvas.width, height: canvas.height }),
      get options() { return { fill: canvas.background }; }
    }
  };
  manager.bootstrap(context);
  return { manager, context, documentPlugin, imagePlugin };
}

test('document parsing keeps image crop settings and rejects invalid ones', () => {
  const document = {
    version: 1,
    canvas: { width: 300, height: 200, background: '#ffffff' },
    elements: [createCroppedImageElement()]
  };

  const parsed = parseEditorDocument(document);
  assert.deepEqual(parsed.elements[0].crop, CROP);
  assert.notEqual(parsed.elements[0], document.elements[0], '解析结果应为独立副本');
  assert.deepEqual(document.elements[0].crop, CROP, '原始文档不应被修改');

  const invalid = {
    ...document,
    elements: [{ ...createCroppedImageElement(), crop: { scaleX: 0, scaleY: 1, offsetX: 0, offsetY: 0 } }]
  };
  assert.throws(() => parseEditorDocument(invalid), /crop settings are invalid/);
});

test('leafer node factory strips crop metadata from render data', () => {
  const nodes = createLeaferDocumentNodes([createCroppedImageElement()], { x: 0, y: 0 });
  const [node] = nodes;

  assert.equal(node.crop, undefined);
  assert.equal(node.objectFit, undefined);
  assert.equal(node.sourceWidth, undefined);
  assert.equal(node.url, 'https://example.com/cropped.png');
  assert.equal(node.x, 10);
  assert.equal(node.y, 20);
});

test('image crop settings survive a document export round trip', () => {
  const { manager, context, documentPlugin, imagePlugin } = createContext();
  try {
    const element = createCroppedImageElement();
    const image = new LeaferImage({ x: 10, y: 20, width: 120, height: 80 });
    imagePlugin.restoreDocumentState(image, element, { width: 300, height: 200 });
    // 与 DocumentPlugin._restoreNodeState 一致：导出时会合并这里保存的源字段。
    image[DOCUMENT_NODE_SOURCE_KEY] = getDocumentNodeSource(element);
    getElementDataContainer(image, true).elementId = element.elementId;
    context.contentLayer.add(image);

    const exported = documentPlugin.export();
    const [node] = exported.elements;

    assert.deepEqual(node.crop, CROP);
    assert.equal(node.objectFit, 'fill', '裁剪后的图片固定外框，序列化为 CSS fill');
    assert.equal(node.sourceWidth, 300);
    assert.equal(node.sourceHeight, 200);
    assert.equal(node.elementId, 'cropped-image');
    assert.equal(node.url, 'https://example.com/cropped.png');

    const reparsed = parseEditorDocument(exported);
    assert.deepEqual(reparsed.elements[0].crop, CROP);
  } finally {
    manager.destroy();
  }
});
