import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {modeTable,LIDELLUT_ORDER,fill} from './helpers.js';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';

function uncertain(){
 const t=modeTable('lidellut',LIDELLUT_ORDER),id=t.id.supra!,m=createBotMemory(1);
 t.tick(13*60_000);fill(t,'supra');t.p('supra').skills=t.p('supra').skills.filter(s=>s.key==='advanced_attack');
 for(const p of t.state.players)if(!['kai','kaspa','supra'].includes(p.character)){t.state.revealed[p.id]=p.character;p.alive=false;}
 t.p('arin').alive=false;
 t.p('kai').effects.push({id:999,kind:'invulnerable',source:'test',until:t.now+999999,announced:true});
 t.p('kaspa').published='kai';botKnowledge(t.state,id,undefined,m);
 const expected={type:'skill' as const,skill:'advanced_attack',target:t.id.kaspa,name:'kai'};
 let seed=0;
 for(let s=1;s<=200;s++){const trial=structuredClone(m);trial.rng=s;if(JSON.stringify(smartBotAction(t.state,id,trial,{activity:1}))===JSON.stringify(expected)){seed=s;break;}}
 expect(seed).toBeGreaterThan(0);m.rng=seed;
 return {t,id,m,seed,expected};
}
function warned(){
 const x=uncertain(),{t,m,id,expected}=x;
 const first=t.act('supra',expected);expect(first.ok).toBe(true);expect(first.events.some(e=>e.kind==='attack.fail.warn')).toBe(true);
 t.tick(61000);fill(t,'supra');botKnowledge(t.state,id,undefined,m);m.rng=x.seed;return x;
}
describe('경고 뒤 동일한 치명적 추측 재시도 보류 실험',()=>{
 it('첫 경고 이전은 동일하고 실제 경고 뒤만 보류하며 실패를 정체 배제 facts로 바꾸지 않는다',()=>{
  const first=uncertain();expect(smartBotAction(first.t.state,first.id,structuredClone(first.m),{activity:1,avoidRepeatedFailedGuess:true})).toEqual(first.expected);
  const {t,id,m,expected}=warned(),control=structuredClone(m),candidate=structuredClone(m);
  expect(smartBotAction(t.state,id,control,{activity:1})).toEqual(expected);
  expect(smartBotAction(t.state,id,candidate,{activity:1,avoidRepeatedFailedGuess:true})).toBeNull();
  expect(candidate).toEqual(control);const k=botKnowledge(t.state,id,undefined,candidate);expect(k.known.has(t.id.kaspa!)).toBe(false);expect(k.candidates.get(t.id.kaspa!)).toContain('kai');
  const fatal=t.act('supra',expected);expect(fatal.events.some(e=>e.kind==='attack.fail.death')).toBe(true);
 });
 it('같은 실패 뒤 실제 자기 보석 확인으로 확정한 적 공격은 허용한다',()=>{
  const {t,id,m}=warned();t.p('supra').gem=2;
  expect(t.skill('supra','truth_gem','kaspa').ok).toBe(true);botKnowledge(t.state,id,undefined,m);
  expect(smartBotAction(t.state,id,m,{activity:1,avoidRepeatedFailedGuess:true})).toEqual({type:'skill',skill:'advanced_attack',target:t.id.kaspa,name:'kaspa'});
 });
 it('자기 뷰가 같은 다른 봇의 숨은 배정·마나 변경에는 같은 보류와 자기 기억을 유지한다',()=>{
  const {t,id,m}=warned(),other=structuredClone(t.state),a=other.players.find(p=>p.id===t.id.kai)!,b=other.players.find(p=>p.id===t.id.kaspa)!;
  [a.character,b.character]=[b.character,a.character];a.mana=0;b.mana=149;expect(viewFor(other,id)).toEqual(viewFor(t.state,id));
  const left=structuredClone(m),right=structuredClone(m);
  expect(smartBotAction(t.state,id,left,{activity:1,avoidRepeatedFailedGuess:true})).toBeNull();
  expect(smartBotAction(other,id,right,{activity:1,avoidRepeatedFailedGuess:true})).toBeNull();expect(left).toEqual(right);
 });
 it('실패 재현 fixture에서 관측ON/OFF가 경기 결과와 통계를 바꾸지 않고 자기 영수증으로 보류를 증명한다',()=>{
  const f={mode:'lidellut' as const,seed:142028,count:11,reversed:false,currentSide:2 as const};
  const on=playCommitmentMatch(f,'skill-aware-bluff','avoidRepeatedFailedGuess'),off=playCommitmentMatch(f,'skill-aware-bluff','avoidRepeatedFailedGuess',DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);expect(on.blockedGuesses.length).toBeGreaterThan(0);
  for(const b of on.blockedGuesses){expect(b.level).toBe(2);expect(b.knownName).toBeNull();expect(b.ownMemoryEqual&&b.ownRngEqual).toBe(true);expect(b.failureEvent.vis).toEqual({to:'players',ids:[b.player]});}
 });
});
