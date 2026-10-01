const { Modem } = require('./lib/modem');
const { startAgent } = require('./lib/agent');
let agent, modem, pending = false;
const send = data => { if (process.connected) process.send(data); };
process.on('message', async data => {
  if (data?.type === 'stop') { await agent?.stop().catch(() => {}); process.exit(0); }
  if (data?.type !== 'connect' || typeof data.ticket !== 'string' || data.ticket.length > 8192) return;
  if (pending || (modem && modem.state.call !== 'idle')) return send({ type: 'result', id: data.id, error: 'Finish the current call before reconnecting.' });
  pending = true;
  try {
    await agent?.stop(); modem = new Modem();
    agent = startAgent(modem, { ticket: data.ticket, backendUrl: 'https://backend-4jwl.onrender.com', onCode: () => {} });
    const until = Date.now() + 20000;
    while (!agent.status().paired && !agent.status().error && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 100));
    if (!agent.status().paired) throw new Error(agent.status().error || 'Connection timed out. Check that the live backend has been updated.');
    send({ type: 'result', id: data.id, ok: true });
  } catch (error) { send({ type: 'result', id: data.id, error: error.message }); }
  finally { pending = false; }
});
process.on('disconnect', async () => { await agent?.stop().catch(() => {}); process.exit(0); });
