/**
 * Easy Everyday — 单文件后端 / DESN31927 Project 2
 *
 * 在 GitHub Codespaces 终端运行（Node.js 22.13+）：
 *   npm install --no-save express@5
 *   node backend.cjs
 * 然后打开 Ports 中 3000 的网页。GET /api/health 可检查运行状态。
 * .cjs 表示使用 CommonJS，不受项目 package.json 的 type 设置影响。
 *
 * 接口：
 * GET    /api/records?day=2026-11-12&type=todos  读取列表
 * POST   /api/records                         新建（201）
 * GET    /api/records/:id                     读取一条
 * PATCH  /api/records/:id                     修改
 * DELETE /api/records/:id                     删除（204）
 * POST 示例：{ "day":"2026-11-12", "type":"todos",
 *              "data":{ "text":"Finish homework", "done":false, "cat":"作业" } }
 * PATCH 示例：{ "data":{ "done":true } }（合并到原 data）
 * type 对应现有前端的 todos/carry/checks/foods/assets/expenses。
 *
 * 存储：SQLite 文件自动创建在 .easy-everyday-data/records.sqlite。
 * 不要将此目录、node_modules 或真实用户数据上传 GitHub。
 * 部署时设置 DATA_DIR 到持久化磁盘；临时磁盘不能保证数据长期保留。
 *
 * 无登录：随机浏览器 Cookie 区分数据，并不识别物理设备。
 * 同一浏览器可持续使用；清除 Cookie 后不能找回，其他浏览器不会同步。
 * Cookie 是访问凭据，不要分享。此版本没有账号恢复功能。
 *
 * 前端通过 GET/PUT /api/state 读取和保存完整日常记录及自定义设置。
 * /api/state 和 /api/records 共用 records 表。revision 防止多标签页相互覆盖。
 * 不实现现有 Cloudflare 照片接口。旧浏览器记录由前端首次连接时迁移。
 */
'use strict';

// 1. 引入工具：Express 处理 HTTP；SQLite 保存记录。
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.DATA_DIR || path.join(__dirname, '.easy-everyday-data');
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'records.sqlite'));
db.exec(`PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, day TEXT NOT NULL,
    type TEXT NOT NULL, data TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS records_owner_day ON records(owner, day, type);`);
db.exec(`CREATE TABLE IF NOT EXISTS preferences (
  owner TEXT PRIMARY KEY, extra TEXT NOT NULL, revision INTEGER NOT NULL
);`);
const types = new Set(['todos', 'carry', 'checks', 'foods', 'assets', 'expenses']);
const cookieName = 'easy_everyday_device';
app.disable('x-powered-by');

// 2. 每个浏览器一个随机凭据；所有查询都检查 owner，隔离浏览器数据。
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const cookies = (req.headers.cookie || '').split(';').map(s => s.trim());
  let token = cookies.find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const validToken = /^[a-f0-9]{64}$/.test(token || '');
  if (!validToken) {
    token = randomBytes(32).toString('hex');
    res.cookie(cookieName, token, {
      httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000, path: '/'
    });
  }
  req.owner = token;
  // 拒绝其他站点从浏览器发来的写请求；前端应和 API 使用同一网址。
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site request denied' });
    if (!req.is('application/json')) return res.status(415).json({ error: 'Use Content-Type: application/json' });
  }
  next();
});
app.use('/api', express.json({ limit: '2mb' }));

// 3. 输入检查：日期、类型和记录内容，错误会返回 400。
function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
function validData(data) {
  return data !== null && typeof data === 'object' && !Array.isArray(data)
    && Object.keys(data).length > 0 && JSON.stringify(data).length <= 20000
    && !Object.keys(data).some(k => ['__proto__', 'constructor', 'prototype', 'id'].includes(k))
    && (!('done' in data) || typeof data.done === 'boolean')
    && (!('text' in data) || (typeof data.text === 'string' && data.text.trim().length > 0));
}
function output(row) {
  return { id: row.id, day: row.day, type: row.type, data: JSON.parse(row.data),
    createdAt: row.created_at, updatedAt: row.updated_at };
}
const find = db.prepare('SELECT * FROM records WHERE id = ? AND owner = ?');

// 4. CRUD：Create / Read / Update / Delete。
app.get('/api/health', (req, res) => res.json({ ok: true, storage: 'sqlite' }));
// 前端一次读取全部日期，保证日历、历史账单和资产走势使用同一份数据。
const pref = db.prepare('SELECT * FROM preferences WHERE owner = ?');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function safeTree(value, depth = 0) {
  if (depth > 30) return false;
  if (value === null || typeof value !== 'object') return true;
  return Object.entries(value).every(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && safeTree(v, depth + 1));
}
function readState(owner) {
  const store = {};
  for (const row of db.prepare('SELECT * FROM records WHERE owner = ? ORDER BY rowid').all(owner)) {
    store[row.day] ||= Object.fromEntries([...types].map(type => [type, []]));
    const data = JSON.parse(row.data);
    store[row.day][row.type].push({ ...data, id: data.id || row.id });
  }
  const settings = pref.get(owner);
  return { store, extra: settings ? JSON.parse(settings.extra) : {}, revision: settings?.revision || 0,
    exists: !!settings || Object.keys(store).length > 0,
    namespace: createHash('sha256').update(owner).digest('hex').slice(0, 24) };
}
app.get('/api/state', (req, res) => res.json(readState(req.owner)));
app.put('/api/state', (req, res) => {
  const body = req.body || {};
  if (!object(body.store) || !object(body.extra) || !Number.isSafeInteger(body.revision) || body.revision < 0 || !safeTree(body))
    return res.status(400).json({ error: 'Invalid state' });
  const rows = [];
  for (const [day, daily] of Object.entries(body.store)) {
    if (!validDay(day) || !object(daily) || Object.keys(daily).some(type => !types.has(type)))
      return res.status(400).json({ error: 'Invalid daily records' });
    for (const [type, items] of Object.entries(daily)) {
      if (!Array.isArray(items) || items.some(item => !object(item) || typeof item.id !== 'string' || !item.id || item.id.length > 200))
        return res.status(400).json({ error: 'Each record requires an id' });
      if (new Set(items.map(item => item.id)).size !== items.length) return res.status(400).json({ error: 'Duplicate record id' });
      for (const item of items) rows.push([createHash('sha256').update(JSON.stringify([req.owner, day, type, item.id])).digest('hex'), req.owner, day, type, JSON.stringify(item)]);
    }
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    const revision = pref.get(req.owner)?.revision || 0;
    if (revision !== body.revision) { db.exec('ROLLBACK'); return res.status(409).json({ error: 'State changed in another tab. Reload before saving.' }); }
    db.prepare('DELETE FROM records WHERE owner = ?').run(req.owner);
    const insert = db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    for (const row of rows) insert.run(...row, now, now);
    db.prepare('INSERT INTO preferences VALUES (?, ?, ?) ON CONFLICT(owner) DO UPDATE SET extra=excluded.extra, revision=excluded.revision')
      .run(req.owner, JSON.stringify(body.extra), revision + 1);
    db.exec('COMMIT');
    res.json({ revision: revision + 1 });
  } catch (error) { db.exec('ROLLBACK'); throw error; }
});
// 单条 CRUD 更新也推进版本号，阻止旧的前端快照覆盖 API 修改。
function advanceRevision(owner) {
  db.prepare("INSERT INTO preferences VALUES (?, '{}', 1) ON CONFLICT(owner) DO UPDATE SET revision=revision+1").run(owner);
}
app.get('/api/records', (req, res) => {
  const { day, type } = req.query;
  if (!validDay(day) || !types.has(type)) return res.status(400).json({ error: 'Valid day and type are required' });
  const rows = db.prepare('SELECT * FROM records WHERE owner = ? AND day = ? AND type = ? ORDER BY created_at, id')
    .all(req.owner, day, type);
  res.json({ records: rows.map(output) });
});
app.post('/api/records', (req, res) => {
  const { day, type, data } = req.body || {};
  if (!validDay(day) || !types.has(type) || !validData(data)) return res.status(400).json({ error: 'Invalid day, type or data' });
  const id = randomUUID(), now = new Date().toISOString();
  db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.owner, day, type, JSON.stringify(data), now, now);
  advanceRevision(req.owner);
  res.status(201).location('/api/records/' + id).json(output(find.get(id, req.owner)));
});
app.get('/api/records/:id', (req, res) => {
  const row = find.get(req.params.id, req.owner);
  if (!row) return res.status(404).json({ error: 'Record not found' });
  res.json(output(row));
});
app.patch('/api/records/:id', (req, res) => {
  const row = find.get(req.params.id, req.owner);
  if (!row) return res.status(404).json({ error: 'Record not found' });
  const body = req.body || {};
  if (Object.keys(body).some(k => !['day', 'type', 'data'].includes(k)) || !Object.keys(body).length
    || ('day' in body && !validDay(body.day)) || ('type' in body && !types.has(body.type))
    || ('data' in body && !validData(body.data))) return res.status(400).json({ error: 'Invalid update' });
  const data = { ...JSON.parse(row.data), ...(body.data || {}) };
  if (!validData(data)) return res.status(400).json({ error: 'Invalid merged data' });
  db.prepare('UPDATE records SET day = ?, type = ?, data = ?, updated_at = ? WHERE id = ? AND owner = ?')
    .run(body.day ?? row.day, body.type ?? row.type, JSON.stringify(data), new Date().toISOString(), row.id, req.owner);
  advanceRevision(req.owner);
  res.json(output(find.get(row.id, req.owner)));
});
app.delete('/api/records/:id', (req, res) => {
  const result = db.prepare('DELETE FROM records WHERE id = ? AND owner = ?').run(req.params.id, req.owner);
  if (!result.changes) return res.status(404).json({ error: 'Record not found' });
  advanceRevision(req.owner);
  res.status(204).end();
});
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));

// 5. 同时提供现有 public 网站，方便 Codespaces 在同一网址测试。
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
const server = app.listen(port, '0.0.0.0', () => console.log(`Easy Everyday: http://localhost:${server.address().port}`));
function stop() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

