import {TURN_BASE_MANA} from './constants.js';
import type {PlayerView} from './engine/view.js';
import type {Knowledge} from './bot-memory.js';
import type {CharKey} from './types.js';
import {NAME_ATTACKS} from './bot-tactics.js';

/** 공개 규칙. 태초 횟수제 보디가드는 공격자 손해가 없어 기존 정책처럼 제외한다. */
export const KNOWN_ATTACK_GUARDS:Record<string,Record<CharKey,CharKey[]>>={
  civil_war:{kai:['arin'],dantes:['kelhu']},lidellut:{kai:['arin']},troll:{chis:['satoshi','zwinra']},
};

/** 다음 턴 미리보기는 예측이며 미래 생존/공표/동맹 유지나 명중을 보장하지 않는다. */
export function forecastAttackBudget(view:PlayerView,knowledge:Knowledge){
  const me=view.me,turn=view.nextTurnInMs,preview=me.nextTurnManaPreview;
  if(view.phase!=='running'||!me.alive||!Number.isFinite(turn)||turn<=0||turn>20_000||
    !Number.isFinite(preview)||preview<=0||!Number.isFinite(me.mana)||!Number.isFinite(me.maxMana)||
    me.mana<0||
    me.effects.some(e=>e.kind==='incapacitated'))return null;
  const dead=new Set(view.players.filter(p=>!p.alive&&p.revealed).map(p=>p.revealed!)),guards=KNOWN_ATTACK_GUARDS[view.mode]??{};
  const plans=[];
  for(const skill of me.skills){
    if(skill.passive||!NAME_ATTACKS.includes(skill.key)||skill.usesLeft===0||skill.mana<=me.mana||
      skill.cooldownRemainingMs<turn||skill.cooldownRemainingMs>20_000||
      Math.min(me.maxMana,me.mana+preview)<skill.mana)continue;
    const target=view.players.find(p=>p.id!==me.id&&p.alive&&!p.statuses.some(e=>e.kind==='invulnerable')&&
      knowledge.known.has(p.id)&&view.roster.some(r=>r.key===knowledge.known.get(p.id)&&r.side!==me.side)&&
      skill.nameOptions?.includes(knowledge.known.get(p.id)!)&&!(guards[knowledge.known.get(p.id)!]??[]).some(g=>!dead.has(g)));
    if(target)plans.push({skill:skill.key,cost:skill.mana,cooldownRemainingMs:skill.cooldownRemainingMs,target:target.id,
      name:knowledge.known.get(target.id)!,manaToKeep:Math.max(0,skill.mana-preview)});
  }
  return plans.filter(p=>p.manaToKeep>0).sort((a,b)=>b.manaToKeep-a.manaToKeep||a.cooldownRemainingMs-b.cooldownRemainingMs)[0]??null;
}

/** 기존 caller가 확정 공격/현재 충분한 마나/20초 내 재사용을 거른 뒤 호출한다. */
export function reserveAttackMana(view:PlayerView,skill:PlayerView['me']['skills'][number],netOfBaseIncome=false):number{
  return netOfBaseIncome&&view.nextTurnInMs>0&&view.nextTurnInMs<=skill.cooldownRemainingMs&&view.me.nextTurnManaPreview>=TURN_BASE_MANA
    ? Math.max(0,skill.mana-TURN_BASE_MANA):skill.mana;
}
