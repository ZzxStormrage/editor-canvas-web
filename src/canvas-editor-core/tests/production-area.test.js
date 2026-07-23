import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isProductionFileAreaLabel,
  PRODUCTION_FILE_AREA_LABEL
} from '../src/utils/production-area.js';

test('production file area uses the new operator-facing label', () => {
  assert.equal(PRODUCTION_FILE_AREA_LABEL, '生产文件区域');
  assert.equal(isProductionFileAreaLabel(PRODUCTION_FILE_AREA_LABEL), true);
});

test('production file area keeps legacy document compatibility', () => {
  assert.equal(isProductionFileAreaLabel('打印区域'), true);
  assert.equal(isProductionFileAreaLabel('普通矩形'), false);
});
