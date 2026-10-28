import assert from 'node:assert/strict';
import test from 'node:test';

import { subscribeCanvasChanges } from '../src/composables/canvas-editor/canvas-change-events.js';
import { EventBus } from '../src/logic/event-bus.js';

test('only actual canvas changes dismiss first-run and schedule matching document saves', () => {
  const eventBus = new EventBus();
  const canvasChanges = [];
  const documentChanges = [];
  const unsubscribe = subscribeCanvasChanges(eventBus, {
    onCanvasChange: (eventName) => canvasChanges.push(eventName),
    onDocumentChange: (eventName) => documentChanges.push(eventName)
  });

  eventBus.emit('canvas:resized', { width: 1000, height: 800 });
  eventBus.emit('viewport:zoom-changed', { zoom: 1.2 });
  eventBus.emit('viewport:pan-changed', { deltaX: 10, deltaY: 0 });
  eventBus.emit('history:changed', { canUndo: false, canRedo: false });
  assert.deepEqual(canvasChanges, []);
  assert.deepEqual(documentChanges, []);

  eventBus.emit('artboard:resized', { artboard: { width: 500, height: 700 } });
  eventBus.emit('layers:changed', { layers: [] });
  eventBus.emit('layers:changed', { layers: [{ id: 'text-1' }] });

  assert.deepEqual(canvasChanges, [
    'artboard:resized',
    'layers:changed'
  ]);
  assert.deepEqual(documentChanges, [
    'artboard:resized',
    'layers:changed',
    'layers:changed'
  ]);

  unsubscribe();
  eventBus.emit('artboard:resized', { artboard: { width: 600, height: 700 } });
  assert.equal(canvasChanges.length, 2);
});
