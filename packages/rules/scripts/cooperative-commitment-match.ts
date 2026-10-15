// 평가 관측 전용. 자기 뷰/수신 이벤트 집계는 정책으로 전달하지 않는다.
import {smartBotAction,botCommunicationAction,eventsFor,viewFor,type Action,type BotMemory,type PlayerView} from '../src/index.js';
import {claimTurnCommitted} from '../src/bot-claim-commitment.js';
import {PUBLISH_MANA} from '../src/constants.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';
export type CommitmentVariant='baseline'|'control'|'commitment';
export function playCommitmentMatch(fixture:Fixture,style:ClaimStyle,variant:CommitmentVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
  const options=variant==='commitment'?{claimTurnCommitment:true}:{};
  const resources={aliveMs:0,trueNameMs:0,turns:0,trueNameTurns:0,trueNameBonusGross:0,incomingAllyManaGross:0,turnGainGross:0,
    publishes:0,truePublishes:0,falsePublishes:0,publishManaGross:0,publishManaNet:0,allies:0,allyManaNet:0,
    acceptedSkillMana:0,attackFailures:0,holdingMs:0,holdStarts:0,holdingTrueNameTurns:0,gemCompletedPlayers:0,
    skills:{} as Record<string,{accepted:number;rejected:number;nominalMana:number;netManaDelta:number;whileHolding:number}>};
  const safety={wrongAllies:0,falseReports:0,holdingFalsePublishes:0};
  const turns:Array<{player:string;at:number;turn:number;gain:number;allies:number;trueName:boolean;gem:number;holding:boolean}>=[];
  const holds:Array<{player:string;character:string;at:number;publishedAt:number;until:number;nextTurnInMs:number;trueName:boolean;hasDisguise:boolean}>=[];
  const actions:Array<{player:string;at:number;action:Action;accepted:boolean;error:string|null;beforeMana:number;afterMana:number;maxMana:number;nominalMana:number;holding:boolean;beforeTrueName:boolean;character:string;side:number;
    grading:{allyTargetSide:number|null;report:boolean;reportExpectedName:string|null}}>=[];
  const ownIds=new Set<string>(),seq=new Map<string,number>(),until=new Map<string,number>(),holdingCharacter=new Map<string,string>(),seenHolds=new Set<string>(),completed=new Set<string>();
  const pending=new Map<string,{action:Action;view:PlayerView;holding:boolean}>();
  const note=(s:Parameters<Policy>[0],id:string,m:BotMemory)=>{
    if(!observe)return;ownIds.add(id);const v=viewFor(s,id),c=m.perception?.claimCommitment,h=claimTurnCommitted(v,m);
    until.set(id,h?c!.until:0);
    if(h)holdingCharacter.set(id,v.me.character);else holdingCharacter.delete(id);
    if(h){const key=`${id}/${c!.publishedAt}/${c!.until}`;if(!seenHolds.has(key)){
      seenHolds.add(key);resources.holdStarts++;holds.push({player:id,character:v.me.character,at:v.elapsedMs,publishedAt:c!.publishedAt!,until:c!.until,
        nextTurnInMs:v.nextTurnInMs,trueName:v.me.trueName,hasDisguise:v.me.skills.some(x=>x.key==='disguise')});
    }}
  };
  const remember=(s:Parameters<Policy>[0],id:string,a:Action|null,m:BotMemory)=>{note(s,id,m);if(observe&&a)pending.set(id,{action:a,view:viewFor(s,id),holding:claimTurnCommitted(viewFor(s,id),m)});return a;};
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'
    ?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
  const current:Policy=(s,id,m,o)=>remember(s,id,variant==='baseline'?previous(s,id,m,{activity:o.activity}):smartBotAction(s,id,m,{...o,...options}),m);
  const receive=(s:Parameters<Policy>[0])=>{
    if(!observe)return;
    for(const id of ownIds){for(const e of eventsFor(s,id,seq.get(id)??0)){
      if(e.kind!=='turn'||e.vis.to!=='players'||!e.vis.ids.includes(id))continue;
      const holding=(until.get(id)??0)>0&&e.at<=(until.get(id)??0)&&viewFor(s,id).me.character===holdingCharacter.get(id);
      const r={player:id,at:e.at,turn:Number(e.data!.turn),gain:Number(e.data!.gain),allies:Number(e.data!.allies),trueName:e.data!.trueName===true,gem:Number(e.data!.gem),holding};
      turns.push(r);resources.turns++;resources.trueNameTurns+=Number(r.trueName);resources.trueNameBonusGross+=r.trueName?10:0;
      resources.incomingAllyManaGross+=10*r.allies;resources.turnGainGross+=r.gain;resources.holdingTrueNameTurns+=Number(holding&&r.trueName);
    }seq.set(id,s.seq);}
  };
  const game=playMatch(fixture,{current,reference},settings,(s,id,a,result)=>{
    if(!observe)return;receive(s);if(!ownIds.has(id))return;
    const p=pending.get(id);if(!p||p.action!==a)throw Error('자기 실제 행동의 직전 뷰 누락');pending.delete(id);
    const after=viewFor(s,id),nominal=a.type==='skill'?p.view.me.skills.find(x=>x.key===a.skill)?.mana??0:0;
    // 실제 정체 채점 자료는 결정이 끝난 뒤에만 생성하고 출력에만 쓴다.
    const grading={allyTargetSide:a.type==='skill'&&a.skill==='ally'&&result.ok?s.players.find(x=>x.id===a.target)?.side??null:null,report:false,reportExpectedName:null as string|null};
    if(result.ok&&a.type==='chat'&&a.text.startsWith('확인 정보: ')){
      grading.report=true;const match=/^확인 정보: \[(\d+)\] (.+)$/.exec(a.text),target=s.players.find(x=>x.seat===Number(match?.[1]));
      grading.reportExpectedName=p.view.roster.find(x=>x.key===target?.character)?.name??null;
      safety.falseReports+=Number(!match||grading.reportExpectedName!==match[2]);
    }
    actions.push({player:id,at:p.view.elapsedMs,action:a,accepted:result.ok,error:result.ok?null:result.error??'알 수 없는 거절',beforeMana:p.view.me.mana,
      afterMana:after.me.mana,maxMana:p.view.me.maxMana,nominalMana:nominal,holding:p.holding,beforeTrueName:p.view.me.trueName,character:p.view.me.character,side:p.view.me.side,grading});
    if(a.type==='skill'){
      const skill=resources.skills[a.skill]??={accepted:0,rejected:0,nominalMana:0,netManaDelta:0,whileHolding:0};
      if(result.ok){skill.accepted++;skill.nominalMana+=nominal;skill.netManaDelta+=after.me.mana-p.view.me.mana;skill.whileHolding+=Number(p.holding);resources.acceptedSkillMana+=nominal;}
      else skill.rejected++;
      resources.attackFailures+=Number(result.events.some(e=>e.kind==='attack.fail.self'));
      if(result.ok&&a.skill==='publish'){
        const truthful=a.name===p.view.me.character;resources.publishes++;resources.truePublishes+=Number(truthful);resources.falsePublishes+=Number(!truthful);
        resources.publishManaGross+=PUBLISH_MANA;resources.publishManaNet+=after.me.mana-p.view.me.mana;
        safety.holdingFalsePublishes+=Number(p.holding&&!truthful);
      }
      if(result.ok&&a.skill==='ally'){
        resources.allies++;resources.allyManaNet+=p.view.me.mana-after.me.mana;
        // 실제 진영은 외부 안전 채점만. 정책/기억/선택 특징에 돌려주지 않는다.
        safety.wrongAllies+=Number(grading.allyTargetSide!==p.view.me.side);
      }
    }
  },variant==='baseline'?{}:{current:(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}),m)},s=>{
    if(!observe)return;receive(s);
    for(const id of ownIds){const v=viewFor(s,id);if(!v.me.alive)continue;
      resources.aliveMs+=settings.tickMs;if(v.me.trueName)resources.trueNameMs+=settings.tickMs;
      if(v.me.trueName&&v.me.character===holdingCharacter.get(id)&&v.elapsedMs<(until.get(id)??0))resources.holdingMs+=settings.tickMs;
      if(v.me.gem===3&&!completed.has(id)){completed.add(id);resources.gemCompletedPlayers++;}
    }
  });
  return {game,resources,safety,turns,holds,actions};
}
