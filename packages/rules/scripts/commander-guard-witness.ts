/** Round038 diagnostic replay; no new research matches. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deepStrictEqual,strictEqual} from 'node:assert';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor} from '../src/index.js';
import {playMatch,type Policy} from './league-runner.js';
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw Error('input.json.gz output.json');
const source=JSON.parse(gunzipSync(readFileSync(input)).toString());
const original=source.records.find((r:any)=>r.variant==='cooperative'&&r.game.fixture.mode==='primordial'&&r.game.fixture.seed===147004&&r.game.fixture.reversed);
strictEqual(original.game.fixture.count,12);const decisions:unknown[]=[];
const policy:Policy=(s,id,m,o)=>{const a=smartBotAction(s,id,m,o);if(!a)return a;const v=viewFor(s,id);if(v.me.character!=='consume')return a;
 const own=structuredClone(m),k=botKnowledge(s,id,v,own),target=v.players.find(p=>k.known.get(p.id)==='eltas'),skill=v.me.skills.find(z=>z.key==='consume_master_guard');
 if(skill&&skill.usesLeft!==0)decisions.push({at:v.elapsedMs,player:id,action:a,mana:v.me.mana,guard:skill,knownTarget:target??null});return a;};
const game=playMatch(original.game.fixture,{current:policy,reference:policy},source.settings,undefined,{current:botCommunicationAction,reference:botCommunicationAction});
deepStrictEqual(game,original.game);
const witness=(decisions as any[]).find(d=>d.at===374500);strictEqual(witness.action.skill,'ally');strictEqual(witness.action.target,witness.knownTarget.id);strictEqual(witness.guard.blocked,null);strictEqual(witness.guard.usesLeft,1);strictEqual(witness.knownTarget.alive,true);strictEqual(witness.mana>=witness.guard.mana,true);
writeFileSync(output,JSON.stringify({kind:'default-cooperative-guard-deferral-witness',policySourceRef:'2d863e946359c90caa6bffb569dad3a3bb4c9e43',researchExecutions:0,originalFullGameMatched:true,game,witness,decisions},null,2));console.log(JSON.stringify({matched:true,witnessAt:witness.at,chosen:witness.action,mana:witness.mana,guardCost:witness.guard.mana,winner:game.winner,endedAt:game.elapsedMs}));
