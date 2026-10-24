"""Render current evidence summary while preserving all historical round links."""
import datetime,json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1];dest=root/'docs/evaluations';out=root/'docs/ai-rounds/INTERIM_20261024.md';old=out.read_text();marker='## 001–057 전체 회차 색인'
history=old.split(marker,1)[1].split('## 원자료와 재현 위치',1)[0];assert len(re.findall(r'\|\[\d{3}\]\(ROUND_',history))==57
load=lambda p:json.loads(p.read_bytes());a=load(root/'docs/ai-rounds/ACTIVE.json');c62=load(dest/'cooperation-round-062-completion.json');now=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec='seconds')
completed={n:load(dest/f'cooperation-round-{n:03d}-completion.json') for n in range(62,100) if (dest/f'cooperation-round-{n:03d}-completion.json').exists()}
roundlink=lambda n:next((p.name for p in (root/'docs/ai-rounds').glob(f'ROUND_{n:03d}_20261024_*.md')),None)
balance_label='063·069' if 69 in completed else '063'
current=f'{a["round"]:03d}회차 '+({'completed':'완료','in_progress':'진행 중','paused_deadline':'종료 시각에 중단'}.get(a['status'],a['status']))
if a.get('stoppedAt'):current+=' · 요청 시각에 작업 종료'
new=a['cumulativeExecutions']-48832
text=f'''# GST AI 개선 전체 회차 중간보고서 — 2026-10-24\n\n기준: {now}. **{current}. 기억과 추론의 기능 개선은 확인했지만, 종합 대전 성능 향상이나 게임 균형 달성은 아직 입증하지 못했다.**\n\n완료 누적은 **{a['cumulativeExecutions']:,}경기 / {a['cumulativeTerminatedExecutions']:,}종료 / 제한 미종료 {a['cumulativeUnfinishedExecutions']}경기**다. 이번 재개 후 완료한 신규 연구 경기는 {new:,}경기다. 같은 경기 재생·합성 검사·복사·중간 저장본은 더하지 않았다. 사람 상대 대전은 0경기다. 새 후보는 기본 OFF이며 main 병합·운영 배포·스킬 수치 변경은 하지 않았다.\n\n## 평가의 세 가지 축\n\n|구분|현재 판정|해석 범위|\n|---|---|---|\n|행동 품질|자기 지연 명령과 결과의 지속 기억, 정확 실패 단서의 후보 축소 기능 확인|기회 분모·오확정·실제 후속 행동으로 평가|\n|고정 상대 성능|062 후보와 control의 승수 동일; 우월성 미입증|동일 상대·배정에서 정책 개입을 비교|\n|동일 정책 균형|{balance_label}에서 진영·모드·8–12인·역할 편성별 별도 평가|양쪽에 같은 정책을 적용하며 전체 정책 50%는 증거로 쓰지 않음|\n\n## 재개 이후 회차별 결과\n\n|회차|작업|확인한 결과|신규 연구 경기|\n|---|---|---|---:|\n|[058]({roundlink(58)})|지연 확인 기억 진단|혼돈주술 성공 접수의 대상이 지속 기억에 남지 않는 누락을 실제 엔진에서 확인.|0|\n|[059]({roundlink(59)})|자기 지연 확인 기억 구현|비공개 접수·대상·예정 만기·정확 결과를 연결. 호스트 전체/변경분 복원과 정보 경계 검증. 행동 선택 불변.|0|\n|[060]({roundlink(60)})|실제 정책의 기억 소비|기존96경기에서 접수298/298, 적격 결과250/250 소비. 성공140·실패110. 사망/후속 갱신 없음/종료 검열을 분리.|0|\n|[061]({roundlink(61)})|정확 자기 실패의 진영 추론|107/107 적격 기회에서 공개 규칙에 맞게 반란자 후보 제거. 복제 선택의 기능 검사이며 승률 증거는 아님.|0|\n|[062]({roundlink(62)})|새 고정 상대 평가|1,152경기 검증·저장, 그중 제한 미종료2. 실제 적격 후보 축소31/31, 승수 control·후보 각268/384.|1,152|\n'''
if 63 in completed:
 c=completed[63];text+=f'|[063]({roundlink(63)})|동일 정책 진영 균형|{c["executions"]}경기 검증, 미종료{c["unfinished"]}. 모드·인원·편성별 진영 결과와 행동 품질을 분리.|{c["executions"]:,}|\n'
elif a['round']==63:
 text+=f'|[063]({roundlink(63)})|동일 정책 진영 균형 진행|체크포인트 {a["executions"]}/{a["targetExecutions"]}경기. 완료 전 균형 결론 보류.|완료 누적 미포함|\n'
for n,c in completed.items():
 if n<64:continue
 title=next((p.read_text().splitlines()[0].split(' — ',1)[-1] for p in (root/'docs/ai-rounds').glob(f'ROUND_{n:03d}_*.md')),f'{n}회차')
 text+=f'|[{n:03d}]({roundlink(n)})|{title}|'+(f'기존 {c["replayedGames"]}경기 재생·{c.get("matchedActions",0):,}명령 검증.' if 'replayedGames' in c else c.get('findingsCurrent',c.get('shortFinding','기존 자료 분석 완료.')))+f'|{c.get("newResearchExecutions",0):,}|\n'
if a['round']>=64 and a['status']!='completed':text+=f'|[{a["round"]:03d}]({roundlink(a["round"])})|{a["task"]}|완료분과 미완료 범위는 ACTIVE와 해당 회차 기록 참조.|완료 누적 미포함|\n'
text+='''\n061의 복제 선택64변화/81접수는 실제 경기에서 늘어난 행동이 아니다. 062의 control은055 candidate에 수동 기억을 더한 비교군이며055 control과 다르다. 타인 보고·모호한 공격 실패·미도착 결과는 확정 단서로 올리지 않았다.\n\n## 062 행동 품질과 고정 상대 성능\n\n실제 후보의 최초 실패 소비36건 중 후보 축소가 가능한31건을 **31/31 이행**했다. 나머지5건은 이미 축소 여지가 없었다. 오확정0/291,305 자기지식 관측·오소거0이다. 반복 관측을 독립 정체 수로 보지 않는다. 새 정확 정체7개의 경기 내 시전자·대상쌍을 모두 후속 사용했다. 실제 명령은 정보 공유15·동맹1·파괴자 인도1회이며, 대상 수는 적격 스킬 기회 분모가 아니다.\n\n|모드|baseline 승수|control 승수|candidate 승수|\n|---|---:|---:|---:|\n|내전|60/96|73/96|73/96|\n|태초|66/96|70/96|70/96|\n|황야|67/96|66/96|66/96|\n|트롤|66/96|59/96|59/96|\n|합계|259/384 (67.45%)|268/384 (69.79%)|268/384 (69.79%)|\n\n후보−control 대응 점수 차이는0.0000pp, 시드 단위95%구간은−0.7812~+0.7812pp다. 1개선·1악화·382동일이다. 후보−baseline 점수 차이는+2.4740pp(실제 승리 비율 차이는+2.3438pp),95%구간−4.5573~+9.2448pp다. 제한 미종료는 승리로 세지 않고 점수 계산에서만0.5로 보존했다. 독립 시드는8개이며 상대 스타일·진영·순서 교환을 독립 시드로 늘리지 않았다.\n\n|부작용 지표|control|candidate|\n|---|---:|---:|\n|접수 스킬 명목 마나 합|374,345|371,395|\n|시전 직후 마나 변화 합|−355,090|−352,180|\n|자기 공격실패 이벤트|91|83|\n|명령 거절|11|11|\n|접수된 구조화 보고|5,285|5,370|\n\n후보 보고의 오이름·자기 작업지식 미지지0. 발송과 실제 수신·신뢰는 별개다. 자원 총량에는 경기 길이와 뒤따른 행동 변화가 섞이므로 인과적인 마나 절약으로 단정하지 않는다. 트롤의 제한 미종료2경기는 같은 배정의 control/candidate이며 정확 실패 추론 기회0이었다.\n'''
for balance_round in [n for n in completed if n==63 or completed[n].get('evaluationKind')=='identical-policy-balance']:
 s=load(dest/f'cooperation-round-{balance_round:03d}-development-summary.json');text+=f'\n## {balance_round:03d} 동일 정책의 진영 균형\n\n|모드|baseline 진영1 승수|control 진영1 승수|candidate 진영1 승수|후보 진영1 점수95%구간|미종료 B/C/후보|\n|---|---:|---:|---:|---:|---:|\n'
 for mode,label in [('civil_war','내전'),('primordial','태초'),('lidellut','황야'),('troll','트롤')]:
  cells=[s['byMode'][v+'/'+mode] for v in ['baseline','control','candidate']];text+='|'+label+'|'+'|'.join(f'{x["side1Wins"]}/{x["games"]} ({100*x["side1Wins"]/x["games"]:.2f}%)' for x in cells)+'|'+'~'.join(f'{100*x:.2f}%' for x in cells[2]['seedBootstrap95'])+'|'+'/'.join(str(x['unfinished']) for x in cells)+'|\n'
 text+='\n진영1점수는 승리1·패배0·미종료0.5다. 같은 정책을 양쪽에 적용했으므로 이 표는 정책끼리의 실력 순위가 아니다. 50%를 포함하는 구간은 균형 동등성의 증명도 아니다. 인원별 결과와 역할 편성·생존·실제 스킬 횟수는 각 회차 상세와 summary에 보존했다. 인원 변화는 편성 변화도 수반하므로 단일 스킬 원인으로 환원하지 않는다.\n'
for n,c in completed.items():
 if n>=64:text+=f'\n## {n:03d} 후속 진단\n\n'+c.get('findingsCurrent',c.get('findings',c.get('shortFinding','상세 회차와 원자료 참조.')))+'\n'
text+='''\n## 과거 결과와 남은 한계\n\n055의 후보67.7083%는 main72.9167%보다5.2083pp 낮았고, 트롤은control58승에서후보55승으로 악화됐다. 062는 다른 개발시드·기억 옵션을 사용했으므로 이 열세를 소급 지우거나 두 회차를 단순한 향상 추세로 연결하지 않는다.\n\n기능 개선, 합성 봇 상대 성능, 진영 균형, 실제 사람 경험은 별도의 판정이다. 보고 후 행동이 이어졌다는 시간 연결만으로 보고의 승리 기여를 주장하지 않는다. 사망·마나·쿨다운·대상 합법성·상위 행동을 분리하지 않은 준비 횟수는 이행률 분모가 아니다. 독립121000–121015와152016–152079는 미사용으로 보존하며 과거 최종평가 자료로 재튜닝하지 않았다.\n\n'''
text+='''## 현재 보존한 기능과 다음 판단

자기 지연 명령의 기억과 정확 실패 단서의 추론 기능은 기본OFF 후보로 보존한다. 고정 상대 승률의 우월성이 입증되지 않았다는 이유로 기억 정확성의 가치를 없애지 않으며, 기능 검사 통과를 실력 향상으로 바꾸어 표현하지도 않는다.

태초의 진영 우세는 다음 분석 대상이다. 보호자가 없는 편성, 실제 공격·방어 기회, 자기 정체 지식, 보고의 도착·신뢰와 사용을 나눈 뒤 AI 활용 누락과 규칙/스킬 수치의 영향을 별도로 비교해야 한다. 이번 작업에서 스킬 수치를 조정하지 않았다.

'''
text+=marker+history
text+='''\n## 원자료와 재현 위치\n\n- 현재 상태와 미완료 지점: [ACTIVE.json](ACTIVE.json).\n- 001–057 당시 누적 재계수: [역사적 원장](../evaluations/cooperation-interim-001-057-audit.json),35개 주자료48,832경기.\n- 062 고정 상대 원자료·소스·옵션·재현 명령: [062 상세](ROUND_062_20261024_0943.md).\n- 063 원자료·진영/인원/편성 결과·분할 처리 동일성: [063 상세](ROUND_063_20261024_1230.md).\n- 각 회차의 `cooperation-round-NNN-completion.json`은 압축/복원 해시와 검증 결과를 담는다. 기존 재생이나 중간 복사본은 누적하지 않는다.\n\n기본 OFF 기능 보존과 운영 채택은 다른 결정이다. main 병합·운영 배포·Supabase 변경·스킬 수치 조정·실제 사람 대전은 이번 작업에 포함되지 않았다.\n'''
for target in re.findall(r'\]\((ROUND_[^)]+)\)',text):assert (out.parent/target).exists(),target
assert len(re.findall(r'\|\[\d{3}\]\(ROUND_',text))>=62
out.write_text(text);print(json.dumps({'at':now,'round':a['round'],'status':a['status'],'historicalRowsPreserved':57,'completedCumulative':a['cumulativeExecutions'],'currentResumeNewResearch':new,'bytes':out.stat().st_size},ensure_ascii=False))
