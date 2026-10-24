/** Identical policy on both factions. This is a balance probe, not a strength ladder. */
import {playFailureDevelopment,type FailureVariant} from './failure-development.js';
import {DEFAULT_SETTINGS,type Fixture,type Settings} from './league-runner.js';

export function playFailureSelfplay(fixture:Fixture,variant:FailureVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 // The claim-style argument is ignored in identical-policy mode; no reference claim mutation.
 const row=playFailureDevelopment(fixture,'truthful',variant,settings,observe,true);
 const resourcesBySide=Object.fromEntries(([1,2] as const).map(side=>{
  const actions=row.actions.filter(a=>a.side===side);
  return [side,{
   nominalSkillMana:actions.filter(a=>a.accepted&&a.action.type==='skill').reduce((n,a)=>n+a.nominalMana,0),
   netSkillManaDelta:actions.filter(a=>a.accepted&&a.action.type==='skill').reduce((n,a)=>n+a.afterMana-a.beforeMana,0),
   attackFailures:actions.filter(a=>a.receiptKinds.includes('attack.fail.self')).length,
   rejected:actions.filter(a=>!a.accepted).length,
   reports:actions.filter(a=>a.reportTarget).length,
   falseReports:actions.filter(a=>a.reportTarget&&(a.reportedName!==a.reportActual||a.reportKnown!==a.reportActual)).length,
  }];
 }));
 return {...row,style:'identical-policy' as const,resourcesBySide};
}
