import {claimCheckSucceeds} from './bot-claims.js';
import type { Action, CharKey, GameEvent, PlayerId } from './types.js';
import type { PlayerView, SkillView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';

export interface IntelReport { character: CharKey; at: number; seq: number }
export interface BotIntel {
  /** 수신자 자신이 본 대화만. 다른 봇의 기억·숨은 배정은 읽지 않는다. */
  reports: Map<PlayerId, Map<PlayerId, IntelReport>>;
  sent: Map<PlayerId, Map<PlayerId, CharKey>>;
  lastSentAt: number;
}
const intelFor = (memory: BotMemory): BotIntel => memory.perception!.intel ??= {
  reports: new Map(), sent: new Map(), lastSentAt: -12_000,
};

/** 사람이 읽을 수 있는 기존 귓속말. 발신자 ID는 서버 이벤트에서 가져온다. */
export function observeIntel(view: PlayerView, event: GameEvent, memory: BotMemory): void {
  if (!['chat.whisper', 'chat.ally'].includes(event.kind) || event.vis.to !== 'players' ||
      !event.vis.ids.includes(view.me.id) || typeof event.data?.from !== 'string' || typeof event.data.text !== 'string') return;
  const match = /^확인 정보: \[(\d{1,2})\] (.+)$/.exec(event.data.text);
  if (!match) return;
  const target = view.players.find(p => p.seat === Number(match[1]));
  const role = view.roster.find(r => r.inGame && r.name === match[2]);
  if (!target || !role || !view.players.some(p => p.id === event.data!.from)) return;
  const intel = intelFor(memory), sender = event.data.from;
  if (sender === view.me.id) {
    if (event.kind !== 'chat.whisper' || typeof event.data.to !== 'string') return;
    const sent = intel.sent.get(event.data.to) ?? new Map();
    sent.set(target.id, role.key); intel.sent.set(event.data.to, sent); intel.lastSentAt = event.at;
  } else {
    const reports = intel.reports.get(target.id) ?? new Map();
    reports.set(sender, { character: role.key, at: event.at, seq: event.seq });
    intel.reports.set(target.id, reports);
  }
}

/** 공표·동맹 요청만으로 신뢰하지 않는다. 직접 확인/확정 제약상 아군인 발신자만 참고한다.
 * 직접 사실과 충돌하거나 신뢰한 발신자끼리 의견이 다르면 보류. 말은 정체 확정 facts가 아니다.
 */
export function trustedIntel(view: PlayerView, knowledge: Knowledge, memory: BotMemory, includeDeadConfirmedSenders=false): Map<PlayerId, CharKey> {
  const result = new Map<PlayerId, CharKey>();
  for (const [target, reports] of memory.perception?.intel?.reports ?? []) {
    if (target === view.me.id || knowledge.known.has(target) || !view.players.some(p => p.id === target && p.alive)) continue;
    const names = new Set<CharKey>();
    let contradiction = false;
    for (const [sender, report] of reports) {
      const role = knowledge.known.get(sender);
      if (!role || !view.roster.some(r => r.key === role && r.side === view.me.side) ||
          !view.players.some(p => p.id === sender && (p.alive || includeDeadConfirmedSenders && p.revealed === role))) continue;
      if (!knowledge.candidates.get(target)?.includes(report.character)) contradiction = true;
      names.add(report.character);
    }
    if (!contradiction && names.size === 1) result.set(target, [...names][0]!);
  }
  return result;
}

/** 보고는 추론의 약한 가중치로만 사용. 제약이나 후보를 삭제하지 않으며 반복 보고를 누적하지 않는다. */
export const INTEL_WEIGHT = 8;

/** 개발 전술: 보고는 facts가 아니다. 여유 마나가 있을 때 실패 사망 없는 공격만 허용한다.
 * 자기 실패 영수증이 있는 이름은 재시도하지 않는다(실패 원인/정체는 확정하지 않는다).
 */
export function reportedSupremeAttack(view: PlayerView, knowledge: Knowledge, memory: BotMemory,
  skills: ReadonlyMap<string, SkillView>, attackable: (name: CharKey) => boolean): Action | null {
  const skill = skills.get('supreme_attack');
  if (!skill || skill.blocked !== null || view.elapsedMs < 4 * 60_000 || view.me.mana < Math.max(100, skill.mana)) return null;
  const reports = [...trustedIntel(view, knowledge, memory)].sort((a,b) =>
    Number(!!view.roster.find(r=>r.key===b[1])?.commander)-Number(!!view.roster.find(r=>r.key===a[1])?.commander) ||
    view.players.find(p=>p.id===a[0])!.seat-view.players.find(p=>p.id===b[0])!.seat);
  for (const [target, name] of reports) {
    const p = view.players.find(p=>p.id===target)!;
    if (!attackable(name) || !skill.nameOptions?.includes(name) ||
        (!skill.ignoresInvulnerable && p.statuses.some(e=>e.kind==='invulnerable')) ||
        memory.perception?.lastAttackNameFailure.get(target)?.has(name)) continue;
    return {type:'skill',skill:'supreme_attack',target,name};
  }
  return null;
}

/** 기본OFF 개발 전술. 실제 신뢰 보고는 사실로 승격하지 않고 첫 경고 이전 상급 공격에만 참고한다. */
export function reportedFirstWarningAttack(view: PlayerView, knowledge: Knowledge, memory: BotMemory,
  skills: ReadonlyMap<string, SkillView>, attackable: (name: CharKey) => boolean): Action | null {
  const skill=skills.get('advanced_attack');
  if(!skill||skill.key!=='advanced_attack'||skill.level!==1||skill.passive||skill.blocked!==null||
      skill.cooldownRemainingMs>0||skill.usesLeft===0||view.elapsedMs<4*60_000||view.me.mana<Math.max(100,skill.mana))return null;
  const reports=[...trustedIntel(view,knowledge,memory)].sort((a,b)=>
    Number(!!view.roster.find(r=>r.key===b[1])?.commander)-Number(!!view.roster.find(r=>r.key===a[1])?.commander)||
    view.players.find(p=>p.id===a[0])!.seat-view.players.find(p=>p.id===b[0])!.seat);
  for(const [target,name] of reports){
    const p=view.players.find(p=>p.id===target)!;
    if(!attackable(name)||!skill.nameOptions?.includes(name)||
       (!skill.ignoresInvulnerable&&p.statuses.some(e=>e.kind==='invulnerable'))||
       memory.perception?.lastAttackNameFailure.get(target)?.has(name))continue;
    return {type:'skill',skill:'advanced_attack',target,name};
  }
  return null;
}

/** 검증 비용을 쓸 정보 교환이 있는지 자기 관찰로 판단한다. 보고 내용은 아직 신뢰하지 않는다. */
export function hasUsefulIntelExchange(view: PlayerView, knowledge: Knowledge, memory: BotMemory, sender: PlayerId): boolean {
  if(view.players.some(p=>p.alive&&p.id!==view.me.id&&p.id!==sender&&!p.revealed&&knowledge.known.has(p.id)))return true;
  for(const [target,reports] of memory.perception?.intel?.reports??[]){
    const report=reports.get(sender),p=view.players.find(p=>p.id===target);
    if(report&&p?.alive&&target!==view.me.id&&!knowledge.known.has(target)&&knowledge.candidates.get(target)?.includes(report.character))return true;
  }
  return false;
}

export function shareIntel(view: PlayerView, knowledge: Knowledge, memory: BotMemory): Action | null {
  const intel = intelFor(memory);
  if (view.elapsedMs - intel.lastSentAt < 12_000) return null;
  const friends = view.players.filter(p => p.alive && p.id !== view.me.id && view.me.allies.includes(p.id) &&
    view.roster.some(r => r.key === knowledge.known.get(p.id) && r.side === view.me.side));
  // 확정 적 지휘관 → 적 → 아군. 전달받은 말은 재전송하지 않아 소문 순환을 막는다.
  const targets = view.players.filter(p => p.alive && p.id !== view.me.id && knowledge.known.has(p.id))
    .sort((a, b) => {
      const score = (id: string) => { const r = view.roster.find(r => r.key === knowledge.known.get(id))!; return r.side !== view.me.side ? r.commander ? 3 : 2 : 1; };
      return score(b.id) - score(a.id) || a.seat - b.seat;
    });
  for (const target of targets) for (const friend of friends) {
    if (target.id === friend.id) continue;
    const character = knowledge.known.get(target.id)!;
    if (intel.sent.get(friend.id)?.get(target.id) === character) continue;
    const role = view.roster.find(r => r.key === character)!;
    const text = `확인 정보: [${target.seat}] ${role.name}`;
    if (text.length <= 50) return { type: 'chat', channel: 'whisper', to: friend.id, text };
  }
  return null;
}

/** 보고받은 대상의 검증을 먼저 한다. 정체 불명 대상에게 보고 이름으로 위험한 공격을 하지 않는다. */
export function verifyIntel(view: PlayerView, knowledge: Knowledge, memory: BotMemory, skills: ReadonlyMap<string, SkillView>, includeDeadConfirmedSenders=false): Action | null {
  const reports = [...trustedIntel(view, knowledge, memory,includeDeadConfirmedSenders)];
  reports.sort((a, b) => Number(view.roster.find(r => r.key === b[1])?.side !== view.me.side) -
    Number(view.roster.find(r => r.key === a[1])?.side !== view.me.side));
  for (const [target, name] of reports) {
    const p = view.players.find(p => p.id === target)!;
    for (const key of ['advanced_scan', 'scan', 'ally_scan', 'enemy_scan', 'troll_scan', 'troll_ally_scan', 'troll_enemy_scan']) {
      const s = skills.get(key);
      if (s?.nameOptions?.includes(name) && new Set((knowledge.candidates.get(target)??[]).map(c=>claimCheckSucceeds(view,key,c,p.published,name))).size>1 && (s.ignoresInvulnerable || !p.statuses.some(e => e.kind === 'invulnerable')))
        return { type: 'skill', skill: key, target, name };
    }
    const gem = skills.get('truth_gem');
    if (gem && !view.roster.find(r => r.key === name)?.commander &&
        (gem.ignoresInvulnerable || !p.statuses.some(e => e.kind === 'invulnerable'))) return { type: 'skill', skill: 'truth_gem', target };
  }
  return null;
}
