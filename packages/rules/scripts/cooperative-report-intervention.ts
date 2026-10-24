// Actual trusted-report verification once versus own-memory normal path; offline diagnostic only.
import {smartBotAction,botCommunicationAction,botKnowledge,eventsFor,viewFor,type Action,type PlayerView,type Knowledge,type BotMemory} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Settings,type Policy} from './league-runner.js';
import {trustedIntel,verifyIntel} from '../src/bot-intel.js';
import {nextRandom} from '../src/rng.js';
import {diagnosticHash} from './cooperative-claim-intervention.js';

export function firstTrustedReportProposal(v:PlayerView,k:Knowledge,m:BotMemory,a:Action|null,alternative:Action|null,used:boolean){
  if(used||v.phase!=='running'||!v.me.alive||a?.type!=='skill'||!a.target)return null;
  const usable=new Map(v.me.skills.filter(x=>!x.passive&&x.blocked===null).map(x=>[x.key,x]));
  const check=verifyIntel(v,k,m,usable),name=trustedIntel(v,k,m).get(a.target);
  if(!name||diagnosticHash(check)!==diagnosticHash(a))return null;
  return {cell:'all',before:{character:v.me.character,side:v.me.side,mana:v.me.mana,gem:v.me.gem,
    nextTurnInMs:v.nextTurnInMs,published:v.me.published,targetName:name,targetAlive:true,targetKnown:false,
    reportAboutEnemy:v.roster.find(x=>x.key===name)!.side!==v.me.side,
    originalMana:usable.get(a.skill)!.mana,alternativeMana:alternative?.type==='skill'?v.me.skills.find(x=>x.key===alternative.skill)!.mana:0},
    original:{...a},alternative:alternative?{...alternative}:null};
}

export function playReportIntervention(fixture:Fixture,style:ClaimStyle,change:boolean,settings:Settings=DEFAULT_SETTINGS,selected='p1',observe=true){
  type Proposal=NonNullable<ReturnType<typeof firstTrustedReportProposal>>;
  type Point=Proposal&{at:number;player:string;executed:Action|null;stateHash:string;memoryHash:string;viewHash:string;alternativeMemoryHash:string;accepted:boolean|null;error:string|null};
  let point:Point|null=null,used=false,lastOwnSeq=0,pending:{action:Action;view:PlayerView}|undefined;
  const resources={aliveMs:0,trueNameMs:0,reachedGem3:false,turns:0,trueNameTurns:0,trueNameBonusGross:0,incomingAllyManaGross:0,turnGainGross:0,
    acceptedSkillMana:0,acceptedSkills:0,rejectedSkills:0,attackFailures:0,allyManaNet:0,publishManaNet:0,
    aliveAtEnd:null as boolean|null,manaAtEnd:null as number|null,firstSameCheckAt:null as number|null,firstSameCheckDelayMs:null as number|null,
    firstExactReportedFactAt:null as number|null,reportedFactReceipts:[] as Array<{at:number;seq:number;kind:string;player:string;character:string}>,
    turnReceipts:[] as Array<{at:number;turn:number;gain:number;allies:number;trueName:boolean;gem:number}>,
    skills:{} as Record<string,{accepted:number;rejected:number;nominalMana:number;netManaDelta:number}>};
  const actions:Array<{at:number;action:Action;accepted:boolean;error:string|null;beforeMana:number;afterMana:number;beforeGem:number;afterGem:number;maxMana:number;nominalMana:number;attackFailure:boolean}>=[];
  const safety={wrongAllies:0,falseReports:0};
  const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(observe&&point&&id===selected&&a)pending={action:a,view:viewFor(s,id)};return a;};
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'
    ?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
  const current:Policy=(s,id,m,o)=>{
    const before=id===selected&&!used&&nextRandom({rng:m.rng})<=(o.activity??0.5)?structuredClone(m):null;
    const a=smartBotAction(s,id,m,{activity:o.activity});if(id!==selected)return a;
    if(!before)return remember(s,id,a);
    const v=viewFor(s,id),k=before&&a?.type==='skill'?botKnowledge(s,id,v,structuredClone(m)):null;
    let proposal:ReturnType<typeof firstTrustedReportProposal>=null,trial:BotMemory|null=null;
    if(k&&before&&firstTrustedReportProposal(v,k,m,a,null,used)){
      trial=before;const alternative=smartBotAction(s,id,trial,{activity:o.activity,reportVerification:'normal'});
      proposal=firstTrustedReportProposal(v,k,m,a,alternative,used);
    }
    if(proposal){
      point={...proposal,at:v.elapsedMs,player:id,executed:change?proposal.alternative:proposal.original,
        stateHash:observe?diagnosticHash(s):'',memoryHash:observe?diagnosticHash(m):'',viewHash:observe?diagnosticHash(v):'',
        alternativeMemoryHash:observe?diagnosticHash(trial):'',accepted:null,error:null};
      used=true;lastOwnSeq=s.seq;resources.reachedGem3=v.me.gem===3;
      if(change){for(const key of Object.keys(m))if(!(key in trial!))Reflect.deleteProperty(m,key);Object.assign(m,trial);}
    }
    return remember(s,id,proposal?(change?proposal.alternative:proposal.original):a);
  };
  const receive=(s:Parameters<Policy>[0])=>{
    if(!observe||!point)return;const v=viewFor(s,selected);resources.aliveAtEnd=v.me.alive;resources.manaAtEnd=v.me.mana;
    for(const e of eventsFor(s,selected,lastOwnSeq))if(e.kind==='turn'&&e.vis.to==='players'&&e.vis.ids.includes(selected)){
      const r={at:e.at,turn:Number(e.data!.turn),gain:Number(e.data!.gain),allies:Number(e.data!.allies),trueName:e.data!.trueName===true,gem:Number(e.data!.gem)};
      resources.turnReceipts.push(r);resources.turns++;resources.trueNameTurns+=Number(r.trueName);resources.trueNameBonusGross+=r.trueName?10:0;
      resources.incomingAllyManaGross+=10*r.allies;resources.turnGainGross+=r.gain;
    }
    for(const e of eventsFor(s,selected,lastOwnSeq))if(e.vis.to==='players'&&e.vis.ids.includes(selected))for(const fact of e.facts??[]){
      if(fact.player===point.original.target&&fact.character===point.before.targetName){
        resources.reportedFactReceipts.push({at:e.at,seq:e.seq,kind:e.kind,player:fact.player,character:fact.character});resources.firstExactReportedFactAt??=e.at;
      }
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
      actions.push({at:pending.view.elapsedMs,action:a,accepted:result.ok,error:result.ok?null:result.error??'거절',beforeMana:pending.view.me.mana,afterMana:after,beforeGem:pending.view.me.gem,afterGem:viewFor(s,id).me.gem,maxMana:pending.view.me.maxMana,nominalMana:cost,attackFailure});
      if(a.type==='skill'){
        const b=resources.skills[a.skill]??={accepted:0,rejected:0,nominalMana:0,netManaDelta:0};
        if(result.ok){b.accepted++;b.nominalMana+=cost;b.netManaDelta+=after-pending.view.me.mana;resources.acceptedSkills++;resources.acceptedSkillMana+=cost;}
        else{b.rejected++;resources.rejectedSkills++;}resources.attackFailures+=Number(attackFailure);
        if(result.ok&&a.skill==='publish')resources.publishManaNet+=after-pending.view.me.mana;
        if(result.ok&&a.skill==='ally'){
          resources.allyManaNet+=pending.view.me.mana-after;
        }
        if(result.ok&&a.skill===point.original.skill&&a.target===point.original.target&&resources.firstSameCheckAt===null){resources.firstSameCheckAt=pending.view.elapsedMs;resources.firstSameCheckDelayMs=pending.view.elapsedMs-point.at;}
        if(diagnosticHash(a)===diagnosticHash(point.executed)&&pending.view.elapsedMs===point.at){point.accepted=result.ok;point.error=result.ok?null:result.error??'거절';}
      }pending=undefined;
    }receive(s);
  },{current:(s,id,m)=>remember(s,id,botCommunicationAction(s,id,m))},s=>{
    if(!observe||!point)return;receive(s);const v=viewFor(s,selected);if(!v.me.alive)return;
    resources.aliveMs+=settings.tickMs;if(v.me.trueName)resources.trueNameMs+=settings.tickMs;if(v.me.gem===3)resources.reachedGem3=true;
  });
  return {game,point:point as Point|null,resources,safety,actions,forcedChanges:Number(change&&used)};
}

