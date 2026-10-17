// 평가 전용. 공개 고정p1의 자기 직접 확인 후속 공격 한 번만 추가한다. 운영 정책이 아니다.
import {smartBotAction,botCommunicationAction,eventsFor,viewFor,updateBotKnowledge,type Action,type BotMemory,type GameState,type GameEvent,type PlayerView} from '../src/index.js';
import {nextRandom} from '../src/rng.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Settings,type Policy} from './league-runner.js';
import {diagnosticHash} from './cooperative-claim-intervention.js';
type Reaction=NonNullable<NonNullable<BotMemory['perception']>['directCheckReaction']>;
/** 복제하는 것은 본인 기억뿐. 실제 기억/행동RNG/엔진은 변경하지 않는다. */
export function singleCheckProposal(s:GameState,id:string,m:BotMemory,activity:number,reaction:Reaction|undefined){
 if(!reaction||activity<=0||nextRandom({rng:m.rng})<=activity||!m.perception||m.perception.playerId!==id)return null;
 const v=viewFor(s,id),age=v.elapsedMs-reaction.at;
 if(v.phase!=='running'||!v.me.alive||age<1000||age>5000||m.perception.mode!==v.mode||m.perception.character!==v.me.character)return null;
 const receipt=eventsFor(s,id).find(e=>e.seq===reaction.seq);
 if(!receipt||receipt.at!==reaction.at||!['inspect.result','gem.result'].includes(receipt.kind)||receipt.vis.to!=='players'||receipt.vis.ids.length!==1||receipt.vis.ids[0]!==id||
  !receipt.facts?.some(f=>f.player===reaction.target&&f.character===reaction.name&&!f.oneOf)||
  m.perception.known.get(reaction.target)!==reaction.name||!v.roster.some(r=>r.key===reaction.name&&r.side!==v.me.side))return null;
 const trial=structuredClone(m);trial.perception!.directCheckReaction={...reaction};
 const a=smartBotAction(s,id,trial,{activity,directCheckFollowup:true});
 if(a?.type!=='skill'||!NAME_ATTACKS.includes(a.skill)||a.target!==reaction.target||a.name!==reaction.name)return null;
 const skill=v.me.skills.find(x=>x.key===a.skill)!;
 return {action:a,event:receipt,receivedAt:reaction.at,seq:reaction.seq,before:{character:v.me.character,side:v.me.side,mana:v.me.mana,gem:v.me.gem,trueName:v.me.trueName,
   skillCost:skill.mana,skillBlocked:skill.blocked,skillCooldown:skill.cooldownRemainingMs,knownName:reaction.name,targetSide:v.roster.find(r=>r.key===reaction.name)!.side},rngBefore:m.rng,inactiveDraw:nextRandom({rng:m.rng}),activity};
}
/** 행동 선택 후 자기 정보만 복제해서 전달하는 재생 진단. 운영 정책 입력에는 연결하지 않는다. */
export interface OwnCheckAttackTrace {
 at:number;action:Action;view:PlayerView;known:[string,string][];candidates:[string,string[]][];
 lastFailure:[string,[string,number][]][];privateEvidence:GameEvent[];publicProtection:GameEvent[];
 accepted:boolean;attackFailure:boolean;ownResultEvents:GameEvent[];
}
export function playCheckSingle(fixture:Fixture,style:ClaimStyle,change:boolean,settings:Settings=DEFAULT_SETTINGS,selected='p1',observe=true,traceOwn?:(entry:OwnCheckAttackTrace)=>void){
 type Proposal=NonNullable<ReturnType<typeof singleCheckProposal>>;
 type Point=Proposal&{player:string;at:number;original:Action|null;executed:Action|null;stateHash:string;memoryHash:string;viewHash:string;rngAfterBaseline:number;rngAfterSelection:number;accepted:boolean|null;error:string|null};
 let point:Point|null=null,used=false,reaction:Reaction|undefined,lastSeq=0,pending:{action:Action;view:PlayerView;trace?:Omit<OwnCheckAttackTrace,'accepted'|'attackFailure'|'ownResultEvents'>}|undefined;
 const resources={aliveMs:0,trueNameMs:0,turns:0,trueNameTurns:0,trueNameBonusGross:0,incomingAllyManaGross:0,turnGainGross:0,acceptedSkillMana:0,acceptedSkills:0,rejectedSkills:0,attackFailures:0,
  aliveAtEnd:null as boolean|null,manaAtEnd:null as number|null,firstSameAttackAt:null as number|null,firstSameAttackDelayMs:null as number|null,targetDiedAt:null as number|null,
  turnReceipts:[] as Array<{at:number;turn:number;gain:number;allies:number;trueName:boolean;gem:number}>,skills:{} as Record<string,{accepted:number;rejected:number;nominalMana:number;netManaDelta:number}>};
 const actions:Array<{at:number;action:Action;accepted:boolean;error:string|null;beforeMana:number;afterMana:number;nominalMana:number;attackFailure:boolean}>=[];
 const safety={wrongAllies:0,falseReports:0,wrongSingleAttack:0};
 const remember=(s:GameState,id:string,a:Action|null,m?:BotMemory)=>{
  if(observe&&point&&id===selected&&a){
   const view=viewFor(s,id);pending={action:a,view};
   if(traceOwn&&m&&a.type==='skill'&&NAME_ATTACKS.includes(a.skill)){
    const own=structuredClone(m),events=eventsFor(s,id),knowledge=updateBotKnowledge(view,events,own,{recordBattle:false});
    pending.trace=structuredClone({at:view.elapsedMs,action:a,view,known:[...knowledge.known],candidates:[...knowledge.candidates],
     lastFailure:[...(own.perception?.lastAttackNameFailure??[])].map(([id,names])=>[id,[...names]] as [string,[string,number][]]),
     privateEvidence:events.filter(e=>e.vis.to==='players'&&e.vis.ids.includes(id)&&
      (e.kind==='attack.fail.self'||e.facts?.some(f=>f.player===a.target))),
     publicProtection:events.filter(e=>e.vis.to==='all'&&(/guard|protection|death|kill|baptism/.test(e.kind)))});
   }
  }return a;
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
 const current:Policy=(s,id,m,o)=>{
  if(id!==selected)return smartBotAction(s,id,m,{activity:o.activity});
  if(!used&&m.perception?.directCheckReaction)reaction={...m.perception.directCheckReaction};
  const before=!used&&reaction?structuredClone(m):undefined,a=smartBotAction(s,id,m,{activity:o.activity});
  if(!used&&reaction&&before){
   const age=s.now-s.startedAt-reaction.at,active=nextRandom({rng:before.rng})<=(o.activity??.5);
   if(age>=1000||active){
    const candidate=singleCheckProposal(s,id,before,o.activity??.5,reaction);reaction=undefined;
    if(candidate){
     if(a!==null)throw Error('원래 비활동null 위반');used=true;
     // 선택 완료 후 평가 해시만. 숨은 엔진 상태/다른 봇 기억은 선택에 전달하지 않는다.
     point={...candidate,player:id,at:s.now-s.startedAt,original:a,executed:change?candidate.action:null,stateHash:observe?diagnosticHash(s):'',memoryHash:observe?diagnosticHash(before):'',viewHash:observe?diagnosticHash(viewFor(s,id)):'',
       rngAfterBaseline:m.rng,rngAfterSelection:m.rng,accepted:null,error:null};lastSeq=s.seq;
     // trial 기억/RNG를 채택하지 않고 communicationAt도 만들지 않아 추가 대화를 차단한다.
     return remember(s,id,change?candidate.action:a,m);
    }
   }
  }
  return remember(s,id,a,m);
 };
 const receive=(s:GameState)=>{
  if(!observe||!point)return;const v=viewFor(s,selected);resources.aliveAtEnd=v.me.alive;resources.manaAtEnd=v.me.mana;
  if(resources.targetDiedAt===null&&!v.players.find(p=>p.id===point!.action.target)!.alive)resources.targetDiedAt=v.elapsedMs;
  for(const e of eventsFor(s,selected,lastSeq))if(e.kind==='turn'&&e.vis.to==='players'&&e.vis.ids.includes(selected)){
   const r={at:e.at,turn:Number(e.data!.turn),gain:Number(e.data!.gain),allies:Number(e.data!.allies),trueName:e.data!.trueName===true,gem:Number(e.data!.gem)};resources.turnReceipts.push(r);resources.turns++;resources.trueNameTurns+=Number(r.trueName);resources.trueNameBonusGross+=10*Number(r.trueName);resources.incomingAllyManaGross+=10*r.allies;resources.turnGainGross+=r.gain;
  }lastSeq=s.seq;
 };
 const game=playMatch(fixture,{current,reference},settings,(s,id,a,result)=>{
  if(!observe)return;const self=s.players.find(p=>p.id===id)!;
  // 행동이 결정된 뒤의 실제 배정은 출력용 안전 채점에만 쓴다.
  if(self.side===fixture.currentSide&&result.ok){
   if(a.type==='skill'&&a.skill==='ally'&&s.players.find(p=>p.id===a.target)?.side!==self.side)safety.wrongAllies++;
   if(a.type==='chat'&&a.text.startsWith('확인 정보: ')){const match=/^확인 정보: \[(\d+)\] (.+)$/.exec(a.text),target=s.players.find(p=>p.seat===Number(match?.[1]));if(!target||viewFor(s,id).roster.find(r=>r.key===target.character)?.name!==match?.[2])safety.falseReports++;}
  }
  if(!point)return;
  if(id===selected&&pending?.action===a){
   const v=pending.view,after=viewFor(s,id).me.mana,cost=a.type==='skill'?v.me.skills.find(x=>x.key===a.skill)?.mana??0:0,attackFailure=result.events.some(e=>e.kind==='attack.fail.self');
   actions.push({at:v.elapsedMs,action:a,accepted:result.ok,error:result.ok?null:result.error??'거절',beforeMana:v.me.mana,afterMana:after,nominalMana:cost,attackFailure});
   if(traceOwn&&pending.trace)traceOwn(structuredClone({...pending.trace,accepted:result.ok,attackFailure,
    ownResultEvents:result.events.filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id))}));
   if(a.type==='skill'){
    const z=resources.skills[a.skill]??={accepted:0,rejected:0,nominalMana:0,netManaDelta:0};if(result.ok){z.accepted++;z.nominalMana+=cost;z.netManaDelta+=after-v.me.mana;resources.acceptedSkills++;resources.acceptedSkillMana+=cost;}else{z.rejected++;resources.rejectedSkills++;}resources.attackFailures+=Number(attackFailure);
    if(result.ok&&NAME_ATTACKS.includes(a.skill)&&a.target===point.action.target&&a.name===point.action.name&&resources.firstSameAttackAt===null){resources.firstSameAttackAt=v.elapsedMs;resources.firstSameAttackDelayMs=v.elapsedMs-point.at;}
    if(change&&v.elapsedMs===point.at&&JSON.stringify(a)===JSON.stringify(point.action)){point.accepted=result.ok;point.error=result.ok?null:result.error??'거절';const target=s.players.find(p=>p.id===a.target)!;safety.wrongSingleAttack+=Number(target.side===v.me.side||target.character!==a.name);}
   }pending=undefined;
  }receive(s);
 },{current:(s,id,m)=>remember(s,id,botCommunicationAction(s,id,m,{directCheckFollowup:id===selected&&!used}),m)},s=>{
  if(!observe||!point)return;receive(s);const v=viewFor(s,selected);if(v.me.alive){resources.aliveMs+=settings.tickMs;resources.trueNameMs+=v.me.trueName?settings.tickMs:0;}
 });
 return {game,point:point as Point|null,resources,safety,actions,forcedChanges:Number(change&&used)};
}
