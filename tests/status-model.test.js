const { test } = require('node:test');
const assert = require('node:assert/strict');

test('legacy reading, watching and playing statuses map to the same tracking groups', () => {
  const { normalizeStatus } = require('../tracking');
  const cases = [
    ['已读', 'completed'], ['已看', 'completed'], ['已玩', 'completed'], ['已沉淀', 'completed'],
    ['想读', 'planned'], ['想看', 'planned'], ['想玩', 'planned'],
    ['在读', 'in_progress'], ['在看', 'in_progress'], ['在玩', 'in_progress'], ['在追', 'in_progress'],
    ['planned', 'planned'], ['in_progress', 'in_progress'], ['completed', 'completed'],
    [undefined, 'planned'], ['', 'planned'], ['unknown', 'planned'], ['__proto__', 'planned'], ['constructor', 'planned']
  ];
  for (const [value, expected] of cases) assert.equal(normalizeStatus(value), expected, String(value));
});

test('tracking labels use watching, reading and playing language for the selected type', () => {
  const { statusLabels } = require('../tracking');
  assert.deepEqual(statusLabels('anime'), { planned: '想看', in_progress: '在追', completed: '已看完' });
  assert.deepEqual(statusLabels('book'), { planned: '想读', in_progress: '在读', completed: '已读完' });
  assert.deepEqual(statusLabels('game'), { planned: '想玩', in_progress: '在玩', completed: '已玩过' });
});
