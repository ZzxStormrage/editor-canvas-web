import assert from 'node:assert/strict';
import test from 'node:test';

import { PinchZoomStrategy } from '../src/viewport/strategies/PinchZoomStrategy.js';

/**
 * 创建水平双指触点变化。
 *
 * @param {number} previousDistance 上一帧双指距离。
 * @param {number} currentDistance 当前帧双指距离。
 * @param {number} [previousCenter=500] 上一帧双指中心。
 * @param {number} [currentCenter=previousCenter] 当前帧双指中心。
 * @returns {Array<Object>} LeaferJS 多指触点列表。
 */
function createTouchList(
  previousDistance,
  currentDistance,
  previousCenter = 500,
  currentCenter = previousCenter
) {
  return [
    {
      from: { x: previousCenter - previousDistance / 2, y: 20 },
      to: { x: currentCenter - currentDistance / 2, y: 20 }
    },
    {
      from: { x: previousCenter + previousDistance / 2, y: 20 },
      to: { x: currentCenter + currentDistance / 2, y: 20 }
    }
  ];
}

test('pinch zoom keeps small meaningful scale changes for smooth interaction', () => {
  const strategy = new PinchZoomStrategy();

  const result = strategy.handle(createTouchList(1000, 1001.5));

  assert.ok(result);
  assert.equal(result.scale, 1.0015);
  assert.equal(result.anchorX, 500);
  assert.equal(result.anchorY, 20);
  assert.equal(result.previousAnchorX, 500);
  assert.equal(result.previousAnchorY, 20);
});

test('pinch zoom still ignores sub-pixel noise below the shared threshold', () => {
  const strategy = new PinchZoomStrategy();

  assert.equal(strategy.handle(createTouchList(1000, 1000.5)), null);
});

test('pinch zoom preserves two-finger center movement without changing scale', () => {
  const strategy = new PinchZoomStrategy();

  const result = strategy.handle(createTouchList(200, 200, 150, 162));

  assert.ok(result);
  assert.equal(result.scale, 1);
  assert.equal(result.previousAnchorX, 150);
  assert.equal(result.anchorX, 162);
});
