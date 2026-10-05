// 서버 연결: 자동 재접속 + 세션 토큰으로 같은 자리 복귀
import type { ClientMessage, ServerMessage } from '@gst/protocol';

// 운영 빌드는 화면을 준 서버와 같은 주소로 접속 (도메인 없이 http://<서버IP>:8787 하나로 운영 가능)
// 개발(vite)에서는 따로 뜬 게임 서버(:8787)로, 화면과 서버를 다른 곳에 두면 VITE_SERVER_URL 로 지정
const URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ||
  (import.meta.env.DEV ? `ws://${location.hostname}:8787` : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
const SESSION_KEY = 'gst.session';
const NICK_KEY = 'gst.nickname';

type Listener = (m: ServerMessage) => void;
export type NetStatus = 'idle' | 'connecting' | 'open' | 'closed';

export class Net {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: NetStatus) => void>();
  private retry = 0;
  private nickname: string | null = null;
  private wanted = false;
  status: NetStatus = 'idle';
  /** 서버 시각 - 로컬 시각 */
  clockOffset = 0;

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
      return !!sessionStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  }

  connect(nickname: string): void {
    this.nickname = nickname;
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
    const ws = new WebSocket(URL);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      let resume: string | undefined;
      try {
        resume = sessionStorage.getItem(SESSION_KEY) ?? undefined;
      } catch {
        resume = undefined;
      }
      this.send({ type: 'hello', protocol: 1, nickname: this.nickname ?? undefined, resume });
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data)) as ServerMessage;
      if (m.type === 'welcome') {
        try {
          sessionStorage.setItem(SESSION_KEY, m.session);
        } catch {
          /* ignore */
        }
      }
      if (m.type === 'game' || m.type === 'pong') this.clockOffset = m.serverTime - Date.now();
      for (const l of this.listeners) l(m);
    };
    ws.onclose = () => {
      this.setStatus('closed');
      if (!this.wanted) return;
      const delay = Math.min(10_000, 500 * 2 ** this.retry++);
      setTimeout(() => this.wanted && this.open(), delay);
    };
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
