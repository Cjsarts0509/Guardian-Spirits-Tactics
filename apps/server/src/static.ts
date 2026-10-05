// 화면(클라이언트 빌드) 정적 파일 제공. 도메인 없이 http://<서버IP>:8787 하나로 화면 + 게임 서버를 같이 쓸 때
import { createReadStream, statSync, type Stats } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function statOrNull(p: string): Stats | null {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

export function createStatic(dir: string) {
  const root = resolve(dir);
  const index = join(root, 'index.html');

  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' });
      return res.end();
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end();
    }
    let st = statOrNull(file);
    if (st?.isDirectory()) {
      file = join(file, 'index.html');
      st = statOrNull(file);
    }
    if (!st?.isFile()) {
      // 확장자 없는 경로는 화면(SPA) 으로, 없는 파일은 404
      if (extname(pathname)) {
        res.writeHead(404);
        return res.end();
      }
      file = index;
      st = statOrNull(file);
      if (!st?.isFile()) {
        res.writeHead(404);
        return res.end();
      }
    }
    const rel = file.slice(root.length).replace(/\\/g, '/');
    const cache = rel.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable' // 파일명에 해시가 붙은 빌드 결과물
      : rel.startsWith('/icons/')
        ? 'public, max-age=86400'
        : 'no-cache';
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': st.size,
      'cache-control': cache,
      'x-content-type-options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  };
}
