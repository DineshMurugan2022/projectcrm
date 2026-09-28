const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createServer } = require('../server');

test('HTTP UI serves files and requires a same-origin token for call actions', async () => {
  const fake = new EventEmitter();
  fake.snapshot = () => ({ connected: true, call: 'idle' });
  const calls = [];
  fake.dial = async number => calls.push(number);
  const { server } = createServer(fake);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Call desk/);
    const { token } = await (await fetch(`${base}/api/state`)).json();
    const send = headers => fetch(`${base}/api/dial`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ number: '123456789' }) });
    assert.equal((await send({})).status, 403);
    assert.equal((await send({ 'X-App-Token': token, Origin: 'https://untrusted.example' })).status, 403);
    assert.equal(calls.length, 0);
    assert.equal((await send({ 'X-App-Token': token, Origin: base })).status, 200);
    assert.deepEqual(calls, ['123456789']);
    assert.equal((await fetch(`${base}/api/toString`, { method: 'POST', headers: { 'X-App-Token': token }, body: '{}' })).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
