import {afterEach,describe,expect,it,vi} from 'vitest';
import {Room} from '../src/rooms.js';
import {loadConfig} from '../src/config.js';
import type {ServerMessage} from '@gst/protocol';
function setup(mode: 'civil_war'|'primordial'|'lidellut'|'troll'='civil_war') {
 const inbox:ServerMessage[]=[]; const room=new Room(loadConfig({}), '원탁',mode,'host',90,()=>{},()=>Date.now());room.configure(8);
 room.join('host','방장','auth-host',{send:m=>inbox.push(m)});
 room.join('guest','참가자','auth-guest',{send:()=>{}});
 for(let slot=2;slot<8;slot++)expect(room.setSlot('host',slot,'ai')).toBeNull();
 return {room,inbox};
}
afterEach(()=>vi.useRealTimers());
describe('카드 UI 방 생명주기',()=>{
 it('호스트 권한·슬롯·준비 검증과 준비 취소 시 카운트다운 취소',()=>{
  const {room}=setup();expect(room.setSlot('guest',3,'player')).not.toBeNull();expect(room.setSlot('host',1,'ai')).not.toBeNull();
  expect(room.requestStart('host')).not.toBeNull();room.ready('host',true);room.ready('guest',true);
  expect(room.requestStart('guest')).not.toBeNull();expect(room.requestStart('host')).toBeNull();expect(room.stage).toBe('countdown');
  room.ready('guest',false);expect(room.stage).toBe('waiting');expect(room.countdownEndsAt).toBe(0);
  expect(room.addBots('host',1)).not.toBeNull();
 });
 it.each(['civil_war','primordial','lidellut','troll'] as const)('%s: 5초→배분 1회→정지된 채팅→5초→전투',mode=>{
  vi.useFakeTimers();vi.setSystemTime(100000);const {room,inbox}=setup(mode);
  room.ready('host',true);room.ready('guest',true);room.requestStart('host');
  vi.setSystemTime(104999);room.tick(Date.now());expect(room.stage).toBe('countdown');expect(room.state).toBeNull();
  vi.setSystemTime(105000);room.tick(Date.now());expect(room.stage).toBe('assignment');
  expect(room.assign('guest',Date.now())).not.toBeNull();expect(room.assign('host',Date.now())).toBeNull();
  expect(room.assign('host',Date.now())).not.toBeNull();expect(room.stage).toBe('briefing');
  const before=JSON.stringify(room.state);vi.setSystemTime(180000);room.tick(Date.now());expect(JSON.stringify(room.state)).toBe(before);
  expect(room.say('guest','안녕하세요')).toBeNull();expect(room.act('host',{type:'skill',skill:'publish',name:'dantes'},Date.now()).ok).toBe(false);
  expect(room.begin('guest')).not.toBeNull();expect(room.begin('host')).toBeNull();
  vi.setSystemTime(185000);room.tick(Date.now());expect(room.stage).toBe('running');expect(room.state!.startedAt).toBe(185000);expect(room.state!.nextTurnAt).toBe(275000);
  const views=inbox.filter((m):m is Extract<ServerMessage,{type:'game'}>=>m.type==='game');
  for(const m of views){expect('spectator' in m.view).toBe(false);expect(m.view.players.every(p=>p.revealed===null)).toBe(true);expect(m.events.filter(e=>e.kind==='role')).toHaveLength(m===views[0]?1:0);}
 });
 it('인원 변경은 범위·점유 슬롯 검증, 강퇴는 준비 취소 및 통지',()=>{
  const {room}=setup();expect(room.setCapacity('host',7)).not.toBeNull();expect(room.setCapacity('guest',12)).not.toBeNull();
  expect(room.setCapacity('host',12)).toBeNull();expect(room.detail().maxPlayers).toBe(12);
  room.ready('host',true);expect(room.kick('guest','host')).not.toBeNull();expect(room.kick('host','guest')).toBeNull();expect(room.member('guest')).toBeUndefined();expect(room.member('host')!.ready).toBe(false);
 });
 it('준비 화면에서 퇴장하면 배분을 폐기하고 대기실로 복귀',()=>{
  const {room}=setup();room.stage='assignment';room.status='playing';room.assign('host',Date.now());room.leave('guest',Date.now());
  expect(room.state).toBeNull();expect(room.status).toBe('lobby');expect(room.stage).toBe('waiting');
 });
 it('종료 시 이전 비공개 로그까지 모든 참가자에게 다시 전달',()=>{
  const {room,inbox}=setup();room.stage='assignment';room.status='playing';room.assign('host',Date.now());room.state!.phase='ended';room.status='ended';room.syncGame();
  const last=inbox.at(-1)!;expect(last.type).toBe('game');if(last.type==='game')expect(last.events.filter(e=>e.kind==='role')).toHaveLength(8);
 });
 it('도중 퇴장 계정도 최종 전적의 계정 연결 유지',()=>{
  const {room}=setup();room.stage='assignment';room.status='playing';room.assign('host',Date.now());room.stage='running';room.leave('guest',Date.now());expect(room.authIds().guest).toBe('auth-guest');
 });
 it('짧은 간격의 행동이 이어져도 초 단위 복기 시점이 누적된다',()=>{
  const {room}=setup();room.stage='assignment';room.status='playing';room.assign('host',100000);room.stage='running';
  const state=room.state!;
  for(let elapsed=100;elapsed<=3100;elapsed+=100){
   state.now=state.startedAt+elapsed;
   // A state change every 100ms must not keep replacing one frame forever.
   (room as unknown as {afterChange():void}).afterChange();
  }
  expect(room.replayFrames.map(f=>f.at)).toEqual([0,900,1900,2900,3100]);
 });

});
