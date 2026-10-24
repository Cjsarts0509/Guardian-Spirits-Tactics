import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {actionDigest} from './guard-realization.js';
import {playReportedSupremeAudit} from './reported-supreme-audit.js';
import type {playGuardSelfplay} from './guard-selfplay.js';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('input and output required');
const raw=readFileSync(input),decoded=input.endsWith('.gz')?gunzipSync(raw):raw,source=JSON.parse(decoded.toString());
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
if(!source.complete||source.kind!=='identical-guard-policy-primordial'||source.executions!==320)throw Error('complete round039 corpus required');
for(const [p,h] of Object.entries(source.sourceHashes))if(hash(readFileSync('packages/rules/'+p))!==h)throw Error('source changed: '+p);
const records=[];
for(const x of source.records as ReturnType<typeof playGuardSelfplay>[]){
 const r=playReportedSupremeAudit(x.result.game.fixture,x.variant,source.settings);
 if(!isDeepStrictEqual(r.game,x.result.game))throw Error('full game mismatch');
 const expected=x.result.actions.map(a=>({player:a.player,at:a.at,action:a.action,accepted:a.accepted,error:a.error,beforeMana:a.beforeMana,afterMana:a.afterMana,nominalMana:a.nominalMana,character:a.character,side:a.side,receiptKinds:a.receiptKinds!}));
 if(!isDeepStrictEqual(r.actions,expected))throw Error('full receipt stream mismatch');
 records.push({variant:x.variant,fixture:r.game.fixture,game:r.game,gameMatched:true,actionsMatched:true,actions:r.actions.length,actionSHA256:actionDigest(r.actions),originalActionSHA256:actionDigest(expected),decisions:r.decisions});
 if(records.length%40===0)console.error('verified replays',records.length);
}
const comparisonOptions={reportedSupreme:true};
writeFileSync(out,JSON.stringify({kind:'reported-supreme-same-point-replay',sourceSHA256:hash(decoded),policySourceHashes:source.sourceHashes,options:source.options,optionsSHA256:source.optionsSHA256,comparisonOptions,comparisonOptionsSHA256:hash(JSON.stringify(comparisonOptions)),
 auditSourceHashes:Object.fromEntries(['reported-supreme-audit.ts','reported-supreme-audit-run.ts','guard-realization.ts'].map(p=>[p,hash(readFileSync(new URL(p,import.meta.url)))])),researchExecutions:0,replayedGames:records.length,records})+'\n');
console.log(JSON.stringify({researchExecutions:0,replayedGames:records.length,allGamesAndActionReceiptsMatched:true}));
