import { ref } from 'vue';
import { resizeArtboardWithContent } from './artboard-content-scaling.js';
import { normalizePixelForUI } from './editor-ui-utils.js';
import { readLocalImage } from './local-files.js';

/**
 * 管理本地画板尺寸和背景图片。
 * @param {() => Object | null} getEditor 编辑器实例访问器。
 * @param {Function | null} notify 操作提示。
 * @returns {Object} 画板控件和操作。
 */
export function useArtboardControls(getEditor, notify = null) {
  const artboardWidth = ref(375);
  const artboardHeight = ref(667);
  const backgroundInputRef = ref(null);
  const backgroundUploading = ref(false);

  /** @returns {Object} 当前画板边界。 */
  function getArtboardBounds() {
    return getEditor()?.artboard?.getContentBounds() ?? {
      x: 0, y: 0, width: artboardWidth.value, height: artboardHeight.value
    };
  }

  /** @returns {void} 同步画板尺寸。 */
  function syncArtboardControls() {
    const bounds = getArtboardBounds();
    artboardWidth.value = normalizePixelForUI(bounds.width, 120);
    artboardHeight.value = normalizePixelForUI(bounds.height, 120);
  }

  /** @returns {void} 调整画板并等比适配内容。 */
  function updateArtboardSize() {
    const editor = getEditor();
    if (!editor) return;
    try {
      resizeArtboardWithContent(editor,
        normalizePixelForUI(artboardWidth.value, 120),
        normalizePixelForUI(artboardHeight.value, 120));
      syncArtboardControls();
      notify?.('画布与内容已等比调整。', 'success');
    } catch (error) {
      syncArtboardControls();
      notify?.(error.message || '画布调整失败。', 'error');
    }
  }

  /** @returns {void} 打开本地背景图选择器。 */
  function openBackgroundImagePicker() {
    if (!backgroundUploading.value) backgroundInputRef.value?.click();
  }

  /** @param {Event} event 文件选择事件。 @returns {Promise<void>} 导入背景。 */
  async function handleBackgroundImageChange(event) {
    const [file] = event.target.files ?? [];
    event.target.value = '';
    const editor = getEditor();
    if (!file || !editor || backgroundUploading.value) return;
    backgroundUploading.value = true;
    try {
      const oldBackgrounds = editor.getElementsByRole('background');
      const source = await readLocalImage(file);
      const node = await editor.image.add(source, {
        ...getArtboardBounds(), fit: 'cover', lockRatio: false, select: false
      });
      editor.elementData.set(node, { role: 'background' });
      node.name = '背景图';
      node.parent?.addAt(node, 0);
      oldBackgrounds.forEach(background => background.remove());
      editor.deselect();
      editor.artboard.syncAllElements();
      notify?.('背景图已导入。', 'success');
    } catch (error) {
      notify?.(error.message || '背景图导入失败。', 'error');
    } finally {
      backgroundUploading.value = false;
    }
  }

  return {
    artboardWidth, artboardHeight, backgroundInputRef, backgroundUploading,
    getArtboardBounds, syncArtboardControls, updateArtboardSize,
    openBackgroundImagePicker, handleBackgroundImageChange
  };
}
