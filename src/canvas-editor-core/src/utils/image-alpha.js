const DEFAULT_ALPHA_THRESHOLD = 10;
const DEFAULT_ANALYSIS_MAX_SIZE = 2048;

/**
 * 识别图片中最大的内部透明连通区域。
 *
 * 为控制大图内存占用，分析画布最长边默认限制为 2048 像素，最终边界会映射回
 * 原始图片像素坐标。没有内部透明区域时，回退到最大的透明连通区域。
 *
 * @param {string | Blob | CanvasImageSource} source 图片来源。
 * @param {{ alphaThreshold?: number, maxAnalysisSize?: number }} [options={}] 识别选项。
 * @returns {Promise<{
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   sourceWidth: number,
 *   sourceHeight: number
 * }>} 原始图片像素坐标中的透明区域。
 */
export async function detectTransparentBounds(source, options = {}) {
  const imageSource = await loadImageSource(source);

  try {
    const sourceWidth = normalizePositiveInteger(imageSource.width, 'image.width');
    const sourceHeight = normalizePositiveInteger(imageSource.height, 'image.height');
    const maxAnalysisSize = normalizePositiveInteger(
      options.maxAnalysisSize ?? DEFAULT_ANALYSIS_MAX_SIZE,
      'maxAnalysisSize'
    );
    const alphaThreshold = normalizeAlphaThreshold(options.alphaThreshold);
    const analysisSize = getAnalysisSize(sourceWidth, sourceHeight, maxAnalysisSize);
    const pixels = readImagePixels(imageSource.view, analysisSize);
    const component = findLargestTransparentComponent(
      pixels,
      analysisSize.width,
      analysisSize.height,
      alphaThreshold
    );

    if (!component) {
      throw new Error('遮罩图中没有可识别的透明区域。');
    }

    return mapBoundsToSource(component, analysisSize, { width: sourceWidth, height: sourceHeight });
  } finally {
    imageSource.release?.();
  }
}

/**
 * 加载浏览器 Canvas 可绘制的图片来源。
 *
 * @param {string | Blob | CanvasImageSource} source 图片来源。
 * @returns {Promise<{ view: CanvasImageSource, width: number, height: number, release?: () => void }>}
 * 图片视图。
 */
async function loadImageSource(source) {
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(source);
      return {
        view: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.()
      };
    }

    const objectUrl = URL.createObjectURL(source);
    const image = await loadHtmlImage(objectUrl);
    return { ...image, release: () => URL.revokeObjectURL(objectUrl) };
  }

  if (typeof source === 'string') {
    return loadHtmlImage(source);
  }

  const width = Number(source?.naturalWidth ?? source?.videoWidth ?? source?.width);
  const height = Number(source?.naturalHeight ?? source?.videoHeight ?? source?.height);

  if (source && Number.isFinite(width) && Number.isFinite(height)) {
    return { view: source, width, height };
  }

  throw new TypeError('透明区域识别需要图片 URL、File、Blob 或 CanvasImageSource。');
}

/**
 * 加载 HTMLImageElement。
 *
 * @param {string} source 图片地址。
 * @returns {Promise<{ view: HTMLImageElement, width: number, height: number }>} 图片视图。
 */
function loadHtmlImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (!source.startsWith('data:') && !source.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }

    image.onload = () => resolve({
      view: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height
    });
    image.onerror = () => reject(new Error('遮罩图加载失败，无法识别透明区域。'));
    image.src = source;
  });
}

/**
 * 读取缩放后的图片像素。
 *
 * @param {CanvasImageSource} image 图片视图。
 * @param {{ width: number, height: number }} size 分析尺寸。
 * @returns {Uint8ClampedArray} RGBA 像素。
 */
function readImagePixels(image, size) {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(size.width, size.height)
    : document.createElement('canvas');

  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('当前浏览器无法读取遮罩图像素。');
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);

  try {
    return context.getImageData(0, 0, size.width, size.height).data;
  } catch (error) {
    throw new Error(`遮罩图像素读取失败，请检查图片跨域配置：${error.message}`);
  }
}

/**
 * 查找最大透明连通区域，优先选择不接触图片边缘的区域。
 *
 * @param {Uint8ClampedArray} pixels RGBA 像素。
 * @param {number} width 图片宽度。
 * @param {number} height 图片高度。
 * @param {number} alphaThreshold 透明阈值。
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, count: number } | null}
 * 连通区域。
 */
function findLargestTransparentComponent(pixels, width, height, alphaThreshold) {
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let largestInterior = null;
  let largestAny = null;

  for (let index = 0; index < pixelCount; index += 1) {
    if (visited[index] || pixels[index * 4 + 3] > alphaThreshold) {
      continue;
    }

    const component = collectTransparentComponent(
      index,
      pixels,
      visited,
      queue,
      width,
      height,
      alphaThreshold
    );

    if (!largestAny || component.count > largestAny.count) {
      largestAny = component;
    }
    if (!component.touchesEdge && (!largestInterior || component.count > largestInterior.count)) {
      largestInterior = component;
    }
  }

  return largestInterior ?? largestAny;
}

/**
 * 使用四邻域广度优先搜索收集透明区域。
 *
 * @param {number} startIndex 起点像素索引。
 * @param {Uint8ClampedArray} pixels RGBA 像素。
 * @param {Uint8Array} visited 已访问标记。
 * @param {Int32Array} queue 复用队列。
 * @param {number} width 图片宽度。
 * @param {number} height 图片高度。
 * @param {number} alphaThreshold 透明阈值。
 * @returns {Object} 连通区域信息。
 */
function collectTransparentComponent(
  startIndex,
  pixels,
  visited,
  queue,
  width,
  height,
  alphaThreshold
) {
  let head = 0;
  let tail = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  let touchesEdge = false;

  queue[tail] = startIndex;
  tail += 1;
  visited[startIndex] = 1;

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    count += 1;
    touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;

    tail = enqueueTransparent(index - 1, x > 0, pixels, visited, queue, tail, alphaThreshold);
    tail = enqueueTransparent(index + 1, x < width - 1, pixels, visited, queue, tail, alphaThreshold);
    tail = enqueueTransparent(index - width, y > 0, pixels, visited, queue, tail, alphaThreshold);
    tail = enqueueTransparent(index + width, y < height - 1, pixels, visited, queue, tail, alphaThreshold);
  }

  return { minX, minY, maxX, maxY, count, touchesEdge };
}

/**
 * 将透明相邻像素加入队列。
 *
 * @param {number} index 像素索引。
 * @param {boolean} withinBounds 是否位于图片内。
 * @param {Uint8ClampedArray} pixels RGBA 像素。
 * @param {Uint8Array} visited 已访问标记。
 * @param {Int32Array} queue 队列。
 * @param {number} tail 当前队尾。
 * @param {number} alphaThreshold 透明阈值。
 * @returns {number} 新队尾。
 */
function enqueueTransparent(index, withinBounds, pixels, visited, queue, tail, alphaThreshold) {
  if (!withinBounds || visited[index] || pixels[index * 4 + 3] > alphaThreshold) {
    return tail;
  }

  visited[index] = 1;
  queue[tail] = index;
  return tail + 1;
}

/** @returns {{ width: number, height: number }} */
function getAnalysisSize(width, height, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

/** @returns {{ x: number, y: number, width: number, height: number, sourceWidth: number, sourceHeight: number }} */
function mapBoundsToSource(component, analysisSize, sourceSize) {
  const scaleX = sourceSize.width / analysisSize.width;
  const scaleY = sourceSize.height / analysisSize.height;
  const x = Math.floor(component.minX * scaleX);
  const y = Math.floor(component.minY * scaleY);
  const right = Math.ceil((component.maxX + 1) * scaleX);
  const bottom = Math.ceil((component.maxY + 1) * scaleY);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height
  };
}

/** @returns {number} */
function normalizeAlphaThreshold(value) {
  const number = value === undefined ? DEFAULT_ALPHA_THRESHOLD : Number(value);

  if (!Number.isFinite(number)) {
    throw new TypeError('alphaThreshold 必须是数字。');
  }

  return Math.min(255, Math.max(0, Math.round(number)));
}

/** @returns {number} */
function normalizePositiveInteger(value, key) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${key} 必须是正数。`);
  }

  return Math.round(number);
}
