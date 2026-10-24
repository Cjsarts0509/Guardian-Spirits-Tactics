/** 061 real-engine rule audit; assignment truth is only an external outcome check. */
import {strictEqual,ok} from 'node:assert';
import {advance,eventsFor,viewFor,createBotMemory,updateBotKnowledge,createGame,applyAction} from '../src/index.js';
import {ROLES058} from './own-delayed-memory.js';
export function failureRule061(){
  return ROLES058.map(role=>{
    const players=ROLES058.map((_,i)=>({id:`u${i+1}`,nickname:`fixture${i+1}`}));
    const ids=Object.fromEntries(ROLES058.map((c,i)=>[c,players[i]!.id]));
    const s=createGame({mode:'troll',players,seed:900258,now:0,assignment:Object.fromEntries(ROLES058.map((c,i)=>[players[i]!.id,c]))}).state;
    const f={actor:ids.kanulla!,target:ids[role]!},m=createBotMemory(258);
    s.players.find(p=>p.id===f.actor)!.mana=150;
    strictEqual(applyAction(s,f.actor,{type:'skill',skill:'publish',name:'kanulla'},0).ok,true);
    const command=applyAction(s,f.actor,{type:'skill',skill:'chaos_hex',target:f.target},1000),before=viewFor(s,f.actor);
    const pre=eventsFor(s,f.actor).filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(f.actor));
    updateBotKnowledge(before,pre,m,{rememberOwnDelayedCheck:true});
    advance(s,61000);const view=viewFor(s,f.actor),events=eventsFor(s,f.actor,m.perception!.lastSeq)
      .filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(f.actor));
    const result=events.filter(e=>e.kind==='skill.chaos_hex.result');
    if(!command.ok){strictEqual(role,'kanulla');strictEqual(result.length,0);strictEqual(m.perception!.ownDelayedChecks!.records.length,0);
      return {role,target:f.target,actualSide:2,accepted:false,error:command.error,preView:before,preEvents:pre,view,events,result:null,known:[],candidates:[]};}
    strictEqual(result.length,1);
    strictEqual(result[0]!.data?.success,s.players.find(p=>p.id===f.target)!.side===2);
    const knowledge=updateBotKnowledge(view,events,m,{rememberOwnDelayedCheck:true});
    strictEqual(m.perception!.ownDelayedChecks!.records[0]!.status,result[0]!.data?.success?'succeeded':'failed');
    ok(result[0]!.vis.to==='players'&&result[0]!.vis.ids.length===1&&result[0]!.vis.ids[0]===f.actor);
    return {role,target:f.target,actualSide:s.players.find(p=>p.id===f.target)!.side,accepted:true,error:null,
      preView:before,preEvents:pre,view,events,result:result[0],known:[...knowledge.known],candidates:[...knowledge.candidates]};
  });
}
