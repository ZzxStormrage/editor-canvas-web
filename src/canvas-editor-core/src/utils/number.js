import { MathHelper, isUndefined } from 'leafer-ui';

import { EditorError } from '../errors/editor-error.js';

/**
 * 归一化正数。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {number | string} value 待归一化的值。
 * @param {string} key 配置键名。
 * @returns {number} 归一化后的正数。
 * @throws {EditorError} 当值不是正数时抛出。
 */
export function normalizePositiveNumber(value, key) {
  const normalizedValue = Number(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    throw new EditorError(`${key} must be greater than 0.`, 'INVALID_POSITIVE_NUMBER');
  }

  return normalizedValue;
}

/**
 * 归一化可选正数。
 *
 * @param {number | string | undefined | null} value 待归一化的值。
 * @param {string} key 配置键名。
 * @returns {number | undefined} 归一化后的正数。
 * @throws {EditorError} 当值不是正数时抛出。
 */
export function normalizeOptionalPositiveNumber(value, key) {
  if (isUndefined(value) || value === null) {
    return undefined;
  }

  return normalizePositiveNumber(value, key);
}

/**
 * 归一化 0-1 比例。
 *
 * @param {number | string} value 待归一化的值。
 * @param {string} key 配置键名。
 * @returns {number} 归一化后的比例。
 * @throws {EditorError} 当值不在合法范围时抛出。
 */
export function normalizeRatio(value, key) {
  const normalizedValue = normalizePositiveNumber(value, key);

  if (normalizedValue > 1) {
    throw new EditorError(`${key} must be less than or equal to 1.`, 'INVALID_RATIO');
  }

  return normalizedValue;
}

/**
 * 限制数值范围，使用 LeaferJS MathHelper.within。
 *
 * @param {number} value 当前值。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @returns {number} 限制后的值。
 */
export function clamp(value, min, max) {
  return MathHelper.within(value, min, max);
}
