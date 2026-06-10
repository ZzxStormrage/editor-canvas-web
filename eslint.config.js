/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2024-06-16 19:59:41
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2025-08-15 16:48:48
 * @FilePath: \yuyiyujing-admin\.eslintrc.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:vue/vue3-essential",
		"plugin:prettier/recommended",
		"./.eslintrc-auto-import.json",
	],
	overrides: [],
	parser: "vue-eslint-parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	plugins: ["vue"],
	rules: {
		/**
		 * "off" or 0 - 关闭规则
		 * "warn" or 1 - 将规则视为一个警告
		 * "error" or 2 - 将规则视为一个错误
		 */
		// 确保导入指向可以解析的文件/模块
		"import/no-unresolved": 0,
		// 首选默认导出导入/首选默认导出
		"import/prefer-default-export": 0,
		// 需要使用 === 和 !==
		eqeqeq: 2,
		// 要求组件名称始终为多字
		"vue/multi-word-component-names": 0,
		// 禁止使用var声明变量
		"no-var": 2,
	},
}
