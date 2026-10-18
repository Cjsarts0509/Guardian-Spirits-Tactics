import {writeFileSync} from 'node:fs';
import {playSenderDevelopment,SENDER_VARIANTS,senderPublicRules} from './sender-development.js';
const prefix=process.argv[2];if(!prefix)throw Error('synthetic output prefix');
const records=[];
for(const mode of ['civil_war','primordial','lidellut','troll'] as const)for(const count of [8,12])for(const currentSide of [1,2] as const)for(const variant of SENDER_VARIANTS)records.push(playSenderDevelopment({mode,seed:900055+count,count,reversed:count===12,currentSide},'skill-aware-bluff',variant));
writeFileSync(prefix+'.json',JSON.stringify({publicRules:senderPublicRules(),records})+'\n');console.log(JSON.stringify({synthetic:records.length,decisions:records.reduce((n,r)=>n+r.decisions.length,0),selected:records.reduce((n,r)=>n+r.counters.selected,0),changed:records.reduce((n,r)=>n+r.counters.changed,0),research:0}));
