import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SvgRasterCache,
  resolveRasterSize
} from '../src/plugins/feature-plugins/svg-raster-cache/svg-raster-cache.js';
import { isSvgImageSource } from '../src/utils/image-runtime.js';

test('SVG source detection supports URLs, data URLs, and explicit blob formats', () => {
  assert.equal(isSvgImageSource('https://example.com/design.svg?version=1'), true);
  assert.equal(isSvgImageSource('data:image/svg+xml;charset=utf-8,%3Csvg%3E'), true);
  assert.equal(isSvgImageSource('blob:http://localhost/design', 'svg'), true);
  assert.equal(isSvgImageSource('https://example.com/design.png'), false);
});

test('raster size uses power-of-two buckets while preserving aspect ratio', () => {
  assert.deepEqual(
    resolveRasterSize({ width: 200, height: 200 }, { minSize: 128, maxSize: 2048 }),
    { width: 256, height: 256 }
  );
  assert.deepEqual(
    resolveRasterSize({ width: 920, height: 620 }, { minSize: 128, maxSize: 2048 }),
    { width: 1024, height: 690 }
  );
});

test('identical SVG raster requests share one resource task', async () => {
  const fixture = createCacheFixture();
  const cache = new SvgRasterCache(fixture.options);
  const [first, second] = await Promise.all([
    cache.acquire('design.svg', { width: 200, height: 200 }),
    cache.acquire('design.svg', { width: 200, height: 200 })
  ]);

  assert.equal(first.url, second.url);
  assert.equal(cache.resolveSource(first.url), 'design.svg');
  assert.equal(fixture.loadCalls.length, 1);
  assert.equal(fixture.setCalls.length, 1);
  assert.equal(fixture.drawCalls.length, 1);

  cache.release(first);
  cache.release(second);
  cache.destroy();
});

test('preloaded SVG sources are reused by later raster sizes', async () => {
  const fixture = createCacheFixture();
  const cache = new SvgRasterCache(fixture.options);

  await cache.preload(['design.svg', 'design.svg']);
  const small = await cache.acquire('design.svg', { width: 200, height: 200 });
  const large = await cache.acquire('design.svg', { width: 600, height: 600 });

  assert.equal(fixture.loadCalls.length, 1);
  assert.equal(fixture.drawCalls.length, 2);

  cache.release(small);
  cache.release(large);
  cache.destroy();
});

test('unused raster entries are evicted when the byte budget is exceeded', async () => {
  const fixture = createCacheFixture({ minSize: 1, maxBytes: 80 });
  const cache = new SvgRasterCache(fixture.options);
  const first = await cache.acquire('first.svg', { width: 4, height: 4 });
  cache.release(first);
  const second = await cache.acquire('second.svg', { width: 4, height: 4 });

  assert.deepEqual(fixture.removeCalls, [first.url]);

  cache.release(second);
  cache.destroy();
});

test('destroy rejects queued work and prevents late resource registration', async () => {
  const fixture = createCacheFixture({ concurrency: 1 });
  let resolveLoad;
  fixture.options.resource.load = async (source) => {
    fixture.loadCalls.push(source);
    return await new Promise((resolve) => {
      resolveLoad = () => resolve({ view: { source } });
    });
  };
  const cache = new SvgRasterCache(fixture.options);
  const active = cache.acquire('active.svg', { width: 200, height: 200 });
  const queued = cache.acquire('queued.svg', { width: 200, height: 200 });

  await new Promise((resolve) => setTimeout(resolve));
  cache.destroy();
  resolveLoad();

  await assert.rejects(active, { code: 'SVG_CACHE_DESTROYED' });
  await assert.rejects(queued, { code: 'SVG_CACHE_DESTROYED' });
  assert.equal(fixture.setCalls.length, 0);
});

/**
 * 创建不依赖 DOM 和 Leafer 的缓存测试夹具。
 *
 * @param {Object} [overrides={}] 缓存选项覆盖。
 * @returns {Object} 测试夹具。
 */
function createCacheFixture(overrides = {}) {
  const drawCalls = [];
  const loadCalls = [];
  const removeCalls = [];
  const setCalls = [];

  return {
    drawCalls,
    loadCalls,
    removeCalls,
    setCalls,
    options: {
      concurrency: 2,
      maxBytes: 1024 * 1024,
      maxSize: 2048,
      minSize: 128,
      ...overrides,
      createCanvas(width, height) {
        return {
          getContext() {
            return {
              clearRect() {},
              drawImage(view, x, y, drawWidth, drawHeight) {
                drawCalls.push({ drawHeight, drawWidth, height, view, width, x, y });
              }
            };
          },
          transferToImageBitmap() {
            return { height, width };
          }
        };
      },
      resource: {
        async load(source) {
          loadCalls.push(source);
          return { view: { source } };
        },
        remove(url) {
          removeCalls.push(url);
        },
        set(url, view) {
          setCalls.push({ url, view });
        }
      }
    }
  };
}
