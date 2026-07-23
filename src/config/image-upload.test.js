import assert from 'node:assert/strict';
import test from 'node:test';

import { IMAGE_FILE_ACCEPT, isSupportedImageFile } from './image-upload.js';

test('image upload chooser explicitly includes SVG', () => {
  assert.match(IMAGE_FILE_ACCEPT, /\.svg/);
  assert.match(IMAGE_FILE_ACCEPT, /image\/svg\+xml/);
});

test('image upload accepts SVG with non-standard MIME by extension', () => {
  assert.equal(isSupportedImageFile({ name: 'design.svg', type: 'application/xml' }), true);
  assert.equal(isSupportedImageFile({ name: 'design.SVG', type: 'text/xml' }), true);
});

test('image upload still rejects known non-image files', () => {
  assert.equal(isSupportedImageFile({ name: 'notes.txt', type: 'text/plain' }), false);
});
