// Local JWKS + PostgREST stand-in: real signature verification and HTTP/WS transport.
// This does not validate production credentials or Supabase password login.
import { createServer } from 'node:http';
import { once } from 'node:events';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import WebSocket from 'ws';
import { expect, it } from 'vitest';
import type { ServerMessage } from '@gst/protocol';
import { loadConfig } from '../src/config.js';
import { createGameServer } from '../src/server.js';

it('검증된 계정 → 준비/배분/전투 → 종료 복기 → 본인 전적만 조회', async () => {
  const keys = await generateKeyPair('RS256');
  const publicKey = { ...await exportJWK(keys.publicKey), kid: 'local-test', alg: 'RS256', use: 'sig' };
  const account = 'b3738fc5-564c-48d2-bbee-1cbd83c85b37';
  const other = '31cbf6dd-3788-45b5-b760-f8133d430057';
  const rows = new Map<string, Record<string, unknown>[]>();
  const queries: string[] = [];
  const backend = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    const url = new URL(req.url!, 'http://localhost');
    if (url.pathname === '/auth/v1/.well-known/jwks.json') return void res.end(JSON.stringify({ keys: [publicKey] }));
    if (req.headers.apikey !== 'sb_secret_local_test') { res.statusCode = 401; res.end('{}'); return; }
    const table = url.pathname.split('/').at(-1)!;
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const value = JSON.parse(body);
      const batch = Array.isArray(value) ? value : [value];
      rows.set(table, [...(rows.get(table) ?? []), ...batch]);
      res.statusCode = 201;
      res.end(JSON.stringify(table === 'matches' ? batch : []));
    } else if (table === 'match_players') {
      const id = url.searchParams.get('user_id'); queries.push(id!);
      const matches = rows.get('matches') ?? [];
      res.end(JSON.stringify((rows.get(table) ?? []).filter(p => `eq.${p.user_id}` === id).map(p => ({ won: p.won, matches: { mode: matches.find(m => m.id === p.match_id)?.mode } }))));
    } else { res.statusCode = 404; res.end('{}'); }
  });
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  const address = backend.address();
  if (!address || typeof address === 'string') throw new Error('missing test port');
  const base = `http://127.0.0.1:${address.port}`;
  const server = createGameServer({ ...loadConfig({}), host: '127.0.0.1', port: 0, tickMs: 20, botActivity: 0, allowGuests: false, supabaseUrl: base, supabaseSecretKey: 'sb_secret_local_test' }, () => {});
  const sockets: WebSocket[] = [];
  try {
    const port = await server.listen();
    async function connect(id: string, valid = true) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`); sockets.push(ws);
      const inbox: ServerMessage[] = [];
      ws.on('message', data => inbox.push(JSON.parse(data.toString()) as ServerMessage));
      await once(ws, 'open');
      const send = (message: unknown) => ws.send(JSON.stringify(message));
      async function wait<T extends ServerMessage['type']>(type: T, predicate: (m: Extract<ServerMessage, {type:T}>) => boolean = () => true) {
        const find = () => inbox.find(m => m.type === type && predicate(m as Extract<ServerMessage, {type:T}>));
        await expect.poll(find, { timeout: 8000 }).toBeTruthy();
        return find() as Extract<ServerMessage, {type:T}>;
      }
      const token = await new SignJWT({ user_metadata: { nickname: '계정검증' } }).setProtectedHeader({ alg: 'RS256', kid: 'local-test' }).setSubject(id).setIssuer(valid ? `${base}/auth/v1` : 'https://wrong-issuer.invalid').setExpirationTime('2m').sign(keys.privateKey);
      send({ type: 'hello', protocol: 1, token });
      return { send, wait, inbox };
    }
    const invalid = await connect(account, false);
    expect((await invalid.wait('error')).message).toContain('토큰');
    expect(invalid.inbox.some(m => m.type === 'welcome')).toBe(false);
    const host = await connect(account);
    expect((await host.wait('welcome')).guest).toBe(false);
    host.send({ type: 'room.create', name: '계정 흐름 검증', mode: 'civil_war', capacity: 8, turnSeconds: 60 });
    const detail = await host.wait('room', m => !!m.room);
    const room = server.rooms.rooms.get(detail.room!.id)!;
    for (let slot = 1; slot < 8; slot++) host.send({ type: 'room.slot', slot, kind: 'ai' });
    await host.wait('room', m => m.room?.members.length === 8);
    host.send({ type: 'room.ready', ready: true });
    host.send({ type: 'room.start' });
    await host.wait('room', m => m.room?.stage === 'assignment');
    host.send({ type: 'game.assign' });
    const initial = await host.wait('game');
    expect(initial.view.players.every(p => p.revealed === null)).toBe(true);
    host.send({ type: 'replay.get' });
    expect((await host.wait('error')).message).toContain('종료 후');
    expect(host.inbox.some(m => m.type === 'replay')).toBe(false);
    host.send({ type: 'game.begin' });
    await host.wait('room', m => m.room?.stage === 'running');
    host.send({ type: 'game.action', ref: 77, action: { type: 'chat', channel: 'whisper', to: room.state!.players.find(p => p.id !== account)!.id, text: '비공개 검증 대화' } });
    expect((await host.wait('action.result', m => m.ref === 77)).ok).toBe(true);
    // Deterministic ending through normal room leave handling; no forced winner/phase.
    const side = room.state!.players.find(p => p.id === account)!.side;
    for (const p of [...room.state!.players].filter(p => p.side !== side)) room.leave(p.id, Date.now(), 'quit');
    const ended = await host.wait('game', m => m.view.phase === 'ended');
    expect(ended.view.winner).toBe(side);
    expect(ended.view.players.every(p => p.revealed !== null)).toBe(true);
    host.send({ type: 'replay.get' });
    const replay = (await host.wait('replay')).replay;
    expect(replay.frames.at(-1)?.view.phase).toBe('ended');
    expect(replay.frames.every(f => f.view.players.every(p => !!p.character))).toBe(true);
    expect(replay.events.filter(e => e.kind === 'role')).toHaveLength(8);
    await expect.poll(() => rows.get('match_chat')?.length).toBeGreaterThan(0);
    expect(rows.get('match_events')?.some(e => (e.payload as {kind:string}).kind.startsWith('chat.'))).toBe(false);
    expect(rows.get('match_players')?.filter(p => p.user_id)).toEqual([expect.objectContaining({ user_id: account, won: true })]);
    host.send({ type: 'profile.get', userId: other });
    expect((await host.wait('profile')).profile.modes).toEqual([{ mode: 'civil_war', played: 1, won: 1, lost: 0 }]);
    const outsider = await connect(other); await outsider.wait('welcome');
    outsider.send({ type: 'profile.get', userId: account });
    expect((await outsider.wait('profile')).profile.modes).toEqual([]);
    outsider.send({ type: 'replay.get' });
    await outsider.wait('error');
    expect(outsider.inbox.some(m => m.type === 'replay')).toBe(false);
    expect(queries).toEqual([`eq.${account}`, `eq.${other}`]);
    expect(rows.get('matches')).toHaveLength(1);
  } finally {
    for (const socket of sockets) socket.terminate();
    await server.close();
    await new Promise<void>((resolve, reject) => backend.close(error => error ? reject(error) : resolve()));
  }
}, 25000);
