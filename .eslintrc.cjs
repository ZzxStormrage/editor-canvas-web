/*
 * ESLint 8 legacy config.
 * The project uses ESM, so CommonJS configuration must use the .cjs suffix.
 */
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    './.eslintrc-auto-import.json'
  ],
  ignorePatterns: [
    'dist*',
    'components.d.ts',
    'public/uni.webview.1.5.8.js',
    'src/auto-import.d.ts',
    'src/vite-env.d.ts'
  ],
  overrides: [],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['vue'],
  rules: {
    'import/no-unresolved': 0,
    'import/prefer-default-export': 0,
    eqeqeq: 2,
    'vue/multi-word-component-names': 0,
    'vue/no-mutating-props': ['error', { shallowOnly: true }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 2
  }
};
