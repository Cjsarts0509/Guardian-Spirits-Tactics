// 이벤트 → 화면 효과. 플레이어 카드 사이로 스킬 아이콘이 날아가고, 맞은 카드가 흔들린다.
// 공개 정보만 쓴다: 이벤트에 플레이어 id 가 있을 때만 카드를 가리키고, 캐릭터 이름만 있으면 배너로 보여준다.
import type { GameEvent, PlayerView } from '@gst/rules';
import { gemIcon, portrait, skillIcon } from './icons.js';

export type FxColor = 'gold' | 'teal' | 'red' | 'violet' | 'green' | 'grey' | 'blue';

export type Fx =
  | { id: number; type: 'fly'; from: string | null; to: string; icon: string | null; color: FxColor; label?: string }
  | { id: number; type: 'pulse'; to: string; color: FxColor; label?: string; big?: boolean }
  | { id: number; type: 'banner'; text: string; color: FxColor; left?: string | null; right?: string | null };

let seq = 0;
const id = () => ++seq;

export interface FxContext {
  myId: string;
  /** 내가 방금 보낸 행동 (내 카드에서 날아가게) */
  lastAction: { skill: string; target?: string; at: number } | null;
  /** 캐릭터 → 플레이어 (공개되었거나 내가 아는 것만) */
  playerOf: (character: string) => string | null;
  view: PlayerView;
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function fxFor(e: GameEvent, ctx: FxContext): Fx[] {
  const d = e.data ?? {};
  const target = str(d.target);
  const mine = (skill: string, t: string | null) =>
    ctx.lastAction && ctx.lastAction.skill === skill && (t === null || ctx.lastAction.target === t) && Date.now() - ctx.lastAction.at < 4000;
  const nameOf = (c: string | null) => (c ? ctx.view.roster.find((r) => r.key === c)?.name ?? c : '');

  switch (e.kind) {
    case 'publish':
    case 'publish.auto': {
      const p = str(d.player);
      return p ? [{ id: id(), type: 'pulse', to: p, color: 'gold', label: `공표 · ${nameOf(str(d.name))}` }] : [];
    }
    case 'inspect':
      return target
        ? [{ id: id(), type: 'fly', from: mine('ally_check', target) || mine('enemy_check', target) || mine('scan', target) || mine('advanced_scan', target) || mine('advanced_ally_check', target) || mine('advanced_enemy_check', target) ? ctx.myId : null, to: target, icon: skillIcon('scan'), color: 'teal' }]
        : [];
    case 'inspect.result':
      return target ? [{ id: id(), type: 'pulse', to: target, color: d.success ? 'teal' : 'grey', label: d.success ? '확인 성공' : '실패' }] : [];
    case 'probe.result':
    case 'skill.warrior_scent':
    case 'skill.curse':
    case 'skill.oracle':
      return target ? [{ id: id(), type: 'pulse', to: target, color: 'teal' }] : [];
    case 'gem.use':
      return target ? [{ id: id(), type: 'fly', from: mine('truth_gem', target) ? ctx.myId : null, to: target, icon: gemIcon(3), color: 'gold' }] : [];
    case 'status.incapacitated':
      return target ? [{ id: id(), type: 'fly', from: mine('confusion', target) || mine('nightmare', target) ? ctx.myId : null, to: target, icon: skillIcon(ctx.lastAction?.skill === 'nightmare' ? 'nightmare' : 'confusion'), color: 'violet', label: '행동 불능' }] : [];
    case 'status.shadow_jail':
      return target ? [{ id: id(), type: 'fly', from: mine('shadow_jail', target) ? ctx.myId : ctx.playerOf('mertz'), to: target, icon: skillIcon('shadow_jail'), color: 'violet', label: '쉐도우 자일' }] : [];
    case 'skill.dantes_command':
      return target ? [{ id: id(), type: 'fly', from: mine('dantes_command', target) ? ctx.myId : ctx.playerOf('dantes'), to: target, icon: skillIcon('dantes_command'), color: 'red', label: '마황자의 명령' }] : [];
    case 'skill.dantes_command.success':
      return target ? [{ id: id(), type: 'pulse', to: target, color: 'red', label: '처형', big: true }] : [];
    case 'skill.soul_reaver':
    case 'skill.soul_reaver.blocked':
      return target
        ? [{ id: id(), type: 'fly', from: mine('soul_reaver', target) ? ctx.myId : ctx.playerOf('kai'), to: target, icon: skillIcon('soul_reaver'), color: e.kind.endsWith('blocked') ? 'grey' : 'red', label: e.kind.endsWith('blocked') ? '영혼의 벽' : '소울 리버' }]
        : [];
    case 'skill.backstab':
      return target ? [{ id: id(), type: 'fly', from: mine('backstab', target) ? ctx.myId : ctx.playerOf('soen'), to: target, icon: skillIcon('backstab'), color: 'red', label: '백스탭' }] : [];
    case 'ally.set':
    case 'ally.incoming': {
      const from = str(d.from);
      const to = str(d.to);
      return from && to ? [{ id: id(), type: 'fly', from, to, icon: skillIcon('ally'), color: 'green', label: '동맹' }] : [];
    }
    case 'ally.unset':
    case 'ally.incoming.unset': {
      const from = str(d.from);
      const to = str(d.to);
      return from && to ? [{ id: id(), type: 'fly', from, to, icon: skillIcon('break_ally'), color: 'grey', label: '파기' }] : [];
    }
    case 'death': {
      const p = str(d.player);
      return p ? [{ id: id(), type: 'pulse', to: p, color: 'red', label: `${nameOf(str(d.character))} 사망`, big: true }] : [];
    }
    case 'reveal': {
      const p = str(d.player);
      return p ? [{ id: id(), type: 'pulse', to: p, color: 'gold', label: `정체: ${nameOf(str(d.character))}`, big: true }] : [];
    }
    case 'attack.hit':
    case 'attack.kill':
    case 'attack.fail':
    case 'attack.fail.death': {
      const a = str(d.attacker);
      const t = str(d.target);
      const out: Fx[] = [{ id: id(), type: 'banner', text: e.text.replace(/^-/, ''), color: e.kind === 'attack.fail' ? 'grey' : 'red', left: a ? portrait(a) : null, right: t ? portrait(t) : null }];
      const tp = t ? ctx.playerOf(t) : null;
      if (tp && e.kind !== 'attack.kill') out.push({ id: id(), type: 'pulse', to: tp, color: 'red', label: '피격' });
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
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'violet', label: '마나 -70', big: true }];
    case 'status.incapacitated.self':
      return [{ id: id(), type: 'pulse', to: ctx.myId, color: 'violet', label: '행동 불능', big: true }];
    case 'game.end':
      return [{ id: id(), type: 'banner', text: e.text, color: 'gold' }];
    default:
      // 모드 고유 스킬: 대상 플레이어가 공개된 이벤트면 그 카드에 표시 (살해·실패는 색으로 구분)
      if (e.kind.startsWith('skill.') && target) {
        const kill = /살해|사망|정화합니다/.test(e.text);
        const fail = /실패|아닙니다/.test(e.text);
        const skill = e.kind.split('.')[1] ?? '';
        const from = mine(skill, target) ? ctx.myId : null;
        return [{ id: id(), type: 'fly', from, to: target, icon: skillIcon(skill), color: kill ? 'red' : fail ? 'grey' : 'teal', label: kill ? '처형' : undefined }];
      }
      return [];
  }
}
