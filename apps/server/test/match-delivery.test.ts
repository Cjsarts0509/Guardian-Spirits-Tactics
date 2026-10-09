import {afterEach,expect,it,vi} from 'vitest';
import {mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGame} from '@gst/rules';
import {loadConfig} from '../src/config.js';
import {matchDelivery} from '../src/match-delivery.js';
import {loadModeRecords} from '../src/persist.js';
afterEach(()=>vi.unstubAllGlobals());
it('부분 실패 후 서버 재시작 시 같은 경기 ID로 재전송하고 보관 파일 제거',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gst-outbox-'));
 try {
  const cfg={...loadConfig({}),recordsDir:dir,supabaseUrl:'https://example.test',supabaseSecretKey:'sb_secret_test'};
  const {state}=createGame({mode:'civil_war',players:Array.from({length:8},(_,i)=>({id:`p${i}`,nickname:`P${i}`})),seed:42,now:0});state.phase='ended';
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('unavailable',{status:503})));
  await matchDelivery(cfg,()=>{}).enqueue({id:'38c93eec-b91d-4410-92a4-c3ea2a58aa21',state,authIds:{p0:'account'}});
  expect(await readdir(join(dir,'outbox'))).toHaveLength(1);
  const ids:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit)=>{
   const h=init.headers as Record<string,string>;expect(h.Prefer).toContain('resolution=merge-duplicates');
   if(url.endsWith('/matches')){const body=JSON.parse(init.body as string);ids.push(body.id);return new Response(JSON.stringify([{id:body.id}]),{status:201});}
   return new Response('',{status:201});
  }));
  await matchDelivery(cfg,()=>{}).flush();expect(ids).toEqual(['38c93eec-b91d-4410-92a4-c3ea2a58aa21']);expect(await readdir(join(dir,'outbox'))).toEqual([]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('계정별 모드 전적은 서버 계정 필터와 페이지네이션으로 합산',async()=>{
 const urls:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{urls.push(url);return new Response(JSON.stringify(urls.length===1?Array.from({length:500},()=>({won:true,matches:{mode:'civil_war'}})):[{won:false,matches:{mode:'troll'}}]),{status:200});}));
 const records=await loadModeRecords({...loadConfig({}),supabaseUrl:'https://example.test',supabaseSecretKey:'sb_secret_test'},'verified-account');
 expect(new URL(urls[0]!).searchParams.get('user_id')).toBe('eq.verified-account');expect(new URL(urls[1]!).searchParams.get('offset')).toBe('500');
 expect(records).toEqual([{mode:'civil_war',played:500,won:500,lost:0},{mode:'troll',played:1,won:0,lost:1}]);
});
