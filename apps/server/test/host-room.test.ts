import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyHostInputs, decodeHostSnapshot, encodeHostSnapshot, tickHost } from '@gst/rules';
import type { ServerMessage } from '@gst/protocol';
import { Room } from '../src/rooms.js';
import { loadConfig } from '../src/config.js';

const rooms: Room[] = [];
afterEach(() => { rooms.forEach(r=>r.dispose()); rooms.length=0; vi.useRealTimers(); });
function setup() {
  const ended = vi.fn();
  const room = new Room(loadConfig({}), '호스팅', 'civil_war', 'a', 90, ended, () => 1000, 'player'); rooms.push(room);
  const a: ServerMessage[] = [], b: ServerMessage[] = [], old: ServerMessage[] = [];
  room.join('a','A',null,{send:m=>a.push(m)},true);
  room.join('old','구버전',null,{send:m=>old.push(m)},false);
  room.join('b','B',null,{send:m=>b.push(m)},true);
  expect(room.start('a',1000)).toBeNull();
  return {room,a,b,old,ended};
}
const grant = (messages: ServerMessage[]) => messages.filter((m): m is Extract<ServerMessage,{type:'host.grant'}> => m.type==='host.grant').at(-1)!;

describe('방장 계산·호스트 이전', () => {
  it('서버는 진행/AI를 계산하지 않고 비공개 체크포인트는 지정 방장에게만 전달', () => {
    const {room,a,b,old}=setup(), state=structuredClone(room.state);
    room.tick(500000);
    expect(room.state).toEqual(state);
    expect(grant(a)).toBeDefined(); expect(grant(b)).toBeUndefined(); expect(grant(old)).toBeUndefined();
    const view=b.find((m):m is Extract<ServerMessage,{type:'game'}>=>m.type==='game')!.view;
    expect('me' in view).toBe(true);
    expect(JSON.stringify(view)).not.toContain('"rng"');
  });
  it('미확정 입력 재전송·확정 후 한 번 응답·구버전 제외·이전 방장 프레임 거절', () => {
    const {room,a,b}=setup(), before=grant(a);
    expect(room.act('b',{type:'chat',channel:'all',text:'유지'},1100,7).pending).toBe(true);
    room.disconnected('a');
    const after=grant(b);
    expect(room.hostId).toBe('b'); expect(after.epoch).toBeGreaterThan(before.epoch);
    expect(after.commands).toHaveLength(1);
    expect(room.commitHost('a',before.epoch,1,before.checkpoint)).toContain('권한');
    const snapshot=decodeHostSnapshot(after.checkpoint);
    snapshot.results=[]; applyHostInputs(snapshot,after.commands,1100);
    expect(room.commitHost('b',after.epoch,1,encodeHostSnapshot(snapshot))).toBeNull();
    expect(b.filter(m=>m.type==='action.result' && m.ref===7)).toHaveLength(1);
    expect(room.commitHost('b',after.epoch,1,encodeHostSnapshot(snapshot))).toContain('순서');
    room.join('a','A',null,{send:m=>a.push(m)},true);
    expect(room.hostId).toBe('b'); expect(grant(a).epoch).toBe(before.epoch);
  });
  it('마지막 확정 상태로 복원하고 모두 끊기면 정지·복귀 후 이어감', () => {
    const {room,a,b}=setup(), first=grant(a), snapshot=decodeHostSnapshot(first.checkpoint);
    tickHost(snapshot,first.members,1250,first);
    expect(room.commitHost('a',first.epoch,1,encodeHostSnapshot(snapshot))).toBeNull();
    room.disconnected('a'); room.disconnected('b');
    const frozen=structuredClone(room.state);
    expect(room.detail().hostPaused).toBe(true); room.tick(999999); expect(room.state).toEqual(frozen);
    room.join('b','B',null,{send:m=>b.push(m)},true);
    expect(room.detail().hostPaused).toBe(false);
    expect(decodeHostSnapshot(grant(b).checkpoint).state).toEqual(frozen);
  });
  it('명시적 퇴장도 다음 방장의 입력으로 처리', () => {
    const {room,b}=setup(); room.leave('a',1100,'quit');
    const next=grant(b), snapshot=decodeHostSnapshot(next.checkpoint);
    applyHostInputs(snapshot,next.commands,1250);
    expect(snapshot.state.players.find(p=>p.id==='a')?.left).toBe(true);
    expect(room.commitHost('b',next.epoch,1,encodeHostSnapshot(snapshot))).toBeNull();
  });
  it('호스트 무응답 시 이전하고 잘못된 상태는 확정하지 않음', () => {
    vi.useFakeTimers();vi.setSystemTime(1000);
    const {room,b}=setup();vi.setSystemTime(10000);room.tick(10000);
    expect(room.hostId).toBe('b');const next=grant(b), snapshot=decodeHostSnapshot(next.checkpoint);
    const frozen=structuredClone(room.state);snapshot.state.players[0]!.effects=null as never;
    expect(room.commitHost('b',next.epoch,1,encodeHostSnapshot(snapshot))).toContain('잘못된');
    expect(room.state).toEqual(frozen);
  });
  it('AI 전용 판도 관전자의 브라우저가 계산·종료 기록은 한 번', () => {
    const messages: ServerMessage[]=[];const ended=vi.fn();
    const room=new Room(loadConfig({}), 'AI','civil_war','a',90,ended,()=>1000,'player');rooms.push(room);
    room.join('a','A',null,{send:m=>messages.push(m)},true);expect(room.start('a',1000,true)).toBeNull();
    const first=grant(messages), snapshot=decodeHostSnapshot(first.checkpoint);
    expect(first.members.find(m=>m.id==='a')?.spectator).toBe(true);
    expect(snapshot.state.players).toHaveLength(12);
    snapshot.state.phase='ended';snapshot.state.endReason='테스트';snapshot.state.winner=1;
    expect(room.commitHost('a',first.epoch,1,encodeHostSnapshot(snapshot))).toBeNull();expect(ended).toHaveBeenCalledTimes(1);
    expect(room.commitHost('a',first.epoch,2,encodeHostSnapshot(snapshot))).toContain('권한');expect(ended).toHaveBeenCalledTimes(1);
  });
});
