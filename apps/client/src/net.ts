// 서버 연결: 자동 재접속 + 세션 토큰으로 같은 자리 복귀 (토큰은 localStorage — 탭을 닫았다 열어도 복귀)
import type { ClientMessage, ServerMessage } from '@gst/protocol';

// 운영 빌드는 화면을 준 서버와 같은 주소로 접속 (도메인 없이 http://<서버IP>:8787 하나로 운영 가능)
// 개발(vite)에서는 따로 뜬 게임 서버(:8787)로, 화면과 서버를 다른 곳에 두면 VITE_SERVER_URL 로 지정
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ||
  (import.meta.env.DEV ? `ws://${location.hostname}:8787` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const SESSION_KEY = 'gst.session';
const NICK_KEY = 'gst.nickname';

type Listener = (m: ServerMessage) => void;
export type NetStatus = 'idle' | 'connecting' | 'open' | 'closed';

export class Net {
  private ws: WebSocket | null = null;
  private hostWorker: Worker | null = null;
  private hostEpoch = 0;
  private userId = '';
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: NetStatus) => void>();
  private retry = 0;
  private nickname: string | null = null;
  private wanted = false;
  status: NetStatus = 'idle';
  /** 서버 시각 - 로컬 시각 */
  clockOffset = 0;
  wallClockOffset = 0;

  savedNickname(): string {
    try {
      return localStorage.getItem(NICK_KEY) ?? '';
    } catch {
      return '';
    }
  }

  /** 이 탭에 이전 세션이 있으면 (새로고침) 자동 재접속 가능 */
  hasSession(): boolean {
    try {
      return !!localStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  }

  /** 로그인 사용자의 액세스 토큰 공급자 (없으면 게스트). 접속할 때마다 불러 최신 토큰을 쓴다 */
  tokenProvider: (() => Promise<string | null>) | null = null;

  connect(nickname: string, tokenProvider: (() => Promise<string | null>) | null = null): void {
    this.nickname = nickname;
    this.tokenProvider = tokenProvider;
    this.wanted = true;
    try {
      localStorage.setItem(NICK_KEY, nickname);
    } catch {
      /* 저장 불가 환경 무시 */
    }
    this.open();
  }

  private setStatus(s: NetStatus) {
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  private open() {
    this.setStatus('connecting');
    const ws = new WebSocket(SERVER_URL);
    this.ws = ws;
    ws.onopen = async () => {
      this.retry = 0;
      this.setStatus('open');
      let resume: string | undefined;
      try {
        resume = localStorage.getItem(SESSION_KEY) ?? undefined;
      } catch {
        resume = undefined;
      }
      const token = this.tokenProvider ? ((await this.tokenProvider().catch(() => null)) ?? undefined) : undefined;
      if (this.ws !== ws) return; // 토큰 기다리는 사이 연결이 바뀜
      this.send({ type: 'hello', protocol: 1, hostCapable: typeof Worker !== 'undefined', nickname: this.nickname ?? undefined, resume, token });
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data)) as ServerMessage;
      if (this.ws !== ws) return;
      if (m.type === 'welcome') {
        this.userId = m.userId;
        try {
          localStorage.setItem(SESSION_KEY, m.session);
        } catch {
          /* ignore */
        }
      }
      this.hostMessage(m);
      if (m.type === 'room' && m.room?.serverWallTime !== undefined) this.wallClockOffset = m.room.serverWallTime - Date.now();
      if (m.type === 'game' || m.type === 'pong') this.clockOffset = m.serverTime - Date.now();
      for (const l of this.listeners) l(m);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.stopHost();
      this.setStatus('closed');
      if (!this.wanted) return;
      const delay = Math.min(10_000, 500 * 2 ** this.retry++);
      setTimeout(() => this.wanted && this.open(), delay);
    };
  }

  /** 로그아웃 등: 재접속 없이 끊고 이 탭의 세션을 지운다 */
  disconnect(): void {
    this.stopHost();
    this.wanted = false;
    this.tokenProvider = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus('idle');
  }

  private stopHost(): void {
    this.hostWorker?.terminate(); this.hostWorker = null; this.hostEpoch = 0;
  }

  private hostMessage(message: ServerMessage): void {
    if (message.type === 'room' && (!message.room || message.room.hostId !== this.userId || message.room.status !== 'playing'
      || message.room.hostEpoch !== this.hostEpoch)) this.stopHost();
    if (message.type === 'host.grant') {
      this.stopHost(); this.hostEpoch = message.epoch;
      let worker: Worker;
      try { worker = new Worker(new URL('./host.worker.ts', import.meta.url), { type: 'module' }); }
      catch {
        this.send({ type: 'host.release', epoch: message.epoch }); this.stopHost();
        for (const listener of this.listeners) listener({ type: 'error', message: '이 브라우저에서 게임 계산을 시작할 수 없어 방장을 이전합니다.' });
        return;
      }
      this.hostWorker = worker;
      const fail = (reason: string) => {
        if (this.hostWorker !== worker) return;
        this.send({ type: 'host.release', epoch: message.epoch }); this.stopHost();
        for (const listener of this.listeners) listener({ type: 'error', message: `방장 연결을 이전합니다: ${reason}` });
      };
      worker.onerror = () => fail('게임 계산을 계속할 수 없습니다.');
      worker.onmessage = ({ data }: MessageEvent<ClientMessage | { type: 'host.failed'; message: string }>) => {
        if (this.hostWorker !== worker) return;
        if (data.type === 'host.failed') fail(data.message); else this.send(data);
      };
      worker.postMessage(message);
    } else if (message.type === 'host.members' || message.type === 'host.command' || message.type === 'host.ack') {
      if (message.epoch === this.hostEpoch) this.hostWorker?.postMessage(message);
    }
  }

  send(m: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  onStatus(l: (s: NetStatus) => void): () => void {
    this.statusListeners.add(l);
    return () => this.statusListeners.delete(l);
  }
}

export const net = new Net();
