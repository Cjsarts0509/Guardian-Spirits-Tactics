// 이벤트 → 화면 효과. 해당 플레이어 카드 위에 스킬 아이콘(mark)이 떠서 잠시 남고, 맞은 카드가 빛난다(pulse). 전체 공지는 배너.
// 공개 정보만 쓴다: 이벤트에 플레이어 id 가 있을 때만 카드를 가리키고, 캐릭터 이름만 있으면 배너로 보여준다.
import type { GameEvent, PlayerView } from '@gst/rules';
import { gemIcon, portrait, skillIcon } from './icons.js';

export type FxColor = 'gold' | 'teal' | 'red' | 'violet' | 'green' | 'grey' | 'blue';

export type Fx =
  | { id: number; type: 'mark'; to: string; icon: string | null; color: FxColor; label?: string }
  | { id: number; type: 'pulse'; to: string; color: FxColor; label?: string; big?: boolean }
  | { id: number; type: 'banner'; text: string; color: FxColor; left?: string | null; right?: string | null; big?: boolean };

/** 효과별 화면에 남는 시간 (ms) */
export const FX_TTL: Record<Fx['type'], number> = { mark: 5000, pulse: 4500, banner: 8000 };

let seq = 0;
const id = () => ++seq;

export interface FxContext {
  myId: string;
  /** 캐릭터 → 플레이어 (공개되었거나 내가 아는 것만) */
  playerOf: (character: string) => string | null;
  view: PlayerView;
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function fxFor(e: GameEvent, ctx: FxContext): Fx[] {
  const d = e.data ?? {};
  const target = str(d.target);
  const nameOf = (c: string | null) => (c ? ctx.view.roster.find((r) => r.key === c)?.name ?? c : '');
  const mark = (to: string, icon: string | null, color: FxColor, label?: string): Fx => ({ id: id(), type: 'mark', to, icon, color, ...(label ? { label } : {}) });

  switch (e.kind) {
    case 'publish':
    case 'publish.auto': {
      const p = str(d.player);
      return p ? [{ id: id(), type: 'pulse', to: p, color: 'gold', label: `공표 · ${nameOf(str(d.name))}` }] : [];
    }
    case 'inspect':
      return target ? [mark(target, skillIcon('scan'), 'teal', '확인')] : [];
    case 'inspect.result':
      return target ? [{ id: id(), type: 'pulse', to: target, color: d.success ? 'teal' : 'grey', label: d.success ? '확인 성공' : '실패' }] : [];
    case 'probe.result':
    case 'skill.warrior_scent':
    case 'skill.curse':
    case 'skill.oracle':
      return target ? [{ id: id(), type: 'pulse', to: target, color: 'teal' }] : [];
    case 'gem.use':
      return target ? [mark(target, gemIcon(3), 'gold', '진실의 보석')] : [];
    case 'status.incapacitated':
      return target ? [mark(target, skillIcon('confusion'), 'violet', '행동 불능')] : [];
    case 'status.shadow_jail':
      return target ? [mark(target, skillIcon('shadow_jail'), 'violet', '쉐도우 자일')] : [];
    case 'skill.dantes_command':
      return target ? [mark(target, skillIcon('dantes_command'), 'red', '마황자의 명령')] : [];
    case 'skill.dantes_command.success':
      return target ? [{ id: id(), type: 'pulse', to: target, color: 'red', label: '처형', big: true }] : [];
    case 'skill.soul_reaver':
    case 'skill.soul_reaver.blocked':
      return target ? [mark(target, skillIcon('soul_reaver'), e.kind.endsWith('blocked') ? 'grey' : 'red', e.kind.endsWith('blocked') ? '영혼의 벽' : '소울 리버')] : [];
    case 'skill.backstab':
      return target ? [mark(target, skillIcon('backstab'), 'red', '백스탭')] : [];
    case 'ally.set':
    case 'ally.incoming': {
      const to = str(d.to);
      return to ? [mark(to, skillIcon('ally'), 'green', '동맹')] : [];
    }
    case 'ally.unset':
    case 'ally.incoming.unset': {
      const to = str(d.to);
      return to ? [mark(to, skillIcon('break_ally'), 'grey', '파기')] : [];
    }
    case 'death': {
      const p = str(d.player);
      const c = str(d.character);
      const out: Fx[] = [{ id: id(), type: 'banner', text: e.text.replace(/^-/, ''), color: 'red', left: c ? portrait(c) : null, big: true }];
      if (p) out.push({ id: id(), type: 'pulse', to: p, color: 'red', label: `${nameOf(c)} 사망`, big: true });
      return out;
    }
    case 'reveal': {
      const p = str(d.player);
      return p ? [{ id: id(), type: 'pulse', to: p, color: 'gold', label: `정체: ${nameOf(str(d.character))}`, big: true }] : [];
    }
    case 'attack.hit':
    case 'attack.kill':
    case 'attack.guarded':
    case 'attack.fail':
    case 'attack.fail.death': {
      const a = str(d.attacker);
      const t = str(d.target);
      const grey = e.kind === 'attack.fail' || e.kind === 'attack.guarded';
      const lethal = e.kind === 'attack.kill' || e.kind === 'attack.fail.death';
      const out: Fx[] = [{ id: id(), type: 'banner', text: e.text.replace(/^-/, ''), color: grey ? 'grey' : 'red', left: a ? portrait(a) : null, right: t ? portrait(t) : null, big: lethal }];
      const tp = t ? ctx.playerOf(t) : null;
      if (tp && e.kind !== 'attack.kill') out.push({ id: id(), type: 'pulse', to: tp, color: grey ? 'grey' : 'red', label: e.kind === 'attack.guarded' ? '방어' : '피격' });
      const ap = a ? ctx.playerOf(a) : null;
      if (ap && e.kind === 'attack.fail.death') out.push({ id: id(), type: 'pulse', to: ap, color: 'red', label: '공격 실패' });
      return out;
    }
    case 'attack.fail.target':
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'gold', label: '공격 받음 · 실패', big: true }];
    case 'turn': {
      const gain = typeof d.gain === 'number' ? d.gain : null;
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'blue', label: gain !== null ? `턴 · 마나 +${gain}` : '턴' }];
    }
    case 'skill.grant':
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'gold', label: '스킬 획득', big: true }];
    case 'skill.burning_magic.target':
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'violet', label: '마나 감소', big: true }];
    case 'status.incapacitated.self':
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'violet', label: '행동 불능', big: true }];
    case 'game.end':
      return [{ id: id(), type: 'banner', text: e.text, color: 'gold', big: true }];
    default:
      // 모드 고유 스킬: 대상 플레이어가 공개된 이벤트면 그 카드에 표시 (살해·실패는 색으로 구분)
      if (e.kind.startsWith('skill.') && target) {
        const kill = /살해|사망|정화합니다/.test(e.text);
        const fail = /실패|아닙니다/.test(e.text);
        const skill = e.kind.split('.')[1] ?? '';
        return [mark(target, skillIcon(skill), kill ? 'red' : fail ? 'grey' : 'teal', kill ? '처형' : fail ? '실패' : undefined)];
      }
      return [];
  }
}
