const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
let directory, child, base;
const fixture = { id: 7, type: 'book', title: '雪国', author: '川端康成', status: '已读', note: '保留这段感想', tags: ['文学'], year: 2025 };

before(async () => {
  // An isolated checkout of the server prevents tests from touching the user's library.
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chrono-tracking-'));
  fs.copyFileSync(path.join(root, 'server.js'), path.join(directory, 'server.js'));
  if (fs.existsSync(path.join(root, 'tracking.js'))) fs.copyFileSync(path.join(root, 'tracking.js'), path.join(directory, 'tracking.js'));
  fs.writeFileSync(path.join(directory, 'records.json'), JSON.stringify([fixture]));
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [path.join(directory, 'server.js')], {
    env: { ...process.env, PORT: String(port), NODE_PATH: path.join(root, 'node_modules') },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Test server did not start')), 5000);
    child.stdout.on('data', () => { clearTimeout(timeout); resolve(); });
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Test server exited: ${code}`)));
  });
});

after(async () => {
  if (child && child.exitCode === null) {
    await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
  }
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

function update(id, status, extra = {}) {
  return fetch(`${base}/api/records/${id}/status`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, ...extra })
  });
}

test('status changes persist and cannot overwrite the title, notes or tags', async () => {
  for (const status of ['planned', 'in_progress', 'completed']) {
    const response = await update(7, status, { title: '不应覆盖' });
    assert.equal(response.status, 200);
    const records = await (await fetch(`${base}/api/records`)).json();
    assert.deepEqual(records.find(record => record.id === 7), { ...fixture, status });
    const disk = JSON.parse(fs.readFileSync(path.join(directory, 'records.json'), 'utf8'));
    assert.deepEqual(disk.find(record => record.id === 7), { ...fixture, status });
  }
});

test('invalid statuses are rejected without changing saved data', async () => {
  const previous = fs.readFileSync(path.join(directory, 'records.json'), 'utf8');
  for (const status of ['unknown', '', null, { value: 'completed' }]) {
    assert.equal((await update(7, status)).status, 400);
  }
  assert.equal(fs.readFileSync(path.join(directory, 'records.json'), 'utf8'), previous);
});

test('changing the status of a missing record returns 404', async () => {
  assert.equal((await update(99999, 'completed')).status, 404);
});

test('new anime, books and games default to planned and retain selected statuses', async () => {
  for (const type of ['anime', 'book', 'game']) {
    for (const status of [undefined, 'in_progress', 'completed']) {
      const response = await fetch(`${base}/api/records`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `测试${type}`, author: '测试创作者', type, status })
      });
      assert.equal(response.status, 201);
      const record = await response.json();
      assert.equal(record.type, type);
      assert.equal(record.status, status || 'planned');
    }
  }
});
