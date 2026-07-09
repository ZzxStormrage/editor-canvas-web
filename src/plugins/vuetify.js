import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

import {
  EDITOR_COMPONENT_DEFAULTS,
  EDITOR_THEME_COLORS,
  EDITOR_THEME_NAME
} from '../config/vuetify-theme.js';

/**
 * 创建 Vuetify 插件实例。
 *
 * @returns {import('vuetify').Vuetify} Vuetify 插件实例。
 */
export function createVuetifyPlugin() {
  return createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi
      }
    },
    theme: {
      defaultTheme: EDITOR_THEME_NAME,
      themes: {
        [EDITOR_THEME_NAME]: {
          dark: false,
          colors: EDITOR_THEME_COLORS
        }
      }
    },
    defaults: EDITOR_COMPONENT_DEFAULTS
  });
}
