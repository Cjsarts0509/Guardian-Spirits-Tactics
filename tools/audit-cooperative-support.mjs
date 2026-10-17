import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareMatch} from '../packages/rules/scripts/league-runner.ts';
const input=process.argv[2],out=process.argv[3],bytes=readFileSync(input),d=JSON.parse(bytes);
if(!d.complete)throw Error('Completed development only');
const manaSupport=new Set(['support','sasint_support','nukelius_chakra_magic']);
const aggregates={},cases=[];
for(const x of d.records){
 const r=x.result,initial=prepareMatch(r.game.fixture).state,roles=new Map(initial.players.map(p=>[p.id,p]));
 const a=aggregates[x.variant]??={};const b=a[x.mode]??={accepted:0,wrongTargets:0,ownManaCost:0,wrongTargetOwnManaCost:0};
 for(const t of r.actions){const act=t.action;if(!t.accepted||act.type!=='skill'||!manaSupport.has(act.skill))continue;
  const target=roles.get(act.target);if(!target)throw Error('Missing target');b.accepted++;b.ownManaCost+=t.beforeMana-t.afterMana;
  if(target.side!==t.side){b.wrongTargets++;b.wrongTargetOwnManaCost+=t.beforeMana-t.afterMana;cases.push({mode:x.mode,style:x.style,variant:x.variant,fixture:r.game.fixture,player:t.player,at:t.at,action:act,targetCharacter:target.character,targetSide:target.side,actorSide:t.side,gameWinner:r.game.winner});}
 }
}
writeFileSync(out,JSON.stringify({kind:'completed-development-post-action-support-grading',inputSHA256:createHash('sha256').update(bytes).digest('hex'),newResearchExecutions:0,policyInput:false,limitations:['Only factual target-side grading; not causal win evidence.','Initial fixture roles and sides are immutable in this engine.','No hidden target mana is inspected or returned to a policy.'],aggregates,cases},null,2)+'\n');
console.log(JSON.stringify(aggregates));
