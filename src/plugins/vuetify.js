import 'vuetify/styles';

import { h } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BringToFront, Check,
  ChevronDown, ChevronUp, CircleAlert, Crop, Crosshair, Eye, EyeOff, FileImage,
  FolderOpen, Group, Image, ImagePlus, ImageUp, Keyboard, Layers, Link, Link2Off,
  Lock, LockOpen, Maximize, Minus, MousePointer2, PanelLeftClose, PanelLeftOpen, PanelRightClose, Plus,
  Redo2, RotateCcw, Save, Shapes, Sparkles, Strikethrough, TextCursorInput,
  Trash2, Type, Underline, Undo2, Ungroup, X, ZoomIn, ZoomOut, Droplets,
  Italic, Settings2, GripVertical, ImageDown, Ruler, Palette, RotateCw
} from '@lucide/vue';

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
  const icons = {
    'mdi-vector-square': Layers,
    'mdi-image-outline': Image,
    'mdi-format-text': Type,
    'mdi-layers-outline': Layers,
    'mdi-artboard': Crop,
    'mdi-tools': Settings2,
    'mdi-undo-variant': Undo2,
    'mdi-redo-variant': Redo2,
    'mdi-minus': Minus,
    'mdi-plus': Plus,
    'mdi-fit-to-page-outline': Maximize,
    'mdi-crosshairs-gps': Crosshair,
    'mdi-keyboard-outline': Keyboard,
    'mdi-image-plus-outline': ImagePlus,
    'mdi-format-textbox': TextCursorInput,
    'mdi-chevron-up': ChevronUp,
    'mdi-chevron-down': ChevronDown,
    'mdi-check': Check,
    'mdi-format-italic': Italic,
    'mdi-format-underline': Underline,
    'mdi-format-strikethrough': Strikethrough,
    'mdi-format-align-left': AlignLeft,
    'mdi-format-align-center': AlignCenter,
    'mdi-format-align-right': AlignRight,
    'mdi-crop-free': Crop,
    'mdi-water-percent': Droplets,
    'mdi-delete-outline': Trash2,
    'mdi-drag-vertical': GripVertical,
    'mdi-close': X,
    'mdi-folder-open-outline': FolderOpen,
    'mdi-content-save-outline': Save,
    'mdi-eye-outline': Eye,
    'mdi-eye-off-outline': EyeOff,
    'mdi-tune-variant': Settings2,
    'mdi-mouse-off': MousePointer2,
    'mdi-cursor-default-click-outline': MousePointer2,
    'mdi-chevron-double-up': BringToFront,
    'mdi-arrow-up': ArrowUp,
    'mdi-arrow-down': ArrowDown,
    'mdi-lock-outline': Lock,
    'mdi-lock-open-variant-outline': LockOpen,
    'mdi-link-variant': Link,
    'mdi-link-variant-off': Link2Off,
    'mdi-image-size-select-large': Ruler,
    'mdi-restore': RotateCcw,
    'mdi-image-sync-outline': ImageUp,
    'mdi-content-copy': FileImage,
    'mdi-group': Group,
    'mdi-ungroup': Ungroup,
    'mdi-fit-to-page': Maximize,
    'mdi-image-download-outline': ImageDown,
    'mdi-palette-outline': Palette,
    'mdi-alert-circle-outline': CircleAlert,
    'mdi-sparkles': Sparkles,
    'mdi-rotate-right': RotateCw,
    'mdi-panel-right-close': PanelRightClose,
    'mdi-panel-left-close': PanelLeftClose,
    'mdi-panel-left-open': PanelLeftOpen,
    'mdi-zoom-in': ZoomIn,
    'mdi-zoom-out': ZoomOut
  };
  const iconSet = {
    component: ({ icon, ...props }) => {
      if (typeof icon === 'string' && icons[icon]) {
        return h(icons[icon], { ...props, size: props.size ?? 18, strokeWidth: 1.8 });
      }
      if (Array.isArray(icon)) {
        return h('svg', { viewBox: '0 0 24 24', ...props }, [h('path', { d: icon[0] })]);
      }
      return h(Shapes, { ...props, size: props.size ?? 18, strokeWidth: 1.8 });
    }
  };
  return createVuetify({
    icons: {
      defaultSet: 'lucide',
      aliases,
      sets: {
        lucide: iconSet,
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
