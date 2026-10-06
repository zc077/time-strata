(function (root, factory) {
  const tracking = factory();
  if (typeof module === 'object' && module.exports) module.exports = tracking;
  else root.Tracking = tracking;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const statuses = ['planned', 'in_progress', 'completed'];
  const legacy = {
    '想读': 'planned', '想看': 'planned', '想玩': 'planned',
    '准备看': 'planned', '准备读': 'planned', '准备玩': 'planned',
    '在读': 'in_progress', '在看': 'in_progress', '在追': 'in_progress', '在玩': 'in_progress',
    '已读': 'completed', '已看': 'completed', '已玩': 'completed', '已沉淀': 'completed',
    '已读完': 'completed', '已看完': 'completed', '已玩过': 'completed'
  };

  function normalizeStatus(value) {
    if (statuses.includes(value)) return value;
    return typeof value === 'string' && Object.hasOwn(legacy, value) ? legacy[value] : 'planned';
  }

  function statusLabels(type) {
    if (type === 'anime') return { planned: '想看', in_progress: '在追', completed: '已看完' };
    if (type === 'movie') return { planned: '想看', in_progress: '在看', completed: '已看完' };
    if (type === 'book') return { planned: '想读', in_progress: '在读', completed: '已读完' };
    if (type === 'game') return { planned: '想玩', in_progress: '在玩', completed: '已玩过' };
    return { planned: '准备体验', in_progress: '进行中', completed: '已完成' };
  }

  function isKnownStatus(value) {
    return typeof value === 'string' && (statuses.includes(value) || Object.hasOwn(legacy, value));
  }

  return { statuses, normalizeStatus, statusLabels, isKnownStatus };
});
