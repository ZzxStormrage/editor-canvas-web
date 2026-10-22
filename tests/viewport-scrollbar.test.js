import assert from 'node:assert/strict';
import test from 'node:test';

import { getScrollbarMetrics } from '../src/viewport/scrollbar.js';

test('scrollbar hides when the scaled artboard fits inside the viewport', () => {
  const metrics = getScrollbarMetrics({
    viewportSize: 800,
    contentSize: 640,
    contentStart: 80,
    trackSize: 740
  });

  assert.equal(metrics.visible, false);
  assert.equal(metrics.thumbPosition, 0);
});

test('scrollbar thumb tracks a clamped viewport offset proportionally', () => {
  const metrics = getScrollbarMetrics({
    viewportSize: 800,
    contentSize: 1600,
    contentStart: -400,
    trackSize: 740
  });

  assert.equal(metrics.visible, true);
  assert.equal(metrics.thumbSize, 370);
  assert.equal(metrics.maxContentOffset, 800);
  assert.equal(metrics.contentOffset, 400);
  assert.equal(metrics.thumbPosition, 185);
});

test('scrollbar thumb and content offset stay within their scroll ranges', () => {
  const metrics = getScrollbarMetrics({
    viewportSize: 500,
    contentSize: 2400,
    contentStart: -5000,
    trackSize: 100,
    minThumbSize: 28
  });

  assert.equal(metrics.thumbSize, 28);
  assert.equal(metrics.thumbPosition, metrics.maxThumbPosition);
  assert.equal(metrics.contentOffset, metrics.maxContentOffset);
});
