import {
  applyTextInputRules,
  DEFAULT_TEXT_INPUT_RULES,
  normalizeTextInputRules,
  supportsMultilineInput
} from '../../../canvas-editor-core/src/utils/text-input-rules.js'

/**
 * 创建 H5 文本输入控制器。
 *
 * 页面只提供元素规则和最终值回调；控制器负责避开输入法组合中的临时字符，
 * 并在提交输入时统一执行核心过滤规则和输入框回写。
 *
 * @returns {{
 *   handleCompositionStart: (event: Event) => void,
 *   handleCompositionEnd: (event: Event, rules?: Object, onValue?: Function) => string | null,
 *   handleInput: (event: Event, rules?: Object, onValue?: Function) => string | null
 * }} H5 输入事件处理器。
 */
export function createH5TextInputController() {
  const composingTargets = new WeakSet()

  /** @param {Event} event 输入法组合开始事件。 @returns {void} */
  function handleCompositionStart(event) {
    const target = resolveTextInputTarget(event)
    if (target) {
      composingTargets.add(target)
    }
  }

  /**
   * @param {Event} event 输入事件。
   * @param {Object} [rules={}] 元素的 textInput 规则。
   * @param {(value: string) => void} [onValue] 最终值回调。
   * @returns {string | null} 已提交的最终值；组合输入中返回 null。
   */
  function handleInput(event, rules = {}, onValue) {
    const target = resolveTextInputTarget(event)
    if (!target || composingTargets.has(target)) {
      return null
    }

    return commitTextInputValue(target, rules, onValue)
  }

  /**
   * @param {Event} event 输入法组合结束事件。
   * @param {Object} [rules={}] 元素的 textInput 规则。
   * @param {(value: string) => void} [onValue] 最终值回调。
   * @returns {string | null} 已提交的最终值。
   */
  function handleCompositionEnd(event, rules = {}, onValue) {
    const target = resolveTextInputTarget(event)
    if (!target) {
      return null
    }

    composingTargets.delete(target)
    return commitTextInputValue(target, rules, onValue)
  }

  return Object.freeze({
    handleCompositionStart,
    handleCompositionEnd,
    handleInput
  })
}

/**
 * @param {{ value: * }} target 文本输入控件。
 * @param {Object} rules 元素的 textInput 规则。
 * @param {(value: string) => void} [onValue] 最终值回调。
 * @returns {string} 规则处理后的最终值。
 */
function commitTextInputValue(target, rules, onValue) {
  const nextValue = applyTextInputRules(target.value, rules)
  if (target.value !== nextValue) {
    target.value = nextValue
  }
  if (typeof onValue === 'function') {
    onValue(nextValue)
  }
  return nextValue
}

/** @param {Event} event 输入事件。 @returns {{ value: * } | null} 输入控件。 */
function resolveTextInputTarget(event) {
  const target = event?.target
  return target && typeof target === 'object' && 'value' in target ? target : null
}

export {
  applyTextInputRules,
  DEFAULT_TEXT_INPUT_RULES,
  normalizeTextInputRules,
  supportsMultilineInput
}
