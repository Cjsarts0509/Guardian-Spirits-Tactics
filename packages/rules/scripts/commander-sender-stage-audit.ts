/** Post-hoc source-stage evidence; own view/events rebuild only, never another bot's memory. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deepStrictEqual,strictEqual} from 'node:assert';
import {fileURLToPath} from 'node:url';
import {createBotMemory,updateBotKnowledge} from '../src/bot-memory.js';
import {trustedIntel,verifyIntel} from '../src/bot-intel.js';
import {storeHash} from './cooperative-store.js';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('witness053[.gz] output.json');
const file=readFileSync(input),blob=input.endsWith('.gz')?gunzipSync(file):file;strictEqual(storeHash(blob),'92274255bc35dc8faf6e3c6b2fb871b036a2e97d48ddf4ba57a4ca15457c6b85');
const data=JSON.parse(blob.toString()),rows=[];
for(const r of data.records)for(const d of r.decisions){
 const memory=createBotMemory(d.preRng),k=updateBotKnowledge(d.view,d.events,memory,{learnOwnAttackOutcome:false});
 deepStrictEqual(k.known,new Map(d.known));deepStrictEqual(k.candidates,new Map(d.candidates));
 const usable=new Map(d.view.me.skills.filter((s:any)=>d.diagnostic.usableKeys.includes(s.key)).map((s:any)=>[s.key,s]));
 const prior=verifyIntel(d.view,k,memory,usable as any),trusted=[...trustedIntel(d.view,k,memory)];
 if(d.diagnostic.proposal)rows.push({variant:r.variant,fixture:r.fixture,player:d.player,at:d.at,priorTrustedVerification:prior,trustedReports:trusted,commanderSenderProposal:d.diagnostic.proposal,actual:d.chosenAction,alternative:d.alternative,changed:d.changed,priorMatchesActual:JSON.stringify(prior)===JSON.stringify(d.chosenAction)});
}
const result={kind:'round053-posthoc-own-stage-audit',sourceSHA256:storeHash(readFileSync(fileURLToPath(import.meta.url))),witnessSHA256:storeHash(blob),reconstructedOwnChoices:data.records.reduce((n:number,r:any)=>n+r.decisions.length,0),rows,limitations:['A matching earlier helper is stage evidence supported by source order, not a counterfactual win estimate.','Rebuilt only own views/events; no hidden assignment input.']};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({reconstructedOwnChoices:result.reconstructedOwnChoices,proposalRows:rows.length,priorMatchesActual:rows.filter(r=>r.priorMatchesActual).length}));
