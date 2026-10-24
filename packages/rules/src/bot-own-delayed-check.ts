import type {GameEvent,PlayerId} from './types.js';
import type {PlayerView} from './engine/view.js';

export interface OwnDelayedCheck {
  target: PlayerId;
  receiptSeq: number;
  at: number;
  /** Public skill rule, not a read of the engine's hidden queue. */
  due: number;
  status: 'pending' | 'overdue' | 'succeeded' | 'failed' | 'ended-unresolved';
  result?: {seq:number;at:number;success:boolean};
}
export interface OwnDelayedCheckMemory {
  lastSeq: number;
  records: OwnDelayedCheck[];
}

/** Passive own-receipt ledger. Never writes identity knowledge or chooses an action. */
export function observeOwnDelayedCheck(view:PlayerView,events:readonly GameEvent[],memory:OwnDelayedCheckMemory):void {
  if(view.mode!=='troll'||view.me.character!=='kanulla')return;
  const personal=events.filter(e=>e.seq>memory.lastSeq&&Number.isSafeInteger(e.seq)&&e.seq>0&&
    Number.isFinite(e.at)&&e.at>=0&&e.at<=view.elapsedMs&&
    e.vis.to==='players'&&e.vis.ids.length===1&&e.vis.ids[0]===view.me.id&&
    ['skill.chaos_hex.self','skill.chaos_hex.result'].includes(e.kind));
  const unique=new Map<number,GameEvent>(),conflict=new Set<number>();
  for(const e of personal){
    const prior=unique.get(e.seq);
    if(prior&&JSON.stringify(prior)!==JSON.stringify(e))conflict.add(e.seq);
    else unique.set(e.seq,e);
  }
  for(const e of [...unique.values()].sort((a,b)=>a.seq-b.seq)){
    memory.lastSeq=Math.max(memory.lastSeq,e.seq);
    if(conflict.has(e.seq))continue;
    const target=e.data?.target;
    if(typeof target!=='string'||!view.players.some(p=>p.id===target))continue;
    if(e.kind==='skill.chaos_hex.self'){
      memory.records.push({target,receiptSeq:e.seq,at:e.at,due:e.at+60000,status:'pending'});
    }else if(typeof e.data?.success==='boolean'){
      // Same target alone is insufficient. Require the exact scheduled time of one own receipt.
      const matching=memory.records.filter(r=>!r.result&&r.target===target&&r.receiptSeq<e.seq&&r.due===e.at);
      if(matching.length!==1)continue;
      const r=matching[0]!;
      r.result={seq:e.seq,at:e.at,success:e.data.success};
      r.status=e.data.success?'succeeded':'failed';
    }
  }
  for(const r of memory.records)if(!r.result){
    r.status=view.phase==='ended'?'ended-unresolved':view.elapsedMs>=r.due?'overdue':'pending';
  }
  // More than 64 simultaneous pending casts are impossible under the public cooldown rule.
  memory.records=memory.records.slice(-64);
}
