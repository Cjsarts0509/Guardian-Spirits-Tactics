import {describe,it,expect} from 'vitest';
import {createBotMemory,viewFor} from '../src/index.js';
import {claimCell,diagnosticHash,firstFalseClaimProposal,playClaimIntervention} from '../scripts/cooperative-claim-intervention.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {civilTable,fill,modeTable,TROLL_ORDER} from './helpers.js';

describe('자기 뷰 기반 첫 가명 공표 진명 개입',()=>{
  it('자기 뷰의3비트8셀만 사용하고 원래 제안/뷰를 바꾸지 않는다',()=>{
    const t=civilTable();fill(t,'mertz');const v=viewFor(t.state,t.id.mertz!),a={type:'skill' as const,skill:'publish',name:'kelhu'},before=structuredClone(v);
    const p=firstFalseClaimProposal(v,a,false)!;
    expect(p.original).toEqual(a);expect(p.truthful).toEqual({...a,name:'mertz'});expect(v).toEqual(before);expect(a.name).toBe('kelhu');
    const cells=new Set<string>();for(const commander of [false,true])for(const gem of [0,3] as const)for(const nextTurnInMs of [43000,43001])cells.add(claimCell({...v,me:{...v.me,commander,gem},nextTurnInMs}));
    expect(cells.size).toBe(8);
  });
  it('진명·미활동 단계·이미 개입·불가 공표는 제외한다',()=>{
    const t=civilTable(),v=viewFor(t.state,t.id.mertz!),a={type:'skill' as const,skill:'publish',name:'kelhu'};
    expect(firstFalseClaimProposal(v,a,true)).toBeNull();expect(firstFalseClaimProposal(v,{...a,name:'mertz'},false)).toBeNull();
    expect(firstFalseClaimProposal({...v,phase:'ended'},a,false)).toBeNull();expect(firstFalseClaimProposal(v,null,false)).toBeNull();
    const blocked={...v,me:{...v.me,skills:v.me.skills.map(s=>s.key==='publish'?{...s,blocked:'대기'}:s)}};
    expect(firstFalseClaimProposal(blocked,a,false)).toBeNull();
  });
  it('변장 보유 인물은 공표가 가능해도 개입하지 않는다',()=>{
    const t=modeTable('troll',TROLL_ORDER),v=viewFor(t.state,t.id.neonis!);
    expect(v.me.skills.some(s=>s.key==='disguise')).toBe(true);
    expect(firstFalseClaimProposal(v,{type:'skill',skill:'publish',name:'hachi'},false)).toBeNull();
  });
  it('남의 숨은 배정/마나 변경은 적격성·특징·대체 행동에 영향이 없다',()=>{
    const t=civilTable(),other=structuredClone(t.state),x=other.players.find(p=>p.id===t.id.arin)!,y=other.players.find(p=>p.id===t.id.kaspa)!;
    [x.character,y.character]=[y.character,x.character];x.mana=0;y.mana=1;
    const a={type:'skill' as const,skill:'publish',name:'kelhu'};
    expect(firstFalseClaimProposal(viewFor(other,t.id.mertz!),a,false)).toEqual(firstFalseClaimProposal(viewFor(t.state,t.id.mertz!),a,false));
  });
  it('실제 대응 경기의 개입 전 상태/자기 기억/뷰 해시가 같고 공표 이름만 바뀐다',()=>{
    const f={mode:'civil_war' as const,seed:5,count:12,reversed:false,currentSide:2 as const},settings={...DEFAULT_SETTINGS,activity:1,limitMs:90_000};
    const a=playClaimIntervention(f,'truthful',false,settings),b=playClaimIntervention(f,'truthful',true,settings);
    expect(a.point).not.toBeNull();expect(b.point).not.toBeNull();
    for(const key of ['at','player','cell','stateHash','memoryHash','viewHash','before','original'] as const)expect(b.point![key]).toEqual(a.point![key]);
    expect(a.point!.accepted).toBe(true);expect(b.point!.accepted).toBe(true);expect(a.forcedChanges).toBe(0);expect(b.forcedChanges).toBe(1);
    expect(a.point!.executed).toEqual(a.point!.original);expect(b.point!.executed).toEqual({...a.point!.original,name:a.point!.before.character});
  });
  it('비개입 대응 경기는 모든 결과/행동 통계/자원 관측이 정확히 같다',()=>{
    const f={mode:'civil_war' as const,seed:5,count:12,reversed:false,currentSide:1 as const},settings={...DEFAULT_SETTINGS,activity:1,limitMs:60_000};
    const a=playClaimIntervention(f,'bluff',false,settings),b=playClaimIntervention(f,'bluff',true,settings);
    expect(a.point).toBeNull();expect(b).toEqual(a);
  });
  it('자기 턴 수신 집계가 공식과 맞고 종료 정체 공개를 특징으로 쓰지 않는다',()=>{
    const f={mode:'civil_war' as const,seed:5,count:12,reversed:false,currentSide:2 as const};
    const r=playClaimIntervention(f,'truthful',true,{...DEFAULT_SETTINGS,activity:.1,limitMs:5*60_000});
    expect(r.point).not.toBeNull();expect(r.resources.trueNameBonusGross).toBe(10*r.resources.trueNameTurns);
    expect(r.resources.turnGainGross).toBe(20*r.resources.turns+r.resources.incomingAllyManaGross+r.resources.trueNameBonusGross);
    expect(r.resources.turns).toBe(r.resources.turnReceipts.length);
    expect(r.resources.trueNameMs).toBeLessThanOrEqual(r.resources.aliveMs);
    expect(r.point!.before).not.toHaveProperty('enemyAssignments');
  });
  it('검증용 기억 해시는 Map/Set까지 반영하며 원본은 바꾸지 않는다',()=>{
    const m=createBotMemory(7),before=structuredClone(m),a={m,map:new Map([['x',new Set(['y'])]])};
    expect(diagnosticHash(a)).toBe(diagnosticHash(structuredClone(a)));expect(m).toEqual(before);
    expect(diagnosticHash({...a,map:new Map([['x',new Set(['z'])]])})).not.toBe(diagnosticHash(a));
  });
});
