import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window ??= globalThis;
for (const name of [
  'CanvasRenderingContext2D', 'Path2D', 'Image', 'PointerEvent', 'DragEvent',
  'MouseEvent', 'TouchEvent', 'KeyboardEvent', 'WheelEvent', 'Event', 'UIEvent', 'FocusEvent'
]) {
  globalThis[name] ??= class {};
}
globalThis.document ??= { createElement: () => ({ style: {}, getContext: () => ({}) }) };

const [{ Group }, { ArtboardManager, normalizeArtboardOptions }] = await Promise.all([
  import('leafer-ui'),
  import('../src/artboard.js')
]);

test('an initially hidden artboard keeps content mounted and appears after resize', () => {
  const options = normalizeArtboardOptions(
    { visible: false },
    { width: 375, height: 667, minWidth: 120, minHeight: 120 }
  );
  const manager = new ArtboardManager(options, { width: 800, height: 600 });
  const stage = new Group();
  const contentLayer = new Group();

  manager.mount(stage, contentLayer);

  assert.equal(manager.node.visible, false);
  assert.ok(stage.children.includes(contentLayer));

  manager.resize(400, 700);

  assert.equal(manager.node.visible, true);
  assert.equal(manager.options.visible, true);
  assert.deepEqual(manager.getContentBounds(), {
    x: 200,
    y: -50,
    width: 400,
    height: 700
  });

  manager.destroy();
});
