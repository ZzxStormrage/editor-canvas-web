// vite.config.ts
import { loadEnv } from "file:///D:/xiaoxiang/ele-editor-v2/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/xiaoxiang/ele-editor-v2/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vuetify from "file:///D:/xiaoxiang/ele-editor-v2/node_modules/vite-plugin-vuetify/dist/index.mjs";
import AutoImport from "file:///D:/xiaoxiang/ele-editor-v2/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/xiaoxiang/ele-editor-v2/node_modules/unplugin-vue-components/dist/vite.js";
import { VantResolver } from "file:///D:/xiaoxiang/ele-editor-v2/node_modules/@vant/auto-import-resolver/dist/index.js";
import { resolve as resolve2 } from "path";

// vite-plugin-version.js
import { readFileSync } from "fs";
import { resolve } from "path";
function versionInjector() {
  const packageJsonPath = resolve("package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const { version } = packageJson;
  return {
    name: "vite-plugin-version",
    transform(code, id) {
      if (id.endsWith(".vue")) {
        return code.replace("__VERSION__", version);
      }
      return code;
    }
  };
}

// vite.config.ts
var vite_config_default = ({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: env.VITE_OUTDIR,
    resolve: {
      alias: {
        "@": resolve2("src")
      }
    },
    build: {
      outDir: "dist" + mode
    },
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
      versionInjector(),
      AutoImport({
        imports: ["vue"],
        dts: "src/auto-import.d.ts",
        include: [
          /\.[tj]sx?$/,
          // .ts, .tsx, .js, .jsx
          /\.vue$/,
          /\.vue\?vue/,
          // .vue
          /\.md$/
          // .md
        ],
        // 解决eslint报错问题
        eslintrc: {
          // 这里先设置成true然后npm run dev 运行之后会生成 .eslintrc-auto-import.json 文件之后，在改为false
          enabled: true,
          filepath: "./.eslintrc-auto-import.json",
          // 生成的文件路径
          globalsPropValue: true
        }
      }),
      Components({
        dts: false,
        resolvers: [VantResolver()]
      })
    ],
    css: {
      // postcss: './postcss.config.js',
      preprocessorOptions: {
        less: {
          modifyVars: {
            hack: `true;`
          },
          math: "strict",
          javascriptEnabled: true
        },
        scss: {
          api: "modern",
          additionalData: '@import "./src/assets/scss/global.scss";',
          silenceDeprecations: ["legacy-js-api", "import"]
        }
      },
      postcss: {}
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
      proxy: {}
    }
  };
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAidml0ZS1wbHVnaW4tdmVyc2lvbi5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXHhpYW94aWFuZ1xcXFxlbGUtZWRpdG9yLXYyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFx4aWFveGlhbmdcXFxcZWxlLWVkaXRvci12MlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDoveGlhb3hpYW5nL2VsZS1lZGl0b3ItdjIvdml0ZS5jb25maWcudHNcIjsvKlxyXG4gKiBAQXV0aG9yOiB6enggNDUyNDM2Mjc1QHFxLmNvbVxyXG4gKiBARGF0ZTogMjAyNC0wNC0yOSAxNDozODo0N1xyXG4gKiBATGFzdEVkaXRvcnM6IHp6eCA0NTI0MzYyNzVAcXEuY29tXHJcbiAqIEBMYXN0RWRpdFRpbWU6IDIwMjYtMDEtMjcgMTU6MTA6MTBcclxuICogQEZpbGVQYXRoOiAvd3VmYW5nemhhaS1jdXN0b20vdml0ZS5jb25maWcudHNcclxuICogQERlc2NyaXB0aW9uOiBcdThGRDlcdTY2MkZcdTlFRDhcdThCQTRcdThCQkVcdTdGNkUsXHU4QkY3XHU4QkJFXHU3RjZFYGN1c3RvbU1hZGVgLCBcdTYyNTNcdTVGMDBrb3JvRmlsZUhlYWRlclx1NjdFNVx1NzcwQlx1OTE0RFx1N0Y2RSBcdThGREJcdTg4NENcdThCQkVcdTdGNkU6IGh0dHBzOi8vZ2l0aHViLmNvbS9PQktvcm8xL2tvcm8xRmlsZUhlYWRlci93aWtpLyVFOSU4NSU4RCVFNyVCRCVBRVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiXG5pbXBvcnQgdnVlIGZyb20gXCJAdml0ZWpzL3BsdWdpbi12dWVcIlxuaW1wb3J0IHZ1ZXRpZnkgZnJvbSBcInZpdGUtcGx1Z2luLXZ1ZXRpZnlcIlxuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSBcInVucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGVcIlxuaW1wb3J0IENvbXBvbmVudHMgZnJvbSBcInVucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGVcIlxyXG5pbXBvcnQgeyBWYW50UmVzb2x2ZXIgfSBmcm9tIFwiQHZhbnQvYXV0by1pbXBvcnQtcmVzb2x2ZXJcIlxyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIlxyXG5pbXBvcnQgeyB2ZXJzaW9uSW5qZWN0b3IgfSBmcm9tIFwiLi92aXRlLXBsdWdpbi12ZXJzaW9uLmpzXCJcclxuXHJcbmV4cG9ydCBkZWZhdWx0ICh7IG1vZGUgfSkgPT4ge1xuXHRjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCkpXHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRiYXNlOiBlbnYuVklURV9PVVRESVIsXHJcblx0XHRyZXNvbHZlOiB7XHJcblx0XHRcdGFsaWFzOiB7XHJcblx0XHRcdFx0XCJAXCI6IHJlc29sdmUoXCJzcmNcIiksXHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdFx0YnVpbGQ6IHtcclxuXHRcdFx0b3V0RGlyOiBcImRpc3RcIiArIG1vZGUsXHJcblx0XHR9LFxyXG5cdFx0cGx1Z2luczogW1xuXHRcdFx0dnVlKCksXG5cdFx0XHR2dWV0aWZ5KHsgYXV0b0ltcG9ydDogdHJ1ZSB9KSxcblx0XHRcdHZlcnNpb25JbmplY3RvcigpLFxuXHRcdFx0QXV0b0ltcG9ydCh7XHJcblx0XHRcdFx0aW1wb3J0czogW1widnVlXCJdLFxyXG5cdFx0XHRcdGR0czogXCJzcmMvYXV0by1pbXBvcnQuZC50c1wiLFxyXG5cdFx0XHRcdGluY2x1ZGU6IFtcclxuXHRcdFx0XHRcdC9cXC5bdGpdc3g/JC8sIC8vIC50cywgLnRzeCwgLmpzLCAuanN4XHJcblx0XHRcdFx0XHQvXFwudnVlJC8sXHJcblx0XHRcdFx0XHQvXFwudnVlXFw/dnVlLywgLy8gLnZ1ZVxyXG5cdFx0XHRcdFx0L1xcLm1kJC8sIC8vIC5tZFxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0Ly8gXHU4OUUzXHU1MUIzZXNsaW50XHU2MkE1XHU5NTE5XHU5NUVFXHU5ODk4XHJcblx0XHRcdFx0ZXNsaW50cmM6IHtcclxuXHRcdFx0XHRcdC8vIFx1OEZEOVx1OTFDQ1x1NTE0OFx1OEJCRVx1N0Y2RVx1NjIxMHRydWVcdTcxMzZcdTU0MEVucG0gcnVuIGRldiBcdThGRDBcdTg4NENcdTRFNEJcdTU0MEVcdTRGMUFcdTc1MUZcdTYyMTAgLmVzbGludHJjLWF1dG8taW1wb3J0Lmpzb24gXHU2NTg3XHU0RUY2XHU0RTRCXHU1NDBFXHVGRjBDXHU1NzI4XHU2NTM5XHU0RTNBZmFsc2VcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRmaWxlcGF0aDogXCIuLy5lc2xpbnRyYy1hdXRvLWltcG9ydC5qc29uXCIsIC8vIFx1NzUxRlx1NjIxMFx1NzY4NFx1NjU4N1x1NEVGNlx1OERFRlx1NUY4NFxyXG5cdFx0XHRcdFx0Z2xvYmFsc1Byb3BWYWx1ZTogdHJ1ZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KSxcblx0XHRcdENvbXBvbmVudHMoe1xuXHRcdFx0XHRkdHM6IGZhbHNlLFxuXHRcdFx0XHRyZXNvbHZlcnM6IFtWYW50UmVzb2x2ZXIoKV0sXG5cdFx0XHR9KSxcblx0XHRdLFxyXG5cdFx0Y3NzOiB7XHJcblx0XHRcdC8vIHBvc3Rjc3M6ICcuL3Bvc3Rjc3MuY29uZmlnLmpzJyxcclxuXHRcdFx0cHJlcHJvY2Vzc29yT3B0aW9uczoge1xyXG5cdFx0XHRcdGxlc3M6IHtcclxuXHRcdFx0XHRcdG1vZGlmeVZhcnM6IHtcclxuXHRcdFx0XHRcdFx0aGFjazogYHRydWU7YCxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRtYXRoOiBcInN0cmljdFwiLFxyXG5cdFx0XHRcdFx0amF2YXNjcmlwdEVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRzY3NzOiB7XHJcblx0XHRcdFx0XHRhcGk6IFwibW9kZXJuXCIsXHJcblx0XHRcdFx0XHRhZGRpdGlvbmFsRGF0YTogJ0BpbXBvcnQgXCIuL3NyYy9hc3NldHMvc2Nzcy9nbG9iYWwuc2Nzc1wiOycsXHJcblx0XHRcdFx0XHRzaWxlbmNlRGVwcmVjYXRpb25zOiBbXCJsZWdhY3ktanMtYXBpXCIsIFwiaW1wb3J0XCJdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdHBvc3Rjc3M6IHt9LFxyXG5cdFx0fSxcclxuXHRcdHNlcnZlcjoge1xyXG5cdFx0XHQvLyBcdTY2MkZcdTU0MjZcdTVGMDBcdTU0MkYgaHR0cHNcclxuXHRcdFx0aHR0cHM6IGZhbHNlLFxyXG5cdFx0XHQvLyBcdTdBRUZcdTUzRTNcdTUzRjdcclxuXHRcdFx0cG9ydDogNTEzNyxcclxuXHRcdFx0Ly8gXHU3NkQxXHU1NDJDXHU2MjQwXHU2NzA5XHU1NzMwXHU1NzQwXHJcblx0XHRcdGhvc3Q6IFwiMC4wLjAuMFwiLFxyXG5cdFx0XHQvLyBcdTY3MERcdTUyQTFcdTU0MkZcdTUyQThcdTY1RjZcdTY2MkZcdTU0MjZcdTgxRUFcdTUyQThcdTYyNTNcdTVGMDBcdTZENEZcdTg5QzhcdTU2NjhcclxuXHRcdFx0b3BlbjogdHJ1ZSxcclxuXHRcdFx0Ly8gXHU1MTQxXHU4QkI4XHU4REU4XHU1N0RGXHJcblx0XHRcdGNvcnM6IHRydWUsXHJcblx0XHRcdHByb3h5OiB7fSxcclxuXHRcdH0sXHJcblx0fVxyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxceGlhb3hpYW5nXFxcXGVsZS1lZGl0b3ItdjJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHhpYW94aWFuZ1xcXFxlbGUtZWRpdG9yLXYyXFxcXHZpdGUtcGx1Z2luLXZlcnNpb24uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L3hpYW94aWFuZy9lbGUtZWRpdG9yLXYyL3ZpdGUtcGx1Z2luLXZlcnNpb24uanNcIjsvKlxyXG4gKiBAQXV0aG9yOiB6enggNDUyNDM2Mjc1QHFxLmNvbVxyXG4gKiBARGF0ZTogMjAyNC0wNC0yOSAxMTozMTozOFxyXG4gKiBATGFzdEVkaXRvcnM6IHp6eCA0NTI0MzYyNzVAcXEuY29tXHJcbiAqIEBMYXN0RWRpdFRpbWU6IDIwMjQtMDQtMjkgMTU6MDA6MzdcclxuICogQEZpbGVQYXRoOiAvd3VmYW5nemhhaS1jdXN0b20vdml0ZS1wbHVnaW4tdmVyc2lvbi5qc1xyXG4gKiBARGVzY3JpcHRpb246IFx1OEZEOVx1NjYyRlx1OUVEOFx1OEJBNFx1OEJCRVx1N0Y2RSxcdThCRjdcdThCQkVcdTdGNkVgY3VzdG9tTWFkZWAsIFx1NjI1M1x1NUYwMGtvcm9GaWxlSGVhZGVyXHU2N0U1XHU3NzBCXHU5MTREXHU3RjZFIFx1OEZEQlx1ODg0Q1x1OEJCRVx1N0Y2RTogaHR0cHM6Ly9naXRodWIuY29tL09CS29ybzEva29ybzFGaWxlSGVhZGVyL3dpa2kvJUU5JTg1JThEJUU3JUJEJUFFXHJcbiAqL1xyXG4vLyB2aXRlLXBsdWdpbi12ZXJzaW9uLmpzXHJcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiXHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmVyc2lvbkluamVjdG9yKCkge1xyXG5cdC8vIFx1OEJGQlx1NTNENiBwYWNrYWdlLmpzb24gXHU2NTg3XHU0RUY2XHJcblx0Y29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShcInBhY2thZ2UuanNvblwiKVxyXG5cdGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCBcInV0ZjhcIikpXHJcblx0Ly8gXHU0RjdGXHU3NTI4XHU1QkY5XHU4QzYxXHU4OUUzXHU2Nzg0XHU4M0I3XHU1M0Q2XHU3MjQ4XHU2NzJDXHU1M0Y3XHJcblx0Y29uc3QgeyB2ZXJzaW9uIH0gPSBwYWNrYWdlSnNvblxyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0bmFtZTogXCJ2aXRlLXBsdWdpbi12ZXJzaW9uXCIsXHJcblx0XHR0cmFuc2Zvcm0oY29kZSwgaWQpIHtcclxuXHRcdFx0aWYgKGlkLmVuZHNXaXRoKFwiLnZ1ZVwiKSkge1xyXG5cdFx0XHRcdC8vIFx1NjZGRlx1NjM2Mlx1NTM2MFx1NEY0RFx1N0IyNlx1NEUzQVx1NzI0OFx1NjcyQ1x1NTNGN1xyXG5cdFx0XHRcdHJldHVybiBjb2RlLnJlcGxhY2UoXCJfX1ZFUlNJT05fX1wiLCB2ZXJzaW9uKVxyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBjb2RlXHJcblx0XHR9LFxyXG5cdH1cclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBU0EsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sU0FBUztBQUNoQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxXQUFBQSxnQkFBZTs7O0FDTnhCLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsZUFBZTtBQUVqQixTQUFTLGtCQUFrQjtBQUVqQyxRQUFNLGtCQUFrQixRQUFRLGNBQWM7QUFDOUMsUUFBTSxjQUFjLEtBQUssTUFBTSxhQUFhLGlCQUFpQixNQUFNLENBQUM7QUFFcEUsUUFBTSxFQUFFLFFBQVEsSUFBSTtBQUVwQixTQUFPO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixVQUFVLE1BQU0sSUFBSTtBQUNuQixVQUFJLEdBQUcsU0FBUyxNQUFNLEdBQUc7QUFFeEIsZUFBTyxLQUFLLFFBQVEsZUFBZSxPQUFPO0FBQUEsTUFDM0M7QUFDQSxhQUFPO0FBQUEsSUFDUjtBQUFBLEVBQ0Q7QUFDRDs7O0FEWEEsSUFBTyxzQkFBUSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQzVCLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLENBQUM7QUFFdkMsU0FBTztBQUFBLElBQ04sTUFBTSxJQUFJO0FBQUEsSUFDVixTQUFTO0FBQUEsTUFDUixPQUFPO0FBQUEsUUFDTixLQUFLQyxTQUFRLEtBQUs7QUFBQSxNQUNuQjtBQUFBLElBQ0Q7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNOLFFBQVEsU0FBUztBQUFBLElBQ2xCO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUixJQUFJO0FBQUEsTUFDSixRQUFRLEVBQUUsWUFBWSxLQUFLLENBQUM7QUFBQSxNQUM1QixnQkFBZ0I7QUFBQSxNQUNoQixXQUFXO0FBQUEsUUFDVixTQUFTLENBQUMsS0FBSztBQUFBLFFBQ2YsS0FBSztBQUFBLFFBQ0wsU0FBUztBQUFBLFVBQ1I7QUFBQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUE7QUFBQSxVQUNBO0FBQUE7QUFBQSxRQUNEO0FBQUE7QUFBQSxRQUVBLFVBQVU7QUFBQTtBQUFBLFVBRVQsU0FBUztBQUFBLFVBQ1QsVUFBVTtBQUFBO0FBQUEsVUFDVixrQkFBa0I7QUFBQSxRQUNuQjtBQUFBLE1BQ0QsQ0FBQztBQUFBLE1BQ0QsV0FBVztBQUFBLFFBQ1YsS0FBSztBQUFBLFFBQ0wsV0FBVyxDQUFDLGFBQWEsQ0FBQztBQUFBLE1BQzNCLENBQUM7QUFBQSxJQUNGO0FBQUEsSUFDQSxLQUFLO0FBQUE7QUFBQSxNQUVKLHFCQUFxQjtBQUFBLFFBQ3BCLE1BQU07QUFBQSxVQUNMLFlBQVk7QUFBQSxZQUNYLE1BQU07QUFBQSxVQUNQO0FBQUEsVUFDQSxNQUFNO0FBQUEsVUFDTixtQkFBbUI7QUFBQSxRQUNwQjtBQUFBLFFBQ0EsTUFBTTtBQUFBLFVBQ0wsS0FBSztBQUFBLFVBQ0wsZ0JBQWdCO0FBQUEsVUFDaEIscUJBQXFCLENBQUMsaUJBQWlCLFFBQVE7QUFBQSxRQUNoRDtBQUFBLE1BQ0Q7QUFBQSxNQUNBLFNBQVMsQ0FBQztBQUFBLElBQ1g7QUFBQSxJQUNBLFFBQVE7QUFBQTtBQUFBLE1BRVAsT0FBTztBQUFBO0FBQUEsTUFFUCxNQUFNO0FBQUE7QUFBQSxNQUVOLE1BQU07QUFBQTtBQUFBLE1BRU4sTUFBTTtBQUFBO0FBQUEsTUFFTixNQUFNO0FBQUEsTUFDTixPQUFPLENBQUM7QUFBQSxJQUNUO0FBQUEsRUFDRDtBQUNEOyIsCiAgIm5hbWVzIjogWyJyZXNvbHZlIiwgInJlc29sdmUiXQp9Cg==
