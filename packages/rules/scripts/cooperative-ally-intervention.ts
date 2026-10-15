// 자기 정책의 동맹 제안 한 번만 지연하는 오프라인 대응 진단. 운영 정책 옵션이 아니다.
import {smartBotAction,botCommunicationAction,botKnowledge,eventsFor,viewFor,type Action,type PlayerView,type Knowledge} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Settings,type Policy} from './league-runner.js';
import {diagnosticHash} from './cooperative-claim-intervention.js';

export function firstLowManaAllyProposal(v:PlayerView,k:Knowledge,a:Action|null,used:boolean){
  if(used||v.phase!=='running'||!v.me.alive||a?.type!=='skill'||a.skill!=='ally'||!a.target)return null;
  const skill=v.me.skills.find(s=>s.key==='ally'&&!s.passive&&s.blocked===null),target=v.players.find(p=>p.id===a.target),name=k.known.get(a.target);
  if(!skill||!Number.isFinite(v.me.mana)||!target?.alive||target.id===v.me.id||v.me.allies.includes(target.id)||!name||
    !v.roster.some(r=>r.key===name&&r.side===v.me.side)||target.statuses.some(e=>e.kind==='invulnerable')||
    v.me.mana<skill.mana||v.me.mana-skill.mana>=50)return null;
  const knownEnemy=v.players.some(p=>p.id!==v.me.id&&p.alive&&v.roster.some(r=>r.key===k.known.get(p.id)&&r.side!==v.me.side));
  const afterMana=v.me.mana-skill.mana,cell=`E${Number(knownEnemy)}L${Number(afterMana<20)}`;
  return {cell,before:{character:v.me.character,side:v.me.side,mana:v.me.mana,gem:v.me.gem,commander:v.me.commander,
    nextTurnInMs:v.nextTurnInMs,published:v.me.published,knownEnemy,afterMana,allyCost:skill.mana,targetName:name,targetSide:v.me.side,
    targetAlive:true,targetAlreadyAllied:false,targetPubliclyProtected:false},original:{...a}};
}

export function playAllyIntervention(fixture:Fixture,style:ClaimStyle,change:boolean,settings:Settings=DEFAULT_SETTINGS,selected='p1',observe=true){
  type Proposal=NonNullable<ReturnType<typeof firstLowManaAllyProposal>>;
  type Point=Proposal&{at:number;player:string;executed:Action|null;stateHash:string;memoryHash:string;viewHash:string;accepted:boolean|null;error:string|null};
  let point:Point|null=null,used=false,lastOwnSeq=0,pending:{action:Action;view:PlayerView}|undefined;
  const resources={aliveMs:0,trueNameMs:0,reachedGem3:false,turns:0,trueNameTurns:0,trueNameBonusGross:0,incomingAllyManaGross:0,turnGainGross:0,
    acceptedSkillMana:0,acceptedSkills:0,rejectedSkills:0,attackFailures:0,allyManaNet:0,publishManaNet:0,
    aliveAtEnd:null as boolean|null,manaAtEnd:null as number|null,firstSameAllyAt:null as number|null,firstSameAllyDelayMs:null as number|null,
    turnReceipts:[] as Array<{at:number;turn:number;gain:number;allies:number;trueName:boolean;gem:number}>,
    skills:{} as Record<string,{accepted:number;rejected:number;nominalMana:number;netManaDelta:number}>};
  const actions:Array<{at:number;action:Action;accepted:boolean;error:string|null;beforeMana:number;afterMana:number;maxMana:number;nominalMana:number;attackFailure:boolean}>=[];
  const safety={wrongAllies:0,falseReports:0};
  const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(observe&&point&&id===selected&&a)pending={action:a,view:viewFor(s,id)};return a;};
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'
    ?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
  const current:Policy=(s,id,m,o)=>{
    const a=smartBotAction(s,id,m,{activity:o.activity});if(id!==selected)return a;
    const v=viewFor(s,id),k=a?.type==='skill'&&a.skill==='ally'?botKnowledge(s,id,v,structuredClone(m)):null;
    const proposal=k?firstLowManaAllyProposal(v,k,a,used):null;
    if(proposal){
      point={...proposal,at:v.elapsedMs,player:id,executed:change?null:proposal.original,
        stateHash:observe?diagnosticHash(s):'',memoryHash:observe?diagnosticHash(m):'',viewHash:observe?diagnosticHash(v):'',accepted:null,error:null};
      used=true;lastOwnSeq=s.seq;resources.reachedGem3=v.me.gem===3;
    }
    return remember(s,id,proposal?(change?null:proposal.original):a);
  };
  const receive=(s:Parameters<Policy>[0])=>{
    if(!observe||!point)return;const v=viewFor(s,selected);resources.aliveAtEnd=v.me.alive;resources.manaAtEnd=v.me.mana;
    for(const e of eventsFor(s,selected,lastOwnSeq))if(e.kind==='turn'&&e.vis.to==='players'&&e.vis.ids.includes(selected)){
      const r={at:e.at,turn:Number(e.data!.turn),gain:Number(e.data!.gain),allies:Number(e.data!.allies),trueName:e.data!.trueName===true,gem:Number(e.data!.gem)};
      resources.turnReceipts.push(r);resources.turns++;resources.trueNameTurns+=Number(r.trueName);resources.trueNameBonusGross+=r.trueName?10:0;
      resources.incomingAllyManaGross+=10*r.allies;resources.turnGainGross+=r.gain;
    }lastOwnSeq=s.seq;
  };
  const game=playMatch(fixture,{current,reference},settings,(s,id,a,result)=>{
    if(!observe)return;const self=s.players.find(p=>p.id===id)!;
    // 실제 배정은 결정 이후 외부 안전 채점만. 정책/자기 기억에 넣지 않는다.
    if(self.side===fixture.currentSide&&result.ok){
      if(a.type==='skill'&&a.skill==='ally'&&s.players.find(p=>p.id===a.target)?.side!==self.side)safety.wrongAllies++;
      if(a.type==='chat'&&a.text.startsWith('확인 정보: ')){
        const match=/^확인 정보: \[(\d+)\] (.+)$/.exec(a.text),target=s.players.find(p=>p.seat===Number(match?.[1]));
        if(!target||viewFor(s,id).roster.find(r=>r.key===target.character)?.name!==match?.[2])safety.falseReports++;
      }
    }
    if(!point)return;
    if(id===selected&&pending?.action===a){
      const cost=a.type==='skill'?pending.view.me.skills.find(x=>x.key===a.skill)?.mana??0:0,after=viewFor(s,id).me.mana;
      const attackFailure=result.events.some(e=>e.kind==='attack.fail.self');
      actions.push({at:pending.view.elapsedMs,action:a,accepted:result.ok,error:result.ok?null:result.error??'거절',beforeMana:pending.view.me.mana,afterMana:after,maxMana:pending.view.me.maxMana,nominalMana:cost,attackFailure});
      if(a.type==='skill'){
        const b=resources.skills[a.skill]??={accepted:0,rejected:0,nominalMana:0,netManaDelta:0};
        if(result.ok){b.accepted++;b.nominalMana+=cost;b.netManaDelta+=after-pending.view.me.mana;resources.acceptedSkills++;resources.acceptedSkillMana+=cost;}
        else{b.rejected++;resources.rejectedSkills++;}resources.attackFailures+=Number(attackFailure);
        if(result.ok&&a.skill==='publish')resources.publishManaNet+=after-pending.view.me.mana;
        if(result.ok&&a.skill==='ally'){
          resources.allyManaNet+=pending.view.me.mana-after;
          if(a.target===point.original.target&&resources.firstSameAllyAt===null){resources.firstSameAllyAt=pending.view.elapsedMs;resources.firstSameAllyDelayMs=pending.view.elapsedMs-point.at;}
        }
        if(a.skill==='ally'&&a.target===point.original.target&&pending.view.elapsedMs===point.at&&!change){point.accepted=result.ok;point.error=result.ok?null:result.error??'거절';}
      }pending=undefined;
    }receive(s);
  },{current:(s,id,m)=>remember(s,id,botCommunicationAction(s,id,m))},s=>{
    if(!observe||!point)return;receive(s);const v=viewFor(s,selected);if(!v.me.alive)return;
    resources.aliveMs+=settings.tickMs;if(v.me.trueName)resources.trueNameMs+=settings.tickMs;if(v.me.gem===3)resources.reachedGem3=true;
  });
  return {game,point:point as Point|null,resources,safety,actions,forcedChanges:Number(change&&used)};
}
