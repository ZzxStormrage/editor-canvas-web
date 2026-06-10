/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2024-04-29 11:31:38
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2024-04-29 15:00:37
 * @FilePath: /wufangzhai-custom/vite-plugin-version.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// vite-plugin-version.js
import { readFileSync } from "fs"
import { resolve } from "path"

export function versionInjector() {
	// 读取 package.json 文件
	const packageJsonPath = resolve("package.json")
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))
	// 使用对象解构获取版本号
	const { version } = packageJson

	return {
		name: "vite-plugin-version",
		transform(code, id) {
			if (id.endsWith(".vue")) {
				// 替换占位符为版本号
				return code.replace("__VERSION__", version)
			}
			return code
		},
	}
}
