const CANVAS_CHANGE_EVENTS = Object.freeze([
  'artboard:fill-changed',
  'artboard:resized',
  'canvas:area-type-changed',
  'canvas:background-changed',
  'canvas:grid-changed',
  'canvas:grid-visibility-changed',
  'document:cleared',
  'document:loaded',
  'element-data:changed',
  'image:added',
  'image:replaced',
  'image:updated',
  'layers:changed',
  'selection:deleted',
  'selection:group-changed',
  'selection:layer-changed',
  'text:added',
  'text:replaced',
  'text:updated'
]);
const DOCUMENT_CHANGE_EVENTS = new Set([
  'artboard:fill-changed',
  'artboard:resized',
  'document:cleared',
  'document:loaded',
  'element-data:changed',
  'image:added',
  'image:replaced',
  'image:updated',
  'layers:changed',
  'selection:deleted',
  'selection:group-changed',
  'selection:layer-changed',
  'text:added',
  'text:replaced',
  'text:updated'
]);

/**
 * 订阅画布内容、画板和外观设置变化。
 * @param {Object} eventBus 编辑器事件总线。
 * @param {{
 *   onCanvasChange?: (eventName: string, payload: *) => void,
 *   onDocumentChange?: (eventName: string, payload: *) => void
 * }} callbacks 画布与文档变化回调。
 * @returns {() => void} 清理事件订阅的方法。
 */
export function subscribeCanvasChanges(eventBus, callbacks = {}) {
  if (!eventBus?.on) {
    return () => {};
  }

  const unsubscribers = CANVAS_CHANGE_EVENTS.map((eventName) => eventBus.on(
    eventName,
    (payload) => {
      if (eventName === 'layers:changed' && !payload?.layers?.length) {
        callbacks.onDocumentChange?.(eventName, payload);
        return;
      }
      callbacks.onCanvasChange?.(eventName, payload);
      if (DOCUMENT_CHANGE_EVENTS.has(eventName)) {
        callbacks.onDocumentChange?.(eventName, payload);
      }
    }
  ));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
