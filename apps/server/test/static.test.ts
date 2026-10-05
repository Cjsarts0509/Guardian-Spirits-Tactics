// 화면 정적 제공 + 같은 주소 WebSocket 허용
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { loadConfig } from '../src/config.js';
import { createGameServer, originAllowed, type GameServer } from '../src/server.js';

let server: GameServer;
let port = 0;
const dir = mkdtempSync(join(tmpdir(), 'gst-static-'));

beforeAll(async () => {
  mkdirSync(join(dir, 'assets'));
  mkdirSync(join(dir, 'icons', '128'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>gst</title>');
  writeFileSync(join(dir, 'assets', 'index-abc.js'), 'console.log(1)');
  writeFileSync(join(dir, 'icons', '128', 'char_kai.webp'), 'RIFF');
  writeFileSync(join(tmpdir(), 'gst-secret.txt'), 'secret');
  const cfg = { ...loadConfig({}), port: 0, host: '127.0.0.1', staticDir: dir, strictOrigin: true };
  server = createGameServer(cfg, () => {});
  port = await server.listen();
});
afterAll(() => server.close());

const get = (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init);

describe('화면 정적 제공', () => {
  it('/ → index.html, no-cache', async () => {
    const r = await get('/');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
    expect(r.headers.get('cache-control')).toBe('no-cache');
    expect(await r.text()).toContain('<title>gst</title>');
  });
  it('해시 붙은 빌드 파일은 오래 캐시, 아이콘은 하루', async () => {
    const a = await get('/assets/index-abc.js');
    expect(a.headers.get('content-type')).toContain('javascript');
    expect(a.headers.get('cache-control')).toContain('immutable');
    const i = await get('/icons/128/char_kai.webp');
    expect(i.headers.get('content-type')).toBe('image/webp');
    expect(i.headers.get('cache-control')).toBe('public, max-age=86400');
  });
  it('확장자 없는 경로는 화면으로, 없는 파일은 404', async () => {
    expect((await get('/room/abc')).status).toBe(200);
    expect((await get('/nope.js')).status).toBe(404);
  });
  it('폴더 밖 파일은 못 읽음', async () => {
    for (const p of ['/../gst-secret.txt', '/%2e%2e/gst-secret.txt', '/assets/..%2f..%2fgst-secret.txt']) {
      const r = await get(p);
      expect(r.status === 403 || r.status === 404, p).toBe(true);
      expect(await r.text()).not.toContain('secret');
    }
  });
  it('/health 는 그대로', async () => {
    expect(((await (await get('/health')).json()) as { ok: boolean }).ok).toBe(true);
  });
});

describe('WebSocket Origin', () => {
  const open = (origin: string) =>
    new Promise<boolean>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { origin } });
      ws.on('open', () => (ws.close(), resolve(true)));
      ws.on('error', () => resolve(false));
    });
  it('같은 주소는 허용, 다른 주소는 거절 (strict)', async () => {
    expect(await open(`http://127.0.0.1:${port}`)).toBe(true);
    expect(await open('https://evil.example')).toBe(false);
  });
  it('규칙: 목록 + 같은 주소 + 개발 모드', () => {
    const req = (origin: string, host = 'a.example:8787') => ({ headers: { origin, host } });
    expect(originAllowed({ allowedOrigins: [], strictOrigin: false }, req('https://x.example'))).toBe(true);
    expect(originAllowed({ allowedOrigins: [], strictOrigin: true }, req('https://x.example'))).toBe(false);
    expect(originAllowed({ allowedOrigins: [], strictOrigin: true }, req('http://a.example:8787'))).toBe(true);
    expect(originAllowed({ allowedOrigins: ['https://play.example'], strictOrigin: true }, req('https://play.example', 'ws.example'))).toBe(true);
    expect(originAllowed({ allowedOrigins: ['https://play.example'], strictOrigin: false }, req('https://x.example'))).toBe(false);
  });
});
