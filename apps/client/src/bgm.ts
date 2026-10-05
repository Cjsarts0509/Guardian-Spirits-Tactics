// 배경음악: Web Audio 로 끊김 없이 반복하고, 곡 전환은 크로스페이드. 볼륨·음소거는 localStorage 에 저장.
// 브라우저 자동재생 정책 때문에 첫 사용자 입력(클릭·키) 뒤에만 소리가 난다 — 그 전 요청은 기억해 뒀다가 입력 시 시작.
const BASE = (import.meta.env.BASE_URL as string | undefined) ?? '/';
const KEY = 'gst.bgm';
const FADE = 2.0;

export type TrackId = 'main' | 'civil_war' | 'primordial' | 'lidellut' | 'troll';
export const TRACK_NAMES: Record<TrackId, string> = {
  main: '메인 테마',
  civil_war: '왕자들의 내전',
  primordial: '태초의 전쟁',
  lidellut: '리델루트 황야',
  troll: '트롤 부족의 반란',
};

interface Playing {
  id: TrackId;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

type Listener = () => void;

class Bgm {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<TrackId, Promise<AudioBuffer>>();
  private current: Playing | null = null;
  private wanted: TrackId | null = null;
  private listeners = new Set<Listener>();
  volume = 0.5;
  muted = false;
  /** 사용자 입력 이후인가 (이전에는 재생 불가) */
  unlocked = false;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { volume?: number; muted?: boolean };
      if (typeof saved.volume === 'number') this.volume = Math.min(1, Math.max(0, saved.volume));
      if (typeof saved.muted === 'boolean') this.muted = saved.muted;
    } catch {
      /* 저장 없음 */
    }
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlocked = true;
        this.ctx?.resume().catch(() => undefined);
        if (this.wanted) void this.play(this.wanted);
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
  }

  get playingId(): TrackId | null {
    return this.current?.id ?? null;
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private load(id: TrackId): Promise<AudioBuffer> {
    let p = this.buffers.get(id);
    if (!p) {
      p = fetch(`${BASE}bgm/${id}.mp3`)
        .then((r) => {
          if (!r.ok) throw new Error(`bgm ${id} ${r.status}`);
          return r.arrayBuffer();
        })
        .then((ab) => this.ensure().decodeAudioData(ab));
      p.catch(() => this.buffers.delete(id));
      this.buffers.set(id, p);
    }
    return p;
  }

  /** 이 곡으로 (이미 그 곡이면 아무것도 안 함). 사용자 입력 전이면 기억만 */
  async play(id: TrackId): Promise<void> {
    this.wanted = id;
    if (!this.unlocked) return;
    if (this.current?.id === id) return;
    const ctx = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    let buf: AudioBuffer;
    try {
      buf = await this.load(id);
    } catch {
      return; // 파일 없음 → 조용히
    }
    if (this.wanted !== id || this.current?.id === id) return;
    const now = ctx.currentTime;
    const old = this.current;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + FADE);
      old.src.stop(now + FADE + 0.05);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + (old ? FADE : 0.8));
    src.connect(gain);
    gain.connect(this.master!);
    src.start(now);
    this.current = { id, src, gain };
    this.emit();
  }

  stop(): void {
    this.wanted = null;
    const c = this.current;
    if (!c || !this.ctx) return;
    const now = this.ctx.currentTime;
    c.gain.gain.linearRampToValueAtTime(0, now + 1);
    c.src.stop(now + 1.05);
    this.current = null;
    this.emit();
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.volume > 0 && this.muted) this.muted = false;
    this.apply();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.apply();
  }

  private apply() {
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.volume, now + 0.15);
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      /* ignore */
    }
    this.emit();
  }
}

export const bgm = new Bgm();
