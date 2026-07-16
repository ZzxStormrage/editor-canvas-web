import { isString } from 'leafer-ui'

import { EditorError } from '../errors/editor-error.js'
import { normalizeOptionalPositiveNumber } from './number.js'

const TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify', 'justify-letter', 'both', 'both-letter'])

const VERTICAL_ALIGN_VALUES = new Set(['top', 'middle', 'bottom'])

const TEXT_DECORATION_VALUES = new Set(['none', 'under', 'delete', 'under-delete'])

const WRITING_MODE_VALUES = new Set(['x', 'y', 'x-reverse', 'y-reverse'])

/**
 * 归一化文本配置。
 *
 * @author zzx
 * @since 2026-07-01
 * @param {Object} [text={}] 外部传入的文本配置。
 * @param {Object} [baseText={}] 基础文本配置。
 * @returns {Object} 归一化后的文本配置。
 */
export function normalizeTextOptions(text = {}, baseText = {}) {
  const merged = { ...baseText, ...(text ?? {}) }
  const fontSize = normalizeOptionalPositiveNumber(merged.fontSize, 'text.fontSize')
  const width = normalizeOptionalPositiveNumber(merged.width, 'text.width')
  const lineHeight = normalizeOptionalPositiveNumber(merged.lineHeight, 'text.lineHeight')
  const letterSpacing = normalizeOptionalNonNegativeNumber(merged.letterSpacing, 'text.letterSpacing')

  return omitUndefined({
    text: normalizeTextValue(merged.text),
    placeholder: normalizeOptionalString(merged.placeholder, 'text.placeholder'),
    fontFamily: normalizeFontFamily(merged.fontFamily),
    fontUrl: normalizeFontUrl(merged.fontUrl),
    fontSize,
    fontWeight: merged.fontWeight,
    italic: normalizeOptionalBoolean(merged.italic, 'text.italic'),
    textDecoration: normalizeTextDecoration(merged.textDecoration),
    fill: normalizeOptionalString(merged.fill, 'text.fill'),
    textAlign: normalizeTextAlign(merged.textAlign),
    verticalAlign: normalizeVerticalAlign(merged.verticalAlign),
    writingMode: normalizeWritingMode(merged.writingMode),
    lineHeight,
    letterSpacing,
    width
  })
}

/**
 * 判断节点是否为 Leafer 文本节点。
 *
 * @param {*} element 待判断节点。
 * @returns {boolean} 是否为文本节点。
 */
export function isTextElement(element) {
  return element?.tag === 'Text' || element?.constructor?.name === 'Text'
}

function normalizeTextValue(value) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (isString(value) || typeof value === 'number') {
    return String(value)
  }

  throw new EditorError('text.text must be a string or number.', 'TEXT_VALUE_INVALID')
}

function normalizeOptionalString(value, key) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!isString(value)) {
    throw new EditorError(`${key} must be a string.`, 'TEXT_STRING_INVALID')
  }

  return value
}

function normalizeFontFamily(value) {
  const fontFamily = normalizeOptionalString(value, 'text.fontFamily')

  if (!fontFamily || fontFamily.includes(',') || /^['"].*['"]$/.test(fontFamily)) {
    return fontFamily
  }

  return /\s/.test(fontFamily) ? `"${fontFamily}"` : fontFamily
}

function normalizeFontUrl(value) {
  const fontUrl = normalizeOptionalString(value, 'text.fontUrl')?.trim()

  return fontUrl || undefined
}

function normalizeOptionalBoolean(value, key) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new EditorError(`${key} must be a boolean.`, 'TEXT_BOOLEAN_INVALID')
  }

  return value
}

function normalizeOptionalNonNegativeNumber(value, key) {
  if (value === undefined || value === null) {
    return undefined
  }

  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw new EditorError(`${key} must be greater than or equal to 0.`, 'INVALID_NON_NEGATIVE_NUMBER')
  }

  return normalizedValue
}

function normalizeTextAlign(value) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!TEXT_ALIGN_VALUES.has(value)) {
    throw new EditorError('text.textAlign is invalid.', 'TEXT_ALIGN_INVALID')
  }

  return value
}

function normalizeVerticalAlign(value) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!VERTICAL_ALIGN_VALUES.has(value)) {
    throw new EditorError('text.verticalAlign is invalid.', 'TEXT_VERTICAL_ALIGN_INVALID')
  }

  return value
}

function normalizeTextDecoration(value) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!TEXT_DECORATION_VALUES.has(value)) {
    throw new EditorError('text.textDecoration is invalid.', 'TEXT_DECORATION_INVALID')
  }

  return value
}

function normalizeWritingMode(value) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!WRITING_MODE_VALUES.has(value)) {
    throw new EditorError('text.writingMode is invalid.', 'TEXT_WRITING_MODE_INVALID')
  }

  return value
}

function omitUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined))
}
