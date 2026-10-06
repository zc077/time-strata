const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');

test('desktop launcher starts the archive from a Unicode path and reuses its running server', { skip: process.platform !== 'win32' }, async () => {
  const root = path.resolve(__dirname, '..');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'chrono-desktop-'));
  const directory = path.join(temporary, '时间 地层');
  fs.mkdirSync(directory);
  let port, serverPid;
  try {
    for (const name of ['Launch.ps1', 'server.js', 'tracking.js']) fs.copyFileSync(path.join(root, name), path.join(directory, name));
    fs.writeFileSync(path.join(directory, 'node-path.txt'), process.execPath);
    fs.writeFileSync(path.join(directory, 'records.json'), '[]');
    const probe = net.createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));

    const run = () => new Promise((resolve, reject) => {
      const child = spawn(path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-File', path.join(directory, 'Launch.ps1'), '-CheckOnly', '-Port', String(port)], {
        windowsHide: true, env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') }
      });
      let output = '';
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      child.once('error', reject);
      child.once('exit', code => resolve({ code, output }));
    });

    const first = await run();
    assert.equal(first.code, 0, first.output);
    const identity = await (await fetch(`http://127.0.0.1:${port}/api/health`)).text();
    assert.equal(identity, `CHRONO-SEDIMENT\n${createHash('sha256').update(directory.toLowerCase()).digest('hex')}`);
    const records = await (await fetch(`http://127.0.0.1:${port}/api/records`)).json();
    assert.deepEqual(records, []);
    serverPid = Number(fs.readFileSync(path.join(directory, 'desktop-server.pid'), 'utf8'));
    assert.ok(serverPid > 0);

    const repeated = await Promise.all([run(), run()]);
    for (const second of repeated) assert.equal(second.code, 0, second.output);
    assert.equal(Number(fs.readFileSync(path.join(directory, 'desktop-server.pid'), 'utf8')), serverPid, 'Repeated launch must not spawn another server');
  } catch (error) {
    console.error('Launcher test failed:', error.message);
    throw error;
  } finally {
    // The PID is written by the server in this disposable test directory.
    if (!serverPid && fs.existsSync(path.join(directory, 'desktop-server.pid'))) serverPid = Number(fs.readFileSync(path.join(directory, 'desktop-server.pid'), 'utf8'));
    if (serverPid) {
      try { process.kill(serverPid); }
      catch (error) { if (error.code !== 'ESRCH') console.error('Test server cleanup failed:', error.message); }
      // Windows releases the service's working directory after process teardown.
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    await fs.promises.rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
