import {prepareMatch,DEFAULT_SETTINGS,type Fixture,type Settings} from './league-runner.js';
import {playCommitmentMatch} from './cooperative-commitment-match.js';
export const GUARD_VARIANTS=['cooperative','knownCommanderGuardBeforeAlly'] as const;
export type GuardVariant=typeof GUARD_VARIANTS[number];
export function playGuardSelfplay(fixture:Fixture,variant:GuardVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 if(!GUARD_VARIANTS.includes(variant))throw Error('unknown identical policy');
 // Assignment is evaluator-only. It is never passed to either policy as knowledge.
 const roles=prepareMatch(fixture).state.players.map(p=>({id:p.id,character:p.character,side:p.side}));
 const result=playCommitmentMatch(fixture,'truthful',variant==='cooperative'?'control':variant,settings,observe,false,true);
 return {variant,roles,result};
}
