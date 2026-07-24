import { EditorError } from '../../../errors/editor-error.js';

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MIN_SIZE = 128;
const DEFAULT_MAX_SIZE = 2048;
const DEFAULT_MAX_BYTES = 128 * 1024 * 1024;

/**
 * SVG 栅格缓存仓库。
 *
 * 负责限制并发、合并相同任务、管理 LRU 内存，不关心画布节点和业务属性。
 */
export class SvgRasterCache {
  #activeCount = 0;
  #cache = new Map();
  #config;
  #destroyed = false;
  #nextId = 1;
  #pending = new Map();
  #queue = [];
  #runtimeSources = new Map();
  #sourcePending = new Map();
  #sources = new Map();
  #totalBytes = 0;

  /**
   * @param {Object} [options={}] 缓存选项。
   * @param {number} [options.concurrency=2] 最大栅格化并发数。
   * @param {number} [options.minSize=128] 最小缓存边长。
   * @param {number} [options.maxSize=2048] 最大缓存边长。
   * @param {number} [options.maxBytes=134217728] 最大缓存字节数。
   * @param {Object} [options.resource] 可测试的资源适配器。
   * @param {Function} [options.createCanvas] 可测试的 Canvas 工厂。
   */
  constructor(options = {}) {
    this.#config = normalizeCacheOptions(options);
  }

  /**
   * 获取并引用一份 SVG 栅格缓存。
   *
   * @param {string} source SVG 原始资源。
   * @param {{ width: number, height: number }} size 期望显示尺寸。
   * @returns {Promise<Object>} 缓存条目。
   */
  async acquire(source, size) {
    this.#assertActive();
    const rasterSize = resolveRasterSize(size, this.#config);
    const cacheKey = `${source}\n${rasterSize.width}x${rasterSize.height}`;
    let entry = this.#cache.get(cacheKey);

    if (!entry) {
      entry = await this.#getOrCreateEntry(cacheKey, source, rasterSize);
    }

    entry.refs += 1;
    entry.lastUsed = Date.now();
    this.#evict();
    return entry;
  }

  /**
   * 按受控并发预加载 SVG 源资源，并复用后续栅格化所需的解析结果。
   *
   * @param {string[]} sources SVG 原始资源列表。
   * @returns {Promise<Map<string, Object>>} URL 到 Leafer 图片资源的映射。
   */
  async preload(sources) {
    this.#assertActive();
    const uniqueSources = [...new Set(sources.filter(Boolean))];
    const entries = new Map();
    let cursor = 0;
    const workerCount = Math.min(this.#config.concurrency, uniqueSources.length);

    const runWorker = async () => {
      while (cursor < uniqueSources.length) {
        const source = uniqueSources[cursor];
        cursor += 1;
        entries.set(source, await this.#loadSource(source));
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return entries;
  }

  /**
   * 释放一份缓存引用。
   *
   * @param {Object | null | undefined} entry 缓存条目。
   * @returns {void}
   */
  release(entry) {
    if (!entry || !this.#cache.has(entry.cacheKey)) {
      return;
    }

    entry.refs = Math.max(0, entry.refs - 1);
    entry.lastUsed = Date.now();
    this.#evict();
  }

  /**
   * 根据运行时栅格 URL 反查原始 SVG 资源。
   *
   * @param {string | null | undefined} runtimeUrl 运行时资源 URL。
   * @returns {string | null} 原始 SVG 资源。
   */
  resolveSource(runtimeUrl) {
    return this.#runtimeSources.get(runtimeUrl) ?? null;
  }

  /**
   * 清理所有已创建的 Leafer 资源。
   *
   * @returns {void}
   */
  destroy() {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    const error = this.#createDestroyedError();
    this.#queue.splice(0).forEach((item) => item.reject(error));
    this.#pending.clear();
    this.#sourcePending.clear();
    this.#sources.clear();
    this.#cache.forEach((entry) => this.#config.resource.remove(entry.url));
    this.#cache.clear();
    this.#runtimeSources.clear();
    this.#totalBytes = 0;
  }

  /** @private @returns {Promise<Object>} */
  async #getOrCreateEntry(cacheKey, source, size) {
    const existingTask = this.#pending.get(cacheKey);
    if (existingTask) {
      return await existingTask;
    }

    const task = this.#enqueue(async () => {
      const entry = await this.#createEntry(cacheKey, source, size);
      this.#assertActive();
      this.#cache.set(cacheKey, entry);
      this.#runtimeSources.set(entry.url, source);
      this.#totalBytes += entry.bytes;
      return entry;
    });
    this.#pending.set(cacheKey, task);

    try {
      return await task;
    } finally {
      this.#pending.delete(cacheKey);
    }
  }

  /** @private @returns {Promise<Object>} */
  async #createEntry(cacheKey, source, size) {
    const image = await this.#loadSource(source);
    this.#assertActive();
    const view = image?.view ?? image;
    if (!view) {
      throw new EditorError('SVG resource does not contain a renderable view.', 'SVG_VIEW_MISSING');
    }

    const canvas = this.#config.createCanvas(size.width, size.height);
    const context = canvas.getContext?.('2d');
    if (!context?.drawImage) {
      throw new EditorError('SVG raster canvas is unavailable.', 'SVG_CANVAS_UNAVAILABLE');
    }

    context.clearRect?.(0, 0, size.width, size.height);
    context.drawImage(view, 0, 0, size.width, size.height);
    const rasterView = typeof canvas.transferToImageBitmap === 'function'
      ? canvas.transferToImageBitmap()
      : canvas;
    if (this.#destroyed) {
      rasterView.close?.();
      throw this.#createDestroyedError();
    }
    const url = `leafer://svg-raster/${this.#nextId}`;
    this.#nextId += 1;
    this.#config.resource.set(url, rasterView);

    return {
      bytes: size.width * size.height * 4,
      cacheKey,
      height: size.height,
      lastUsed: Date.now(),
      refs: 0,
      source,
      url,
      width: size.width
    };
  }

  /** @private @param {string} source SVG 原始资源。 @returns {Promise<Object>} */
  async #loadSource(source) {
    const cached = this.#sources.get(source);
    if (cached) {
      return cached;
    }

    const existingTask = this.#sourcePending.get(source);
    if (existingTask) {
      return await existingTask;
    }

    const task = this.#config.resource.load(source);
    this.#sourcePending.set(source, task);
    try {
      const image = await task;
      this.#assertActive();
      this.#sources.set(source, image);
      return image;
    } finally {
      this.#sourcePending.delete(source);
    }
  }

  /** @private @param {Function} task 栅格化任务。 @returns {Promise<*>} 任务结果。 */
  #enqueue(task) {
    this.#assertActive();
    return new Promise((resolve, reject) => {
      this.#queue.push({ reject, resolve, task });
      this.#drainQueue();
    });
  }

  /** @private @returns {void} */
  #drainQueue() {
    while (this.#activeCount < this.#config.concurrency && this.#queue.length) {
      const item = this.#queue.shift();
      this.#activeCount += 1;
      setTimeout(() => {
        if (this.#destroyed) {
          item.reject(this.#createDestroyedError());
          this.#activeCount -= 1;
          return;
        }
        Promise.resolve()
          .then(item.task)
          .then(item.resolve, item.reject)
          .finally(() => {
            this.#activeCount -= 1;
            this.#drainQueue();
          });
      });
    }
  }

  /** @private @returns {void} */
  #evict() {
    if (this.#totalBytes <= this.#config.maxBytes) {
      return;
    }

    const candidates = [...this.#cache.values()]
      .filter((entry) => entry.refs === 0)
      .sort((left, right) => left.lastUsed - right.lastUsed);

    for (const entry of candidates) {
      this.#cache.delete(entry.cacheKey);
      this.#runtimeSources.delete(entry.url);
      this.#config.resource.remove(entry.url);
      this.#totalBytes -= entry.bytes;
      if (this.#totalBytes <= this.#config.maxBytes) {
        break;
      }
    }
  }

  /** @private @returns {void} */
  #assertActive() {
    if (this.#destroyed) {
      throw this.#createDestroyedError();
    }
  }

  /** @private @returns {EditorError} */
  #createDestroyedError() {
    return new EditorError('SVG raster cache has been destroyed.', 'SVG_CACHE_DESTROYED');
  }
}

/**
 * 将显示尺寸转换为 2 的幂次栅格尺寸。
 *
 * @param {{ width: number, height: number }} size 显示尺寸。
 * @param {{ minSize: number, maxSize: number }} options 尺寸限制。
 * @returns {{ width: number, height: number }} 栅格尺寸。
 */
export function resolveRasterSize(size, options = {}) {
  const minSize = normalizePositiveInteger(options.minSize, DEFAULT_MIN_SIZE);
  const maxSize = Math.max(
    minSize,
    normalizePositiveInteger(options.maxSize, DEFAULT_MAX_SIZE)
  );
  const width = normalizePositiveNumber(size?.width, 1);
  const height = normalizePositiveNumber(size?.height, 1);
  const longestSide = Math.max(width, height);
  const bucket = Math.min(
    maxSize,
    Math.max(minSize, 2 ** Math.ceil(Math.log2(longestSide)))
  );
  const scale = bucket / longestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

/** @returns {Object} */
function normalizeCacheOptions(options) {
  if (!options.resource?.load || !options.resource?.set || !options.resource?.remove) {
    throw new EditorError('SVG raster cache requires a resource adapter.', 'SVG_RESOURCE_REQUIRED');
  }

  return {
    concurrency: normalizePositiveInteger(options.concurrency, DEFAULT_CONCURRENCY),
    createCanvas: options.createCanvas ?? createRasterCanvas,
    maxBytes: normalizePositiveInteger(options.maxBytes, DEFAULT_MAX_BYTES),
    maxSize: normalizePositiveInteger(options.maxSize, DEFAULT_MAX_SIZE),
    minSize: normalizePositiveInteger(options.minSize, DEFAULT_MIN_SIZE),
    resource: options.resource
  };
}

/** @returns {OffscreenCanvas | HTMLCanvasElement} */
function createRasterCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  throw new EditorError('Canvas is unavailable in the current environment.', 'SVG_CANVAS_UNAVAILABLE');
}

/** @returns {number} */
function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

/** @returns {number} */
function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
