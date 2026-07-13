/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2024-04-29 14:38:47
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-01-27 15:10:10
 * @FilePath: /wufangzhai-custom/vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"
import vuetify from "vite-plugin-vuetify"
import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { VantResolver } from "@vant/auto-import-resolver"
import { resolve } from "path"
import { versionInjector } from "./vite-plugin-version.js"

export default ({ mode }) => {
	const env = loadEnv(mode, process.cwd())

	return {
		base: env.VITE_OUTDIR,
		resolve: {
			alias: {
				"@": resolve("src"),
			},
		},
		build: {
			outDir: "dist" + mode,
		},
		plugins: [
			vue(),
			vuetify({ autoImport: true }),
			versionInjector(),
			AutoImport({
				imports: ["vue"],
				dts: "src/auto-import.d.ts",
				include: [
					/\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
					/\.vue$/,
					/\.vue\?vue/, // .vue
					/\.md$/, // .md
				],
				// 解决eslint报错问题
				eslintrc: {
					// 这里先设置成true然后npm run dev 运行之后会生成 .eslintrc-auto-import.json 文件之后，在改为false
					enabled: true,
					filepath: "./.eslintrc-auto-import.json", // 生成的文件路径
					globalsPropValue: true,
				},
			}),
			Components({
				dts: false,
				resolvers: [VantResolver()],
			}),
		],
		css: {
			// postcss: './postcss.config.js',
			preprocessorOptions: {
				less: {
					modifyVars: {
						hack: `true;`,
					},
					math: "strict",
					javascriptEnabled: true,
				},
				scss: {
					api: "modern",
					additionalData: '@import "./src/assets/scss/global.scss";',
					silenceDeprecations: ["legacy-js-api", "import"],
				},
			},
			postcss: {},
		},
		server: {
			// 是否开启 https
			https: false,
			// 端口号
			port: 5137,
			// 监听所有地址
			host: "0.0.0.0",
			// 服务启动时是否自动打开浏览器
			open: true,
			// 允许跨域
			cors: true,
			proxy: {},
		},
	}
}
