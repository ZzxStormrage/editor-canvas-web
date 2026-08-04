import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectDocumentImageUrls,
  createLeaferDocumentNodes,
  visitDocumentNodePairs
} from '../src/utils/editor-document.js';

const DOCUMENT_IMAGES = [
  { tag: 'Image', url: 'https://example.com/visible.png', visible: true },
  { tag: 'Image', url: 'https://example.com/hidden.png', visible: false },
  {
    tag: 'Group',
    visible: false,
    children: [
      { tag: 'Image', url: 'https://example.com/hidden-child.png', visible: true }
    ]
  }
];

test('visible-only image collection skips hidden nodes and hidden groups', () => {
  assert.deepEqual(collectDocumentImageUrls(DOCUMENT_IMAGES, { visibleOnly: true }), [
    'https://example.com/visible.png'
  ]);
  assert.equal(collectDocumentImageUrls(DOCUMENT_IMAGES).length, 3);
});

test('deferred document nodes do not expose hidden image resources to Leafer', () => {
  const defaultNodes = createLeaferDocumentNodes(DOCUMENT_IMAGES, { x: 0, y: 0 });
  const nodes = createLeaferDocumentNodes(
    DOCUMENT_IMAGES,
    { x: 0, y: 0 },
    { deferHiddenImages: true }
  );

  assert.equal(defaultNodes[1].url, 'https://example.com/hidden.png');
  assert.equal(nodes[0].url, 'https://example.com/visible.png');
  assert.equal(nodes[1].url, undefined);
  assert.equal(nodes[2].children[0].url, undefined);
});

test('document pair traversal reports effective visibility', () => {
  const runtimeNodes = [
    {},
    {},
    { children: [{}] }
  ];
  const visibility = [];

  visitDocumentNodePairs(DOCUMENT_IMAGES, runtimeNodes, (_source, _target, context) => {
    visibility.push(context.visible);
  });

  assert.deepEqual(visibility, [true, false, false, false]);
});
