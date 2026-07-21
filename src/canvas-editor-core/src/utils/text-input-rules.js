const DEFAULT_TEXT_INPUT_RULES = Object.freeze({
  enabled: false,
  characterSet: 'any',
  allowManualNewline: true,
  allowSymbols: false,
  singleVerticalLine: false,
  maxCharactersPerLine: null,
  maxCharacters: null,
  maxLines: null
})

/**
 * 归一化元素的文字输入规则。
 *
 * @param {Object} [source={}] textInput 属性。
 * @returns {Object} 可直接执行的规则快照。
 */
export function normalizeTextInputRules(source = {}) {
  const rules = isPlainObject(source) ? source : {}
  const singleVerticalLine = rules.singleVerticalLine === true
  const maxLines = singleVerticalLine ? null : normalizeOptionalPositiveInteger(rules.maxLines)

  return {
    enabled: rules.enabled === true,
    characterSet: rules.characterSet === 'latin' ? 'latin' : 'any',
    allowManualNewline: !singleVerticalLine && maxLines !== 1 && rules.allowManualNewline !== false,
    allowSymbols: rules.allowSymbols === true,
    singleVerticalLine,
    maxCharactersPerLine: singleVerticalLine
      ? null
      : normalizeOptionalPositiveInteger(rules.maxCharactersPerLine),
    maxCharacters: normalizeOptionalPositiveInteger(rules.maxCharacters),
    maxLines
  }
}

/**
 * 按元素规则过滤文字，中文及非 ASCII 字符计 2，ASCII 字符计 1。
 *
 * @param {*} value 用户输入。
 * @param {Object} [source={}] textInput 属性或已归一化规则。
 * @returns {string} 符合规则的文字。
 */
export function applyTextInputRules(value, source = {}) {
  const rules = normalizeTextInputRules(source)
  let result = String(value ?? '')

  if (!rules.enabled) {
    return result
  }

  result = result.replace(/\r\n?/g, '\n')
  if (!rules.allowManualNewline) result = result.replaceAll('\n', '')
  if (rules.characterSet === 'latin') result = result.replace(/[^\x20-\x7E\n\t]/g, '')
  if (!rules.allowSymbols) result = result.replace(/[^\p{L}\p{N}\s]/gu, '')
  if (rules.maxCharacters) result = truncateByWeightedLength(result, rules.maxCharacters)
  if (rules.maxCharactersPerLine) {
    result = wrapByWeightedLength(result, rules.maxCharactersPerLine)
  }
  if (rules.maxLines) result = result.split('\n').slice(0, rules.maxLines).join('\n')

  return result
}

/**
 * 判断输入规则是否需要多行控件。
 *
 * @param {Object} [source={}] textInput 属性。
 * @returns {boolean} 是否使用多行输入。
 */
export function supportsMultilineInput(source = {}) {
  const rules = normalizeTextInputRules(source)
  if (!rules.enabled || rules.singleVerticalLine || rules.maxLines === 1) {
    return false
  }

  return rules.allowManualNewline
    || rules.maxCharactersPerLine !== null
    || Number(rules.maxLines) > 1
}

/** @param {*} value 待校验整数。 @returns {number | null} 正整数或 null。 */
function normalizeOptionalPositiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

/**
 * @param {string} value 文字。
 * @param {number} maxLength 最大加权长度。
 * @returns {string} 截断后文字。
 */
function truncateByWeightedLength(value, maxLength) {
  let length = 0
  let result = ''

  for (const character of value) {
    const characterLength = getWeightedCharacterLength(character)
    if (length + characterLength > maxLength) break
    length += characterLength
    result += character
  }

  return result
}

/**
 * @param {string} value 文字。
 * @param {number} maxLength 单行最大加权长度。
 * @returns {string} 自动换行后文字。
 */
function wrapByWeightedLength(value, maxLength) {
  return value
    .split('\n')
    .flatMap((line) => wrapLineByWeightedLength(line, maxLength))
    .join('\n')
}

/**
 * @param {string} line 单行文字。
 * @param {number} maxLength 单行最大加权长度。
 * @returns {string[]} 拆分后的行。
 */
function wrapLineByWeightedLength(line, maxLength) {
  const lines = []
  let current = ''
  let length = 0

  for (const character of line) {
    const characterLength = getWeightedCharacterLength(character)
    if (characterLength > maxLength) continue
    if (current && length + characterLength > maxLength) {
      lines.push(current)
      current = ''
      length = 0
    }
    current += character
    length += characterLength
  }

  lines.push(current)
  return lines
}

/** @param {string} character 单个 Unicode 字符。 @returns {1 | 2} 加权长度。 */
function getWeightedCharacterLength(character) {
  if (character === '\n') {
    return 0
  }

  return character.codePointAt(0) <= 0xff ? 1 : 2
}

/** @param {*} value 待检查值。 @returns {boolean} 是否为普通对象。 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export { DEFAULT_TEXT_INPUT_RULES }
