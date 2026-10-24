import {prepareMatch,DEFAULT_SETTINGS,type Fixture,type Settings} from './league-runner.js';
import {playCommitmentMatch} from './cooperative-commitment-match.js';
export const REPORT_VARIANTS=['cooperative','reportedSupreme'] as const;
export type ReportVariant=typeof REPORT_VARIANTS[number];
export function playReportSelfplay(fixture:Fixture,variant:ReportVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 if(!REPORT_VARIANTS.includes(variant))throw Error('unknown identical policy');
 // Assignment is evaluator-only. It is never passed to either policy as knowledge.
 const roles=prepareMatch(fixture).state.players.map(p=>({id:p.id,character:p.character,side:p.side}));
 const result=playCommitmentMatch(fixture,'truthful',variant==='cooperative'?'control':variant,settings,observe,false,true);
 return {variant,roles,result};
}
