import { createEditor } from '../src/index.js';

const editor = createEditor({
  view: document.querySelector('#canvas'),
  autoResize: true,
  artboard: { width: 600, height: 400 }
});
editor.fitArtboardToView();

/** @param {unknown} error 操作错误。 @returns {void} 显示错误信息。 */
function showError(error) {
  document.querySelector('#message').textContent = error instanceof Error ? error.message : String(error);
}

/** @param {string} id 控件 ID。 @param {Function} action 操作。 @returns {void} 绑定操作。 */
function bind(id, action) {
  document.getElementById(id).addEventListener('click', () => {
    Promise.resolve().then(action).catch(showError);
  });
}

bind('add-text', () => editor.text.add({ text: 'Hello, canvas!' }));
bind('undo', () => editor.undo());
bind('redo', () => editor.redo());
bind('fit', () => editor.fitArtboardToView());
bind('save', () => {
  const blob = new Blob([JSON.stringify(editor.exportDocument(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'design.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('image').addEventListener('change', async (event) => {
  try {
    const file = event.target.files[0];
    if (file) await editor.image.add(file);
  } catch (error) {
    showError(error);
  } finally {
    event.target.value = '';
  }
});

document.getElementById('document').addEventListener('change', async (event) => {
  try {
    const file = event.target.files[0];
    if (file) {
      await editor.loadDocument(await file.text());
      editor.fitArtboardToView();
    }
  } catch (error) {
    showError(error);
  } finally {
    event.target.value = '';
  }
});

window.addEventListener('pagehide', () => editor.destroy(), { once: true });
