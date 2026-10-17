import type { Action, CharKey, GameEvent, PlayerId } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { BotMemory } from './bot-memory.js';

const namedAttacks = new Set(['attack', 'advanced_attack', 'supreme_attack', 'soen_chain_murder']);
const successfulOutcomes = new Set(['attack.hit', 'attack.kill', 'attack.guarded']);
export interface OwnAttackProof {
  target: PlayerId;
  name: CharKey;
  skill: string;
  at: number;
  afterSeq: number;
  seq: number;
  kind: string;
  actor: CharKey;
}
export interface OwnAttackMemory {
  pending?: Omit<OwnAttackProof, 'seq' | 'kind'> & { accepted: boolean };
  lastAcceptedAt?: number;
  proofs: Map<PlayerId, OwnAttackProof>;
}

/** Remember only the actual policy proposal. No engine state or hidden result enters this boundary. */
export function prepareOwnAttack(memory: BotMemory, action: Action | null, at: number): void {
  const p = memory.perception, learning = p?.ownAttacks;
  if (!p || !learning) return;
  if (action === null) return; // An inactive poll must not discard an acknowledged, unconsumed receipt.
  delete learning.pending;
  if (action?.type !== 'skill' || !namedAttacks.has(action.skill) || !action.target || !action.name ||
      action.target === p.playerId || at !== p.lastElapsedMs || learning.lastAcceptedAt === at) return;
  learning.pending = { target: action.target, name: action.name, skill: action.skill, at,
    afterSeq: p.lastSeq, actor: p.character, accepted: false };
}

/** An accepted command is NOT evidence of a hit; remember the acknowledgement until visible events arrive. */
export function acknowledgeOwnAttack(memory: BotMemory, action: Action, ok: boolean, at: number): void {
  const learning = memory.perception?.ownAttacks, pending = learning?.pending;
  if (!learning || action.type !== 'skill' || !namedAttacks.has(action.skill)) return;
  const duplicate = learning.lastAcceptedAt === at;
  if (ok) learning.lastAcceptedAt = at;
  if (!pending || duplicate || !ok || at !== pending.at || action.target !== pending.target ||
      action.name !== pending.name || action.skill !== pending.skill) { delete learning.pending; return; }
  pending.accepted = true;
}

/** Correlate an acknowledged own command with exactly one fresh, visible outcome of that command. */
export function observeOwnAttack(view: PlayerView, events: readonly GameEvent[], memory: BotMemory): void {
  const p = memory.perception!, learning = p.ownAttacks, pending = learning?.pending;
  if (!learning || !pending) return;
  delete learning.pending; // A receipt is consumed once, including ambiguous/missing outcomes.
  if (!pending.accepted || pending.at > view.elapsedMs || pending.actor !== view.me.character ||
      !view.players.some(x => x.id === pending.target) || !view.roster.some(x => x.inGame && x.key === pending.name)) return;
  const receipts = events.filter(e => e.seq > pending.afterSeq && e.at === pending.at &&
    (e.vis.to === 'all' || e.vis.to === 'players' && e.vis.ids.includes(view.me.id)));
  if (receipts.some(e => e.kind === 'attack.fail.self' ||
      e.kind.startsWith('attack.fail') && e.data?.attacker === pending.actor)) return;
  const outcomes = receipts.filter(e => successfulOutcomes.has(e.kind) && e.data?.attacker === pending.actor);
  if (outcomes.length !== 1 || outcomes[0]!.data?.target !== pending.name) return;
  const event = outcomes[0]!;
  learning.proofs.set(pending.target, { target: pending.target, name: pending.name, skill: pending.skill,
    at: pending.at, afterSeq: pending.afterSeq, actor: pending.actor, seq: event.seq, kind: event.kind });
}
