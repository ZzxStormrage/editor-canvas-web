import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

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
      defaultTheme: 'eleLight',
      themes: {
        eleLight: {
          dark: false,
          colors: {
            background: '#f7f9fd',
            surface: '#ffffff',
            primary: '#7c3aed',
            secondary: '#22c7d5',
            accent: '#ec6cff',
            error: '#ef4444',
            info: '#2563eb',
            success: '#16a34a',
            warning: '#f59e0b'
          }
        }
      }
    },
    defaults: {
      VBtn: {
        rounded: 'lg',
        variant: 'flat',
        density: 'comfortable',
        height: 34
      },
      VTextField: {
        density: 'compact',
        variant: 'outlined',
        color: 'primary',
        hideDetails: true
      },
      VSelect: {
        density: 'compact',
        variant: 'outlined',
        color: 'primary',
        hideDetails: true
      }
    }
  })
}
