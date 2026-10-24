"""Read-only per-actor constraints in independently verified capped-game replays.

Readiness and own known targets are observations, not a full legal or optimal
alternative-action denominator. Legacy reconstructed belief is labelled.
"""
import collections,gzip,hashlib,json,pathlib,sys

ATTACKS={'attack','advanced_attack','supreme_attack'}

def analyze_rows(rows):
    result=[]
    for row in rows:
        actors={}
        for d in row['decisions']:
            v=d['view'];me=v['me'];assert me['id']==d['actor'] and me['alive'] and v['phase']=='running'
            roster={r['key']:r for r in v['roster']};known=dict(d['reconstructedKnownAfter'])
            key=d['actor'];cell=actors.setdefault(key,{'actor':key,'character':me['character'],'side':me['side'],'knowledgeScope':d['knowledgeScope'],'counts':collections.Counter(),'phases':{},'nullAttackBlockedReasons':collections.Counter(),'nullKnownEnemyTargetWitnesses':[]})
            assert cell['knowledgeScope']==d['knowledgeScope']
            phase='before12min' if d['at']<=720000 else '12to30min' if d['at']<=1800000 else 'after30min'
            bucket=cell['phases'].setdefault(phase,{'active':0,'null':0,'manaMin':me['mana'],'manaMax':me['mana'],'nullManaMin':None,'nullManaMax':None,'nullAttackSkillsReady':0,'nullAllAttacksManaInsufficient':0,'nullNoAttackSkills':0,'nullReadyWithOwnKnownEnemy':0,'publiclyRevealedFalseClaim':0})
            bucket['active']+=1;bucket['manaMin']=min(bucket['manaMin'],me['mana']);bucket['manaMax']=max(bucket['manaMax'],me['mana']);cell['counts']['active']+=1
            if d['chosenAction'] is not None:continue
            bucket['null']+=1;cell['counts']['null']+=1
            bucket['nullManaMin']=me['mana'] if bucket['nullManaMin'] is None else min(bucket['nullManaMin'],me['mana']);bucket['nullManaMax']=me['mana'] if bucket['nullManaMax'] is None else max(bucket['nullManaMax'],me['mana'])
            attacks=[s for s in me['skills'] if not s['passive'] and s['key'] in ATTACKS]
            ready=[s for s in attacks if s['blocked'] is None];bucket['nullNoAttackSkills']+=not attacks;bucket['nullAttackSkillsReady']+=bool(ready)
            bucket['nullAllAttacksManaInsufficient']+=bool(attacks) and all(me['mana']<s['mana'] for s in attacks)
            cell['nullAttackBlockedReasons'].update(s['key']+': '+str(s['blocked']) for s in attacks)
            public=next(p for p in v['players'] if p['id']==key)
            bucket['publiclyRevealedFalseClaim']+=bool(public['revealed']) and me['published']!=me['character']
            targets=[{'id':p['id'],'known':known[p['id']],'readySkills':[s['key'] for s in ready if known[p['id']] in (s.get('nameOptions') or []) and (s.get('ignoresInvulnerable') or not any(x['kind']=='invulnerable' for x in p['statuses']))]} for p in v['players'] if p['id']!=key and p['alive'] and p['id'] in known and roster[known[p['id']]]['side']!=me['side']]
            targets=[t for t in targets if t['readySkills']]
            bucket['nullReadyWithOwnKnownEnemy']+=bool(targets)
            if targets:cell['nullKnownEnemyTargetWitnesses'].append({'at':d['at'],'ordinal':d['ordinal'],'mana':me['mana'],'targets':targets,'notFullLegalOpportunity':True})
        for cell in actors.values():
            assert cell['counts']['active']==sum(p['active'] for p in cell['phases'].values())
            assert cell['counts']['null']==sum(p['null'] for p in cell['phases'].values())
        result.append({'inputId':row['inputId'],'fixture':row['fixture'],'variant':row['variant'],'style':row['style'],'identicalPolicy':row['identicalPolicy'],'unfinished':row['game']['winner'] is None,'actors':list(actors.values())})
    return {'kind':'own-decision-resource-and-knowledge-constraints','newResearchExecutions':0,'rows':result,'limitations':['Uses own views and recorded own knowledge; no hidden target identity or mana is used.','Legacy observer reconstruction is not claimed to be the exact decision belief of the legacy policy.','Nominal attack readiness and a known named enemy do not prove target-specific legality, unguarded damage, priority, or optimality.','Mana insufficiency can coexist with cooldown, uses, protection, or knowledge constraints.','Phase bins are descriptive <=12min, >12 to30min, >30min; counts are repeated calls, not independent game samples.','Outcome-selected capped games and paired policies do not estimate population performance.']}

if __name__=='__main__':
    p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();raw=gzip.decompress(raw) if str(p).endswith('.gz') else raw;data=json.loads(raw)
    assert data['kind']=='own-failure-stalemate-replay' and data['complete'] and data['executions']==data['expectedReplays']==len(data['records'])
    result=analyze_rows(data['records']);result.update(rawSHA256=hashlib.sha256(raw).hexdigest(),analysisSHA256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),replayedGames=data['executions'])
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'analyzedExistingReplays':data['executions'],'newResearchExecutions':0}))
