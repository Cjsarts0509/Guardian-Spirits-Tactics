// Disposable UI fixture. Never included in the production entry point or release build.
import { createServer } from 'node:http';
import { loadConfig } from '../src/config.js';
import { createGameServer } from '../src/server.js';

async function main() {
  if (process.env.UI_SMOKE_FIXTURE !== '1') throw new Error('UI_SMOKE_FIXTURE=1 required');
  const game = createGameServer({ ...loadConfig({}), port: 8799, host: '127.0.0.1', staticDir: process.env.STATIC_DIR!, botActivity: 0 });
  await game.listen();
  // Separate loopback-only test control port; game HTTP/WS routes stay unchanged.
  const control = createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/finish') { res.writeHead(404).end(); return; }
    const room = [...game.rooms.rooms.values()].find(r => r.status === 'playing' && r.stage === 'running');
    const host = room?.state?.players.find(p => p.id === room.hostId);
    if (!room?.state || !host) { res.writeHead(409).end('no running fixture'); return; }
    // End by the normal forfeiture rule, retaining the connected human for results/replay.
    for (const player of [...room.state.players].filter(p => p.side !== host.side)) room.leave(player.id, Date.now(), 'quit');
    res.writeHead(room.state.phase === 'ended' ? 200 : 409, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ phase: room.state.phase, mode: room.mode }));
  });
  control.listen(8800, '127.0.0.1');
  const close = async () => { control.close(); await game.close(); process.exit(0); };
  process.on('SIGTERM', close); process.on('SIGINT', close);
}
void main();
