import {describe,it,expect} from 'vitest';
import {playSelfplay} from '../scripts/selfplay-balance.js';
describe('같은 정책의 진영 균형 평가',()=>{
 it('currentSide만 바꾸면 같은 경기를 재표기할 뿐이므로 별도 표본으로 세지 않는다',()=>{
  const f={mode:'troll' as const,seed:25,count:10,reversed:false,currentSide:1 as const};
  const a=playSelfplay(f,'ownOutcome'),b=playSelfplay({...f,currentSide:2},'ownOutcome');
  expect(a.game.winner).toEqual(b.game.winner);expect(a.game.elapsedMs).toEqual(b.game.elapsedMs);expect(a.roles).toEqual(b.roles);expect(a.skills).toEqual(b.skills);
  expect(a.game.stats.current).toEqual(b.game.stats.reference);expect(a.game.stats.reference).toEqual(b.game.stats.current);
  expect(a.game.survivors.map(p=>[p.character,p.alive])).toEqual(b.game.survivors.map(p=>[p.character,p.alive]));
 });
});
