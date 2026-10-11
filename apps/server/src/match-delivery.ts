// Durable outbox: completed matches survive a temporary database outage or a server restart.
import {mkdir,readFile,readdir,writeFile,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import type {GameState} from '@gst/rules';
import type {ServerConfig} from './config.js';
import {saveMatch} from './persist.js';
export interface PendingMatch { id:string; state:GameState; authIds:Record<string,string|null>; }
export function matchDelivery(cfg:ServerConfig,log:(...a:unknown[])=>void) {
 const directory=cfg.recordsDir?join(cfg.recordsDir,'outbox'):null;
 const memory=new Map<string,PendingMatch>();let tail=Promise.resolve();
 const serialize=(work:()=>Promise<void>)=>{const next=tail.then(work);tail=next.catch(()=>{});return next;};
 const flushUnlocked=async()=>{
  if(!cfg.supabaseUrl||!cfg.supabaseSecretKey)return;
  {
   if(directory){await mkdir(directory,{recursive:true});for(const name of await readdir(directory)){if(!name.endsWith('.json'))continue;try{const job=JSON.parse(await readFile(join(directory,name),'utf8')) as PendingMatch;memory.set(job.id,job);}catch{log('[persist] 보류 기록을 읽지 못했습니다:',name);}}}
   for(const [id,job] of memory){try{await saveMatch(cfg,job.state,job.authIds,id);if(directory)await unlink(join(directory,`${id}.json`));memory.delete(id);}catch(e){log('[persist] 재시도 대기',id,String(e));}}
  }
 };
 return {flush:()=>serialize(flushUnlocked),enqueue:(job:PendingMatch)=>serialize(async()=>{
  if (!directory && (!cfg.supabaseUrl || !cfg.supabaseSecretKey)) return;
  memory.set(job.id,job);
  if(directory){await mkdir(directory,{recursive:true});const file=join(directory,`${job.id}.json`);await writeFile(`${file}.tmp`,JSON.stringify(job),{encoding:'utf8',mode:0o600});await rename(`${file}.tmp`,file);}
  await flushUnlocked();
 })};
}
