// 평가 관측 전용. 자기 뷰/수신 이벤트 집계는 정책으로 전달하지 않는다.
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,botKnowledge,eventsFor,viewFor,type Action,type BotMemory,type GameEvent,type PlayerView} from '../src/index.js';
import {claimTurnCommitted} from '../src/bot-claim-commitment.js';
import {PUBLISH_MANA} from '../src/constants.js';
import {idleClaimViewEligible} from '../src/bot-idle-claim.js';
import {nextRandom} from '../src/rng.js';
import {forecastAttackBudget} from '../src/bot-attack-budget.js';
import {trustedIntel,verifyIntel} from '../src/bot-intel.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {smartBotAction as priorPR} from './baselines/pre-round024.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';
export type CommitmentVariant='avoidRepeatedFailedGuess'|'baseline'|'control'|'commitment'|'idleClaimMana'|'forecastAttackBudget'|'deadAllyReport'|'enemyBreakRepair'|'netAttackReserve'|'urgentDispelBeforeAlly'|'directCheckFollowup';
export function playCommitmentMatch(fixture:Fixture,style:ClaimStyle,variant:CommitmentVariant,settings:Settings=DEFAULT_SETTINGS,observe=true,legacyControl=false){
  const options=variant==='avoidRepeatedFailedGuess'?{avoidRepeatedFailedGuess:true}:variant==='directCheckFollowup'?{directCheckFollowup:true}:variant==='urgentDispelBeforeAlly'?{urgentDispelBeforeAlly:true}:variant==='netAttackReserve'?{netAttackReserve:true}:variant==='commitment'?{claimTurnCommitment:true}:variant==='idleClaimMana'?{idleClaimMana:true}:variant==='forecastAttackBudget'?{forecastAttackBudget:true}:variant==='deadAllyReport'?{verifyDeadAllyReports:true}:{};
  const resources={aliveMs:0,trueNameMs:0,turns:0,trueNameTurns:0,trueNameBonusGross:0,incomingAllyManaGross:0,turnGainGross:0,
    publishes:0,truePublishes:0,falsePublishes:0,publishManaGross:0,publishManaNet:0,reaffirmations:0,reaffirmManaNet:0,allies:0,allyManaNet:0,
    acceptedSkillMana:0,attackFailures:0,holdingMs:0,holdStarts:0,holdingTrueNameTurns:0,gemCompletedPlayers:0,
    skills:{} as Record<string,{accepted:number;rejected:number;nominalMana:number;netManaDelta:number;whileHolding:number}>};
  const safety={wrongFollowups:0,wrongBreaks:0,wrongAllies:0,falseReports:0,holdingFalsePublishes:0};
  const turns:Array<{player:string;at:number;turn:number;gain:number;allies:number;trueName:boolean;gem:number;holding:boolean}>=[];
  const holds:Array<{player:string;character:string;at:number;publishedAt:number;until:number;nextTurnInMs:number;trueName:boolean;hasDisguise:boolean}>=[];
  type Proof={originalNull:boolean;ownMemoryEqual:boolean;ownRngEqual:boolean};
  const budgets:Array<{player:string;at:number;mana:number;maxMana:number;nextTurnInMs:number;preview:number;
    plan:NonNullable<ReturnType<typeof forecastAttackBudget>>;knownTarget:string;ownSide:number;targetSide:number;
    skillPassive:boolean;skillUsesLeft:number|null;legalName:boolean;selfIncapacitated:boolean;targetProtected:boolean;
    guards:string[];observedDead:string[];originalAction:Action|null;originalCost:number;chosenAction:Action|null;chosenCost:number;
    removedSkills:string[];originalWouldBreakForecast:boolean;changed:boolean}>=[];
  const deadReports:Array<{player:string;at:number;ownSide:number;target:string;name:string;targetKnown:boolean;senders:Array<{id:string;name:string;side:number;alive:boolean;revealed:string|null;reportAt:number}>;originalAction:Action|null;chosenAction:Action;changed:boolean;nominalMana:number}>=[];
  const actions:Array<{player:string;at:number;action:Action;accepted:boolean;error:string|null;beforeMana:number;afterMana:number;maxMana:number;nominalMana:number;holding:boolean;beforeTrueName:boolean;beforePublished:string|null;manualSameName:boolean;activeDecision:boolean;reaffirmationProof:Proof|null;character:string;side:number;
    grading:{breakTargetSide:number|null;breakTargetName:string|null;breakKnownName:string|null;allyTargetSide:number|null;report:boolean;reportExpectedName:string|null}}>=[];
  const checkReactions:Array<{player:string;at:number;receivedAt:number;seq:number;target:string;name:string;ownSide:number;knownName:string;knownSide:number;
    inactiveDraw:number;activity:number;originalAction:Action|null;chosenAction:Action;event:GameEvent;actualTargetName:string|null;actualTargetSide:number|null}>=[];
  const rescues:Array<{player:string;at:number;ownSide:number;target:string;knownName:string;knownSide:number;
    beforeStatuses:string[];originalAction:Action|null;chosenAction:Action;changed:boolean;accepted:boolean|null;afterStatuses:string[]|null}>=[];
  const blockedGuesses:Array<{player:string;at:number;originalAction:Action;chosenAction:null;knownName:null;candidates:string[];
    level:number;previousFailureAt:number;failureEvent:GameEvent;skillCost:number;skillBlocked:string|null;ownMemoryEqual:boolean;ownRngEqual:boolean}>=[];
  const ownIds=new Set<string>(),seq=new Map<string,number>(),until=new Map<string,number>(),holdingCharacter=new Map<string,string>(),seenHolds=new Set<string>(),completed=new Set<string>();
  const pending=new Map<string,{action:Action;view:PlayerView;holding:boolean;manualSameName:boolean;activeDecision:boolean;proof:Proof|null;breakKnownName:string|null}>();
  const note=(s:Parameters<Policy>[0],id:string,m:BotMemory)=>{
    if(!observe)return;ownIds.add(id);const v=viewFor(s,id),c=m.perception?.claimCommitment,h=claimTurnCommitted(v,m);
    until.set(id,h?c!.until:0);
    if(h)holdingCharacter.set(id,v.me.character);else holdingCharacter.delete(id);
    if(h){const key=`${id}/${c!.publishedAt}/${c!.until}`;if(!seenHolds.has(key)){
      seenHolds.add(key);resources.holdStarts++;holds.push({player:id,character:v.me.character,at:v.elapsedMs,publishedAt:c!.publishedAt!,until:c!.until,
        nextTurnInMs:v.nextTurnInMs,trueName:v.me.trueName,hasDisguise:v.me.skills.some(x=>x.key==='disguise')});
    }}
  };
  const remember=(s:Parameters<Policy>[0],id:string,a:Action|null,m:BotMemory,proof:Proof|null=null)=>{
    note(s,id,m);if(observe&&a){const view=viewFor(s,id);pending.set(id,{action:a,view,holding:claimTurnCommitted(view,m),
      manualSameName:m.perception?.manualClaims.get(id)?.name===view.me.published&&!m.perception?.automaticClaims.has(id),activeDecision:m.communicationAt===view.elapsedMs,proof,breakKnownName:a.type==='skill'&&a.skill==='break_ally'&&a.target?botKnowledge(s,id,view,structuredClone(m)).known.get(a.target)??null:null});}return a;
  };
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'
    ?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
  const current:Policy=(s,id,m,o)=>{
    // 복제는 해당 호출의 자기 기억뿐이다. 가상 결과는 검증 출력에만 쓰고 실제 행동을 고르지 않는다.
    const original=observe&&variant==='idleClaimMana'&&nextRandom({rng:m.rng})<=(o.activity??.5)&&idleClaimViewEligible(viewFor(s,id))?structuredClone(m):undefined;
    const deadOriginal=observe&&variant==='deadAllyReport'&&nextRandom({rng:m.rng})<=(o.activity??.5)?structuredClone(m):undefined;
    const budgetOriginal=observe&&variant==='forecastAttackBudget'&&nextRandom({rng:m.rng})<=(o.activity??.5)?structuredClone(m):undefined;
    const followup=observe&&variant==='directCheckFollowup'&&m.perception?.directCheckReaction?{reaction:{...m.perception.directCheckReaction},memory:structuredClone(m)}:undefined;
    const rescueOriginal=observe&&variant==='urgentDispelBeforeAlly'&&nextRandom({rng:m.rng})<=(o.activity??.5)?structuredClone(m):undefined;
    const guessOriginal=observe&&variant==='avoidRepeatedFailedGuess'&&nextRandom({rng:m.rng})<=(o.activity??.5)?structuredClone(m):undefined;
    const a=variant==='baseline'?previous(s,id,m,{activity:o.activity}):variant==='control'&&legacyControl?priorPR(s,id,m,{activity:o.activity}):smartBotAction(s,id,m,{...o,...options});let proof:Proof|null=null;
    if(guessOriginal&&a===null){
      const originalAction=smartBotAction(s,id,guessOriginal,{...o,avoidRepeatedFailedGuess:false});
      if(originalAction?.type==='skill'&&originalAction.skill==='advanced_attack'&&originalAction.target&&originalAction.name){
        const v=viewFor(s,id),k=botKnowledge(s,id,v,structuredClone(m)),skill=v.me.skills.find(z=>z.key==='advanced_attack')!,
          previousFailureAt=m.perception!.lastAttackNameFailure.get(originalAction.target)?.get(originalAction.name),
          failureEvent=eventsFor(s,id).find(e=>e.kind==='attack.fail.self'&&e.at===previousFailureAt&&e.data?.target===originalAction.target&&e.data?.name===originalAction.name);
        if(k.known.has(originalAction.target)||previousFailureAt===undefined||!failureEvent||skill.level<=1)throw Error('반복 추측 보류 자기 증거 누락');
        blockedGuesses.push({player:id,at:v.elapsedMs,originalAction,chosenAction:null,knownName:null,candidates:k.candidates.get(originalAction.target)??[],level:skill.level,
          previousFailureAt,failureEvent,skillCost:skill.mana,skillBlocked:skill.blocked,ownMemoryEqual:isDeepStrictEqual(guessOriginal,m),ownRngEqual:guessOriginal.rng===m.rng});
      }
    }
    if(followup&&a?.type==='skill'&&NAME_ATTACKS.includes(a.skill)&&a.target===followup.reaction.target&&a.name===followup.reaction.name&&
      nextRandom({rng:followup.memory.rng})>(o.activity??.5)&&s.now-s.startedAt-followup.reaction.at>=1000){
      const v=viewFor(s,id),inactiveDraw=nextRandom({rng:followup.memory.rng}),originalAction=smartBotAction(s,id,followup.memory,{...o,directCheckFollowup:false});
      checkReactions.push({player:id,at:v.elapsedMs,receivedAt:followup.reaction.at,seq:followup.reaction.seq,target:a.target!,name:a.name!,ownSide:v.me.side,
        knownName:m.perception!.known.get(a.target!)!,knownSide:v.roster.find(r=>r.key===a.name)!.side,
        inactiveDraw,activity:o.activity??.5,originalAction,chosenAction:a,event:eventsFor(s,id).find(e=>e.seq===followup.reaction.seq)!,actualTargetName:null,actualTargetSide:null});
    }
    if(rescueOriginal&&a?.type==='skill'&&a.skill==='tachin_neutralize'&&a.target){
      const originalAction=smartBotAction(s,id,rescueOriginal,{...o,urgentDispelBeforeAlly:false});
      if(originalAction?.type==='skill'&&originalAction.skill==='ally'){
        const v=viewFor(s,id),k=botKnowledge(s,id,v,structuredClone(m)),name=k.known.get(a.target)!,target=v.players.find(p=>p.id===a.target)!;
        rescues.push({player:id,at:v.elapsedMs,ownSide:v.me.side,target:a.target,knownName:name,
          knownSide:v.roster.find(r=>r.key===name)!.side,beforeStatuses:target.statuses.map(e=>e.kind),originalAction,chosenAction:a,
          changed:!isDeepStrictEqual(originalAction,a),accepted:null,afterStatuses:null});
      }
    }
    if(deadOriginal&&a?.type==='skill'&&a.target&&m.communicationAt===s.now-s.startedAt){
      const v=viewFor(s,id),k=botKnowledge(s,id,v,structuredClone(m)),name=trustedIntel(v,k,m,true).get(a.target);
      const usable=new Map(v.me.skills.filter(x=>!x.passive&&x.blocked===null).map(x=>[x.key,x]));
      if(name&&!trustedIntel(v,k,m).has(a.target)&&isDeepStrictEqual(verifyIntel(v,k,m,usable,true),a)){
        const senders=[...(m.perception?.intel?.reports.get(a.target)??[])].flatMap(([sender,r])=>{
          const p=v.players.find(x=>x.id===sender),role=k.known.get(sender),def=v.roster.find(x=>x.key===role);
          return p&&!p.alive&&p.revealed===role&&def?.side===v.me.side&&r.character===name?[{id:sender,name:role!,side:def.side,alive:p.alive,revealed:p.revealed,reportAt:r.at}]:[];
        });
        const originalAction=smartBotAction(s,id,deadOriginal,{...o,verifyDeadAllyReports:false});
        deadReports.push({player:id,at:v.elapsedMs,ownSide:v.me.side,target:a.target,name,targetKnown:k.known.has(a.target),senders,
          originalAction,chosenAction:a,changed:!isDeepStrictEqual(originalAction,a),nominalMana:usable.get(a.skill)!.mana});
      }
    }
    if(budgetOriginal&&m.communicationAt===s.now-s.startedAt){
      const v=viewFor(s,id),k=botKnowledge(s,id,v,structuredClone(m)),plan=forecastAttackBudget(v,k);
      if(plan){
        const alternative=smartBotAction(s,id,budgetOriginal,{...o,forecastAttackBudget:false}),skill=v.me.skills.find(x=>x.key===plan.skill)!;
        const removedSkills=v.me.skills.filter(x=>!x.passive&&x.blocked===null&&!NAME_ATTACKS.includes(x.key)&&x.key!=='break_ally'&&x.mana>v.me.mana-plan.manaToKeep).map(x=>x.key);
        const cost=(x:Action|null)=>x?.type==='skill'?v.me.skills.find(z=>z.key===x.skill)?.mana??0:0;
        const guards=({civil_war:{kai:['arin'],dantes:['kelhu']},lidellut:{kai:['arin']},troll:{chis:['satoshi','zwinra']}} as Record<string,Record<string,string[]>>)[v.mode]?.[plan.name]??[];
        budgets.push({player:id,at:v.elapsedMs,mana:v.me.mana,maxMana:v.me.maxMana,nextTurnInMs:v.nextTurnInMs,preview:v.me.nextTurnManaPreview,plan,
          knownTarget:k.known.get(plan.target)!,ownSide:v.me.side,targetSide:v.roster.find(r=>r.key===plan.name)!.side,
          skillPassive:skill.passive,skillUsesLeft:skill.usesLeft,legalName:skill.nameOptions?.includes(plan.name)??false,
          selfIncapacitated:v.me.effects.some(e=>e.kind==='incapacitated'),targetProtected:v.players.find(p=>p.id===plan.target)!.statuses.some(e=>e.kind==='invulnerable'),
          guards,observedDead:v.players.filter(p=>!p.alive&&p.revealed).map(p=>p.revealed!),originalAction:alternative,originalCost:cost(alternative),chosenAction:a,chosenCost:cost(a),removedSkills,
          originalWouldBreakForecast:alternative?.type==='skill'&&removedSkills.includes(alternative.skill),changed:!isDeepStrictEqual(alternative,a)});
      }
    }
    if(observe&&variant==='idleClaimMana'&&a?.type==='skill'&&a.skill==='publish'&&a.name===viewFor(s,id).me.published){
      if(!original)throw Error('재공표 전 자기 기억 복제 누락');
      const alternative=smartBotAction(s,id,original,{...o,idleClaimMana:false});
      proof={originalNull:alternative===null,ownMemoryEqual:isDeepStrictEqual(original,m),ownRngEqual:original.rng===m.rng};
      if(!proof.originalNull||!proof.ownMemoryEqual||!proof.ownRngEqual)throw Error('기존 null/자기 기억/RNG 대응 검증 실패');
    }
    return remember(s,id,a,m,proof);
  };
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
    const target=a.type==='skill'&&a.skill==='break_ally'&&result.ok?s.players.find(x=>x.id===a.target):undefined;
    const grading={breakTargetSide:target?.side??null,breakTargetName:target?.character??null,breakKnownName:p.breakKnownName,allyTargetSide:a.type==='skill'&&a.skill==='ally'&&result.ok?s.players.find(x=>x.id===a.target)?.side??null:null,report:false,reportExpectedName:null as string|null};
    if(result.ok&&a.type==='chat'&&a.text.startsWith('확인 정보: ')){
      grading.report=true;const match=/^확인 정보: \[(\d+)\] (.+)$/.exec(a.text),target=s.players.find(x=>x.seat===Number(match?.[1]));
      grading.reportExpectedName=p.view.roster.find(x=>x.key===target?.character)?.name??null;
      safety.falseReports+=Number(!match||grading.reportExpectedName!==match[2]);
    }
    const reaction=checkReactions.find(z=>z.player===id&&z.at===p.view.elapsedMs&&isDeepStrictEqual(z.chosenAction,a));
    if(reaction){const target=s.players.find(p=>p.id===reaction.target)!;reaction.actualTargetName=target.character;reaction.actualTargetSide=target.side;
      safety.wrongFollowups+=Number(target.character!==reaction.name||target.side===reaction.ownSide);}
    const rescue=rescues.find(z=>z.player===id&&z.at===p.view.elapsedMs&&isDeepStrictEqual(z.chosenAction,a));
    if(rescue){rescue.accepted=result.ok;rescue.afterStatuses=after.players.find(t=>t.id===rescue.target)!.statuses.map(e=>e.kind);}
    actions.push({player:id,at:p.view.elapsedMs,action:a,accepted:result.ok,error:result.ok?null:result.error??'알 수 없는 거절',beforeMana:p.view.me.mana,
      afterMana:after.me.mana,maxMana:p.view.me.maxMana,nominalMana:nominal,holding:p.holding,beforeTrueName:p.view.me.trueName,beforePublished:p.view.me.published,
      manualSameName:p.manualSameName,activeDecision:p.activeDecision,reaffirmationProof:p.proof,character:p.view.me.character,side:p.view.me.side,grading});
    if(a.type==='skill'){
      const skill=resources.skills[a.skill]??={accepted:0,rejected:0,nominalMana:0,netManaDelta:0,whileHolding:0};
      if(result.ok){skill.accepted++;skill.nominalMana+=nominal;skill.netManaDelta+=after.me.mana-p.view.me.mana;skill.whileHolding+=Number(p.holding);resources.acceptedSkillMana+=nominal;}
      else skill.rejected++;
      resources.attackFailures+=Number(result.events.some(e=>e.kind==='attack.fail.self'));
      if(result.ok&&a.skill==='publish'){
        const truthful=a.name===p.view.me.character;resources.publishes++;resources.truePublishes+=Number(truthful);resources.falsePublishes+=Number(!truthful);
        resources.publishManaGross+=PUBLISH_MANA;resources.publishManaNet+=after.me.mana-p.view.me.mana;
        if(a.name===p.view.me.published){resources.reaffirmations++;resources.reaffirmManaNet+=after.me.mana-p.view.me.mana;}
        safety.holdingFalsePublishes+=Number(p.holding&&!truthful);
      }
      if(result.ok&&a.skill==='break_ally')safety.wrongBreaks+=Number(grading.breakTargetSide===null||grading.breakTargetSide===p.view.me.side||!grading.breakKnownName||grading.breakKnownName!==grading.breakTargetName);
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
  return {game,resources,safety,turns,holds,actions,budgets,deadReports,rescues,checkReactions,blockedGuesses};
}
