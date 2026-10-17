import {createHash} from 'node:crypto';
import {smartBotAction,botCommunicationAction,eventsFor,viewFor,type Action,type PlayerView} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Settings,type Policy} from './league-runner.js';

export const claimCell=(v:Pick<PlayerView,'me'|'nextTurnInMs'>)=>
  `C${Number(v.me.commander)}G${Number(v.me.gem<3)}T${Number(v.nextTurnInMs<=43_000)}`;

/** 의사결정 경계: 자기 뷰와 자기 정책 제안만 입력한다. 원래 기억/RNG는 수정하지 않는다. */
export function firstFalseClaimProposal(view:PlayerView,action:Action|null,used:boolean){
  if(used||view.phase!=='running'||!view.me.alive||action?.type!=='skill'||action.skill!=='publish'||
    !action.name||action.name===view.me.character||view.me.skills.some(s=>s.key==='disguise'))return null;
  const skill=view.me.skills.find(s=>s.key==='publish'&&!s.passive&&s.blocked===null);
  if(!skill?.nameOptions?.includes(view.me.character)||!skill.nameOptions.includes(action.name))return null;
  return {cell:claimCell(view),before:{character:view.me.character,commander:view.me.commander,side:view.me.side,gem:view.me.gem,
    mana:view.me.mana,nextTurnInMs:view.nextTurnInMs,published:view.me.published,hasDisguise:false},
    original:{...action},truthful:{...action,name:view.me.character}};
}

/** 평가 출력만 위한 해시. 이 값은 정책/특징/다른 봇에 전달하지 않는다. */
export const diagnosticHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value,(_k,x)=>
  x instanceof Map?{kind:'Map',values:[...x]}:x instanceof Set?{kind:'Set',values:[...x]}:x)).digest('hex');

export function playClaimIntervention(fixture:Fixture,style:ClaimStyle,change:boolean,settings:Settings=DEFAULT_SETTINGS,selected='p1'){
  type Proposal=NonNullable<ReturnType<typeof firstFalseClaimProposal>>;
  type Point=Proposal&{at:number;player:string;executed:Action;stateHash:string;memoryHash:string;viewHash:string;accepted:boolean|null;error:string|null};
  let point:Point|null=null,used=false,pending:{action:Action;view:PlayerView}|undefined,lastOwnSeq=0;
  const resources={aliveMs:0,trueNameMs:0,reachedGem3:false,firstGem3At:null as number|null,
    turns:0,trueNameTurns:0,trueNameBonusGross:0,incomingAllyManaGross:0,turnGainGross:0,
    acceptedSkillMana:0,acceptedSkills:0,rejectedSkills:0,attackFailures:0,
    aliveAtEnd:null as boolean|null,manaAtEnd:null as number|null,
    turnReceipts:[] as Array<{at:number;turn:number;gain:number;allies:number;trueName:boolean;gem:number}>,
    skills:{} as Record<string,{accepted:number;rejected:number;nominalMana:number}>};
  const safety={wrongAllies:0,falseReports:0};
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'
    ?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
  const current:Policy=(s,id,m,o)=>{
    const a=smartBotAction(s,id,m,{activity:o.activity});
    if(id!==selected)return a;
    const v=viewFor(s,id),proposal=firstFalseClaimProposal(v,a,used);
    if(proposal){
      // 선택은 이미 자기 뷰에서 끝났다. 전체 상태 해시는 대응 실행 검증에만 사용한다.
      point={...proposal,at:v.elapsedMs,player:id,executed:change?proposal.truthful:proposal.original,stateHash:diagnosticHash(s),memoryHash:diagnosticHash(m),viewHash:diagnosticHash(v),accepted:null,error:null};
      used=true;lastOwnSeq=s.seq;
    }
    const chosen=proposal&&change?proposal.truthful:a;
    if(chosen)pending={action:chosen,view:v};return chosen;
  };
  const receive=(s:Parameters<Policy>[0])=>{
    if(!point)return;
    const own=viewFor(s,selected);resources.aliveAtEnd=own.me.alive;resources.manaAtEnd=own.me.mana;
    for(const e of eventsFor(s,selected,lastOwnSeq))if(e.kind==='turn'&&e.vis.to==='players'&&e.vis.ids.includes(selected)){
      const receipt={at:e.at,turn:Number(e.data!.turn),gain:Number(e.data!.gain),allies:Number(e.data!.allies),trueName:e.data!.trueName===true,gem:Number(e.data!.gem)};
      resources.turnReceipts.push(receipt);resources.turns++;resources.trueNameTurns+=Number(receipt.trueName);
      resources.trueNameBonusGross+=receipt.trueName?10:0;resources.incomingAllyManaGross+=10*receipt.allies;resources.turnGainGross+=receipt.gain;
    }
    lastOwnSeq=s.seq;
  };
  const game=playMatch(fixture,{current,reference},settings,(s,id,a,result)=>{
    const self=s.players.find(p=>p.id===id)!;
    // 정답 비교는 외부 채점 전용이며 정책의 입력/기억에는 전달하지 않는다.
    if(self.side===fixture.currentSide&&result.ok){
      if(a.type==='skill'&&a.skill==='ally'&&s.players.find(p=>p.id===a.target)?.side!==self.side)safety.wrongAllies++;
      if(a.type==='chat'&&a.text.startsWith('확인 정보: ')){
        const match=/^확인 정보: \[(\d+)\] (.+)$/.exec(a.text),target=s.players.find(p=>p.seat===Number(match?.[1]));
        if(!target||viewFor(s,id).roster.find(r=>r.key===target.character)?.name!==match?.[2])safety.falseReports++;
      }
    }
    if(!point)return;
    if(id===selected&&a.type==='skill'&&pending?.action===a){
      const skill=resources.skills[a.skill]??={accepted:0,rejected:0,nominalMana:0};
      if(result.ok){const cost=pending.view.me.skills.find(x=>x.key===a.skill)?.mana??0;skill.accepted++;skill.nominalMana+=cost;resources.acceptedSkills++;resources.acceptedSkillMana+=cost;}
      else{skill.rejected++;resources.rejectedSkills++;}
      if(a.skill==='publish'&&s.now-s.startedAt===point.at&&point.accepted===null){point.accepted=result.ok;point.error=result.ok?null:result.error??'알 수 없는 거절';}
      resources.attackFailures+=Number(result.events.some(e=>e.kind==='attack.fail.self'));
      pending=undefined;
    }
    receive(s);
  },{current:(s,id,m)=>botCommunicationAction(s,id,m)},s=>{
    if(!point)return;receive(s);
    const v=viewFor(s,selected);if(!v.me.alive)return;
    resources.aliveMs+=settings.tickMs;if(v.me.trueName)resources.trueNameMs+=settings.tickMs;
    if(v.me.gem===3){resources.reachedGem3=true;resources.firstGem3At??=v.elapsedMs;}
  });
  // 처음부터 완성 보석이었던 경우와 이후 완성한 경우를 구분한다.
  // 종료의 전원 정체 공개는 특징이나 보석 성장 관측으로 사용하지 않는다.
  const finalPoint=point as Point|null;
  if(finalPoint){
    if(finalPoint.before.gem===3){resources.reachedGem3=true;resources.firstGem3At=finalPoint.at;}
  }
  return {game,point:finalPoint,resources,safety,forcedChanges:Number(change&&finalPoint!==null)};
}
