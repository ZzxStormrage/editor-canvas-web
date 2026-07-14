import { alovaClient } from '../core/alova-client.js';

const EDITOR_DOCUMENT_ENDPOINT =
  import.meta.env.VITE_EDITOR_DOCUMENT_API_PATH || '/editor/documents';

/**
 * 编辑器文档接口模块。
 *
 * 每个方法只负责描述接口，返回 Alova Method，调用方可直接 await 或交给 useRequest。
 */
export const editorDocumentApi = Object.freeze({
  /**
   * 获取编辑器文档列表。
   *
   * @param {Object} [params={}] 查询参数。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  list(params = {}) {
    return alovaClient.Get(EDITOR_DOCUMENT_ENDPOINT, {
      name: 'editorDocument.list',
      params
    });
  },

  /**
   * 获取单个编辑器文档。
   *
   * @param {string | number} documentId 文档 ID。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  detail(documentId) {
    return alovaClient.Get(createDocumentURL(documentId), {
      name: 'editorDocument.detail'
    });
  },

  /**
   * 新建编辑器文档。
   *
   * @param {Object} payload 文档保存数据。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  create(payload) {
    return alovaClient.Post(EDITOR_DOCUMENT_ENDPOINT, assertPayload(payload), {
      name: 'editorDocument.create'
    });
  },

  /**
   * 更新编辑器文档。
   *
   * @param {string | number} documentId 文档 ID。
   * @param {Object} payload 文档保存数据。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  update(documentId, payload) {
    return alovaClient.Put(createDocumentURL(documentId), assertPayload(payload), {
      name: 'editorDocument.update'
    });
  },

  /**
   * 删除编辑器文档。
   *
   * @param {string | number} documentId 文档 ID。
   * @returns {import('alova').Method} Alova Method 实例。
   */
  remove(documentId) {
    return alovaClient.Delete(createDocumentURL(documentId), undefined, {
      name: 'editorDocument.remove'
    });
  }
});

/**
 * 创建带文档 ID 的接口地址。
 *
 * @param {string | number} documentId 文档 ID。
 * @returns {string} 文档接口地址。
 */
function createDocumentURL(documentId) {
  const normalizedId = String(documentId ?? '').trim();

  if (!normalizedId) {
    throw new TypeError('documentId is required.');
  }

  return `${EDITOR_DOCUMENT_ENDPOINT}/${encodeURIComponent(normalizedId)}`;
}

/**
 * 校验编辑器文档提交数据。
 *
 * @param {Object} payload 文档保存数据。
 * @returns {Object} 原始提交数据。
 */
function assertPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Editor document payload must be an object.');
  }

  return payload;
}
