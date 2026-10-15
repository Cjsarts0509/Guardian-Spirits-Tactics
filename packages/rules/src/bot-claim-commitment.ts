import type {PlayerView} from './engine/view.js';
import type {GameEvent} from './types.js';
import type {BotMemory} from './bot-memory.js';

/** 자기 수신 성공 공표만 관찰한다. 정책 의도이며 실제 진명 강제 효과와 별개다. */
export function observeClaimTurnCommitment(view:PlayerView,events:readonly GameEvent[],memory:BotMemory){
  const p=memory.perception;if(!p)return;
  const c=p.claimCommitment??={lastSeq:0,until:0,publishedAt:null as number|null};
  let freshTrueAt:number|undefined;
  for(const e of events){
    const visible=e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(view.me.id);
    if(!visible||e.seq<=c.lastSeq)continue;
    if((e.kind==='publish'||e.kind==='publish.auto')&&e.data?.player===view.me.id){
      c.until=0;c.publishedAt=null;freshTrueAt=undefined;
      if(e.kind==='publish'&&e.data.name===view.me.character&&e.at<=view.elapsedMs)freshTrueAt=e.at;
    }
    if(e.vis.to==='players'&&e.vis.ids.includes(view.me.id)&&(e.kind==='turn'||e.kind==='death.self')){
      c.until=0;c.publishedAt=null;freshTrueAt=undefined;
    }
    c.lastSeq=e.seq;
  }
  const valid=view.phase==='running'&&view.me.alive&&view.me.trueName&&
    !view.me.skills.some(s=>s.key==='disguise')&&Number.isFinite(view.nextTurnInMs)&&view.nextTurnInMs>0;
  if(!valid){c.until=0;c.publishedAt=null;return;}
  if(freshTrueAt!==undefined){c.until=view.elapsedMs+view.nextTurnInMs;c.publishedAt=freshTrueAt;}
  if(c.until<=view.elapsedMs){c.until=0;c.publishedAt=null;}
}

/** 다른 봇의 실제 정체·기억이나 미래 생존/마나는 읽지 않는다. */
export function claimTurnCommitted(view:PlayerView,memory:BotMemory):boolean{
  const p=memory.perception;
  return !!p&&p.playerId===view.me.id&&p.mode===view.mode&&p.character===view.me.character&&
    view.phase==='running'&&view.me.alive&&view.me.trueName&&
    !view.me.skills.some(s=>s.key==='disguise')&&
    Number.isFinite(p.claimCommitment?.until)&&(p.claimCommitment?.until??0)>view.elapsedMs;
}
