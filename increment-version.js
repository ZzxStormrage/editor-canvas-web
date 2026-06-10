// increment-version.js
import fs from "fs"
import { resolve } from "path"

const packageJsonPath = resolve("package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

// 使用对象解构获取当前版本号
const { version } = packageJson
const versionParts = version.split(".").map((part) => parseInt(part, 10))

// 自增版本号
if (versionParts[2] < 9) {
	versionParts[2] += 1
} else {
	versionParts[2] = 0
	if (versionParts[1] < 9) {
		versionParts[1] += 1
	} else {
		versionParts[1] = 0
		versionParts[0] += 1
	}
}

// 将新版本号保存回 package.json
const newVersion = versionParts.join(".")
packageJson.version = newVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8")

console.log(`版本更新为: ${newVersion}`)
