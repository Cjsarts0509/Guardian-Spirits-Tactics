"""Descriptive own-action/receipt costs only; never selects modes, cells or candidates."""
import collections,gzip,hashlib,json,pathlib,sys
p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();d=json.loads(gzip.decompress(raw) if p.suffix=='.gz' else raw)
assert d['kind']=='first-trusted-report-single-normal' and d['complete']
checks={'advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan','truth_gem','ally_check','enemy_check'}
out={'sourceRawSHA256':hashlib.sha256(raw).hexdigest(),'promotionEvidence':False,'selectionPerformed':False,'modes':{}}
for row in d['rows']:
    b=out['modes'].setdefault(row['mode'],{'pairs':0,'intervened':0,'alternatives':collections.Counter(),'control':collections.Counter(),'normal':collections.Counter()})
    for pair in row['pairs']:
        b['pairs']+=1;point=pair['control']['point']
        if not point:continue
        b['intervened']+=1;alt=point['alternative'];b['alternatives']['null' if alt is None else alt.get('skill',alt['type'])]+=1
        b['alternatives']['originalMana']+=point['before']['originalMana'];b['alternatives']['alternativeNominalMana']+=point['before']['alternativeMana']
        for v in ['control','normal']:
            r=pair[v];c=b[v];start=point['at'];receipts=r['resources']['turnReceipts'];actions=r['actions']
            for k in ['acceptedSkillMana','allyManaNet','publishManaNet','trueNameBonusGross','trueNameMs','reachedGem3','attackFailures']:c[k]+=r['resources'][k]
            exact=r['resources']['firstExactReportedFactAt']
            if exact is None:c['reportedNameNoExactPrivateFact']+=1
            else:c['reportedNameExactPrivateFact']+=1;c['reportedNameExactPrivateFactDelayMs']+=exact-start
            first_target=None
            for t in actions:
                a=t['action']
                if a['type']!='skill' or not t['accepted']:continue
                c['accepted_'+a['skill']]+=1
                if a['skill'] in checks:
                    c['allCheckingNominalMana']+=t['nominalMana']
                    if a.get('target')==point['original']['target']:
                        c['reportedTargetCheckingNominalMana']+=t['nominalMana'];first_target=t['at'] if first_target is None else first_target
                    else:c['otherTargetCheckingNominalMana']+=t['nominalMana']
                if t['at']<=start+60000:
                    c['first60sAccepted_'+a['skill']]+=1;c['first60sNominalMana']+=t['nominalMana']
                    if a['skill'] in ['attack','advanced_attack','supreme_attack']:c['first60sNamedAttacks']+=1
                if a['skill']=='truth_gem' and t['beforeGem']==2:
                    c['partialGemConsumedTo0']+=1
                    next_use=min((x['at'] for x in actions if x['at']>t['at'] and x['accepted'] and x['action'].get('skill')=='truth_gem'),default=float('inf'))
                    regrown=next((x['at'] for x in receipts if t['at']<x['at']<=next_use and x['gem']>=2),None)
                    if regrown is None:c['partialGemNoObservedRegrowthTo2']+=1
                    else:c['partialGemRegrownTo2']+=1;c['partialGemRegrowthTo2Ms']+=regrown-t['at']
            if first_target is None:c['reportedTargetNoLaterAcceptedCheck']+=1
            else:c['reportedTargetFirstAcceptedCheck']+=1;c['reportedTargetFirstAcceptedCheckDelayMs']+=first_target-start
out['limitations']=['Post-intervention selected player only; all future costs and survival may differ.','Exact private facts are own received facts, not trusted reports.','Regrowth uses own turn receipts before next gem use; unobserved is not proof of no regrowth.','This diagnostic is not main/holdout/all-player promotion evidence.']
print(json.dumps(out,ensure_ascii=False,indent=2))
