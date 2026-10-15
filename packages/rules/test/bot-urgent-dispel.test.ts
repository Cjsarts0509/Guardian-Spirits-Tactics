import {describe,it,expect} from 'vitest';
import {createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {modeTable,fill,PRIMORDIAL_ORDER} from './helpers.js';
function setup(){
 const t=modeTable('primordial',PRIMORDIAL_ORDER);fill(t,'tachin');
 t.p('tachin').skills=t.p('tachin').skills.filter(s=>['ally','tachin_neutralize','advanced_attack','break_ally'].includes(s.key));
 t.state.revealed[t.id.rael!]='rael';t.p('rael').effects.push({id:91,kind:'incapacitated',until:100000,source:'drakan_black_spell',announced:true});return t;
}
const options={activity:1,urgentDispelBeforeAlly:true};
describe('새 동맹 직전 확정 아군 구조 — 기본OFF',()=>{
 it('기본/명시false는 동맹,ON은 실제 해제 후 다음 판단에 동맹을 잇는다',()=>{
  const t=setup(),id=t.id.tachin!,m=createBotMemory(2),act=smartBotAction(t.state,id,m,options);
  expect(smartBotAction(t.state,id,createBotMemory(2),{activity:1})).toEqual({type:'skill',skill:'ally',target:t.id.rael});
  expect(smartBotAction(t.state,id,createBotMemory(2),{activity:1,urgentDispelBeforeAlly:false})).toEqual({type:'skill',skill:'ally',target:t.id.rael});
  expect(act).toEqual({type:'skill',skill:'tachin_neutralize',target:t.id.rael});expect(t.act('tachin',act!).ok).toBe(true);
  expect(t.p('rael').effects).toEqual([]);expect(smartBotAction(t.state,id,m,options)).toEqual({type:'skill',skill:'ally',target:t.id.rael});
 });
 it('확정 공격과 적 동맹 파기가 앞선다',()=>{
  const t=setup();t.state.revealed[t.id.sasint!]='sasint';
  expect(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options)).toEqual({type:'skill',skill:'advanced_attack',target:t.id.sasint,name:'sasint'});
  t.p('tachin').allies.push(t.id.sasint!);
  expect(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options)).toEqual({type:'skill',skill:'break_ally',target:t.id.sasint});
 });
 it('미확인 아군 공표와 확정 적은 조기 구조하지 않는다',()=>{
  const t=setup();delete t.state.revealed[t.id.rael!];t.publish('rael','rael');
  expect(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options)).not.toMatchObject({skill:'tachin_neutralize'});
  t.state.revealed[t.id.kumarin!]='kumarin';t.state.revealed[t.id.sasint!]='sasint';
  t.p('rael').effects=[];t.p('sasint').effects.push({id:92,kind:'incapacitated',until:100000,source:'eoril_flame_shackle',announced:true});
  t.p('tachin').skills=t.p('tachin').skills.filter(s=>s.key!=='advanced_attack');
  expect(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options)).toEqual({type:'skill',skill:'ally',target:t.id.kumarin});
 });
 it('보호 효과 또는 공격 예약으로 막힌 해제는 동맹을 대체하지 않는다',()=>{
  const t=setup();t.p('rael').effects.push({id:92,kind:'invulnerable',until:100000,source:'rune_protection',announced:true});
  t.state.revealed[t.id.kumarin!]='kumarin';
  expect(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options)).toEqual({type:'skill',skill:'ally',target:t.id.kumarin});
  t.p('rael').effects=t.p('rael').effects.filter(e=>e.kind!=='invulnerable');t.state.revealed[t.id.sasint!]='sasint';
  t.p('tachin').mana=50;t.p('tachin').skills.find(s=>s.key==='advanced_attack')!.cooldownUntil=t.now+10000;
  expect(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options)).not.toMatchObject({skill:'tachin_neutralize'});
 });
 it('동일 자기 뷰에서 남의 숨은 배정·마나·비수신 이벤트를 바꿔도 같은 구조다',()=>{
  const t=setup(),changed=structuredClone(t.state),a=changed.players.find(p=>p.id===t.id.kilder)!,b=changed.players.find(p=>p.id===t.id.drakan)!;
  [a.character,b.character]=[b.character,a.character];a.mana=1;b.mana=149;
  changed.log.push({seq:++changed.seq,at:0,kind:'test.private',text:'남의 정보',vis:{to:'players',ids:[a.id]},data:{character:'kilder'}});
  expect(viewFor(changed,t.id.tachin!)).toEqual(viewFor(t.state,t.id.tachin!));
  expect(smartBotAction(changed,t.id.tachin!,createBotMemory(2),options)).toEqual(smartBotAction(t.state,t.id.tachin!,createBotMemory(2),options));
 });
});
