/* 前端与后端的连接层。记录和设置由 /api/state 保存；localStorage 是备份和待同步队列。 */
(() => {
  'use strict';
  const keys = ['gentle-static', 'gentle-extra'];
  const metaKey = 'gentle-api-sync';
  let meta, active = false, busy = false, timer, changed = 0, blocked = false;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  // Project 2 only keeps Home data, including when importing an older browser cache.
  function homeState(value) {
    const store = Object.fromEntries(Object.entries(value.store || {}).map(([day, daily]) => [day,
      Object.fromEntries(['todos', 'carry', 'checks'].map(type => [type, daily[type] || []]))]));
    const source = value.extra || {};
    const extra = Object.fromEntries(['schedule', 'todoCats', 'checkTemplates', 'carryDefaults'].filter(key => key in source).map(key => [key, source[key]]));
    extra.archivedColors = { todo: source.archivedColors?.todo || {} };
    return { store, extra };
  }
  const state = () => homeState({ store: read(keys[0]), extra: read(keys[1]) });
  const english = () => localStorage.getItem('gentle-language') === 'en';
  const messages = {
    offline: ['尚未同步 · 本机备份已保留，点击重试', 'Not synced · local backup kept. Click to retry'],
    conflict: ['数据版本冲突 · 请先导出备份，再重新载入后端记录', 'Data conflict · export a backup, then load backend records'],
    failed: ['无法连接后端 · 请启动 Node.js 后重试', 'Cannot connect · start Node.js, then retry']
  };
  // Only exceptions appear in a floating notice; normal saves use no layout space.
  const notice = document.createElement('div');
  notice.id = 'syncNotice'; notice.dataset.noTranslate = ''; notice.setAttribute('role', 'alert'); notice.hidden = true;
  const status = document.createElement('button'); status.type = 'button';
  status.className = 'syncMessage';
  const backup = document.getElementById('exportBackup');
  backup.onclick = () => {
    const exported = { ...state(), legacyBackup: read('gentle-before-api-import') };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'easy-everyday-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const recover = document.createElement('button'); recover.type = 'button'; recover.hidden = true;
  recover.onclick = () => {
    if (!confirm(english() ? 'Replace this browser cache with backend records? Export your unsynced changes first.' : '用后端记录替换本机缓存？请先导出尚未同步的修改。')) return;
    localStorage.removeItem(metaKey); keys.forEach(key => localStorage.removeItem(key)); location.reload();
  };
  notice.append(status, recover); document.body.append(notice);
  let mode = 'loading';
  function show(value) {
    mode = value;
    notice.hidden = !messages[value];
    status.textContent = messages[value]?.[english() ? 1 : 0] || '';
    recover.hidden = value !== 'conflict';
    recover.textContent = english() ? 'Load backend records' : '重新载入后端记录';
    const label = english() ? 'Export backup' : '导出备份';
    backup.title = label; backup.setAttribute('aria-label', label);
    document.querySelector('main').inert = ['loading', 'failed', 'conflict'].includes(value);
  }
  let lastLanguage = document.documentElement.lang;
  new MutationObserver(() => {
    if (document.documentElement.lang === lastLanguage) return;
    lastLanguage = document.documentElement.lang;
    show(mode);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  show(mode);
  function persistMeta() { localStorage.setItem(metaKey, JSON.stringify(meta)); }
  async function request(method, body) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/state', { method, credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      if (!response.ok) { const error = new Error('API ' + response.status); error.conflict = response.status === 409; throw error; }
      const value = await response.json();
      if (method === 'GET' && (!value.namespace || !value.store || !value.extra || !Number.isSafeInteger(value.revision))) throw new Error('Invalid API response');
      return value;
    } finally { clearTimeout(timeout); }
  }
  async function flush() {
    if (!active || busy || blocked || !meta.pending) return;
    busy = true; const version = changed; show('saving');
    try {
      const result = await request('PUT', { ...state(), revision: meta.revision });
      meta.revision = result.revision; meta.pending = changed !== version; persistMeta(); show(meta.pending ? 'saving' : 'saved');
    } catch (error) { blocked = !!error.conflict; show(blocked ? 'conflict' : 'offline'); }
    finally { busy = false; if (meta.pending && !blocked && changed !== version) timer = setTimeout(flush, 400); }
  }
  window.GentleAPI = {
    async init() {
      show('loading');
      try {
        const response = await request('GET');
        const remote = { ...response, ...homeState(response) }; meta = read(metaKey);
        if (meta.pending && (meta.namespace !== remote.namespace || meta.revision !== remote.revision)) {
          blocked = true; show('conflict'); return false;
        }
        // 首次访问空数据库时迁移当前网址中的旧记录；已有后端数据时以后端为准。
        if (!meta.pending && remote.exists) {
          if (!meta.namespace && (localStorage.getItem(keys[0]) || localStorage.getItem(keys[1]))) {
            localStorage.setItem('gentle-before-api-import', JSON.stringify(state()));
          }
          localStorage.setItem(keys[0], JSON.stringify(remote.store)); localStorage.setItem(keys[1], JSON.stringify(remote.extra));
        } else if (!remote.exists && meta.namespace && meta.namespace !== remote.namespace) {
          blocked = true; show('conflict'); return false;
        }
        const pending = !!meta.pending || !remote.exists;
        // Remove fields belonging to the old Records screen before app.js starts.
        const current = state();
        localStorage.setItem(keys[0], JSON.stringify(current.store));
        localStorage.setItem(keys[1], JSON.stringify(current.extra));
        meta = { namespace: remote.namespace, revision: remote.revision, pending }; persistMeta(); active = true;
        if (pending) await flush(); else show('saved');
        return true;
      } catch { show('failed'); return false; }
    },
    save() {
      if (!active) return;
      changed++; meta.pending = true; persistMeta();
      if (!blocked) { show('saving'); clearTimeout(timer); timer = setTimeout(flush, 400); }
    }
  };
  status.onclick = () => { if (!active) location.reload(); else flush(); };
  window.addEventListener('online', flush);
  window.addEventListener('beforeunload', event => { if (meta?.pending) { event.preventDefault(); event.returnValue = ''; } });
  // 另一个标签页写入时，禁止当前旧页面再覆盖它。后端 revision 是第二层保护。
  window.addEventListener('storage', event => { if (event.key === metaKey && active) { blocked = true; show('conflict'); } });
})();

