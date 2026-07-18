/**
 * 解析后端正整数 ID，并为超出 JavaScript 安全范围的 int64 保留字符串精度。
 *
 * @param {*} value 原始 ID。
 * @returns {number | string | null} 安全数字、十进制字符串或 null。
 */
export function parsePositiveIntegerId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }

  if (typeof value === 'bigint') {
    return value > 0n ? normalizeDigitString(value.toString()) : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()
  if (!/^[1-9]\d*$/.test(text)) {
    return null
  }

  return normalizeDigitString(text)
}

/** @param {string} digits 十进制正整数字符串。 @returns {number | string} 规范 ID。 */
function normalizeDigitString(digits) {
  const number = Number(digits)
  return Number.isSafeInteger(number) ? number : digits
}
