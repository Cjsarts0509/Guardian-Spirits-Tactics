// 실제 웹 빌드와 독립 브라우저 프로필 두 개. 운영 주소/인증에 접속하지 않는다.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '../../..');
const { chromium } = await import(process.env.GST_PLAYWRIGHT_MODULE ?? 'playwright');
const output = await mkdtemp(`${tmpdir()}/gst-host-browser.`);
const server = spawn(process.execPath, ['apps/server/dist/index.js'], { cwd: root,
  env: { PATH: process.env.PATH, PORT: '0', HOST: '127.0.0.1', STATIC_DIR: `${root}/apps/client/dist` }, stdio: ['ignore','pipe','pipe'] });
let browser; const browsers = [];
const errors = [], checks = [], captures = [];
const pause = ms => new Promise(r=>setTimeout(r,ms));
const wait = async (predicate,label) => { const end=Date.now()+15000;while(Date.now()<end){if(await predicate())return;await pause(30);}throw Error(`timeout: ${label}`); };
try {
  let log = '';
  server.stdout.on('data', b=>log+=b);
  server.stderr.on('data', b=>log+=b);
  await wait(()=>/\[gst-server\] :(\d+)/.test(log),'서버 시작');
  const port = Number(log.match(/\[gst-server\] :(\d+)/)[1]), url=`http://127.0.0.1:${port}`;
  console.error(`[browser-audit] ${url}`);
  const launch = async () => chromium.launchPersistentContext(await mkdtemp(`${tmpdir()}/gst-chrome-profile.`), {
    executablePath: process.env.GST_CHROMIUM_EXECUTABLE, headless: true, viewport:{width:1440,height:1000},
    args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process'] });
  const contexts=[await launch(),await launch()];
  browsers.push(...contexts); browser=contexts[0].browser();
  console.error('[browser-audit] 독립 영구 프로필 두 개 시작');
  for(const context of contexts) { context.setDefaultTimeout(15000); context.setDefaultNavigationTimeout(15000); }
  async function page(context) {
    const p=await context.newPage(), messages=[];
    p.on('pageerror',e=>errors.push(e.message));
    p.on('websocket',ws=>ws.on('framereceived',({payload})=>{try{
      const message=JSON.parse(String(payload));messages.push(message);
      if(message.type==='error'||message.type==='action.result'&&!message.ok)errors.push(message.message??message.error??'action failed');
    }catch{}}));
    await p.goto(url);return {p,messages};
  }
  const a=await page(contexts[0]),b=await page(contexts[1]);
  console.error('[browser-audit] 두 프로필 화면 로드');
  for(const [client,nick] of [[a,'hostA'],[b,'hostB']]){
    await client.p.getByPlaceholder('닉네임',{exact:true}).fill(nick);
    await client.p.getByRole('button',{name:'게스트로 입장',exact:true}).click();
    await client.p.getByRole('heading',{name:'방 만들기',exact:true}).waitFor();
  }
  async function create(client) {
    await client.p.getByRole('button',{name:'만들기',exact:true}).click();
    await client.p.getByRole('button',{name:'게임 시작',exact:true}).waitFor();
  }
  console.error('[browser-audit] 두 게스트 입장');
  await create(a);
  await b.p.locator('.rooms li').first().getByRole('button',{name:'입장',exact:true}).click();
  await b.p.getByText('방장이 시작하기를 기다리는 중…',{exact:true}).waitFor();
  await a.p.getByRole('button',{name:'봇 12인까지',exact:true}).click();
  await a.p.getByRole('button',{name:'게임 시작',exact:true}).click();
  await wait(()=>a.messages.some(m=>m.type==='host.ack'),'첫 호스트 확정');
  for(const client of [a,b]) if(await client.p.locator('.reveal').count()) await client.p.locator('.reveal').getByRole('button',{name:'게임 시작',exact:true}).click();
  const first=a.messages.find(m=>m.type==='host.grant');
  const identity=a.messages.findLast(m=>m.type==='game').view.me.character;
  assert(!b.messages.some(m=>m.type==='host.grant'));checks.push('초기 방장 워커 확정과 일반 참가자 체크포인트 미전달');
  console.error('[browser-audit] 첫 게임 확정');
  await a.p.reload();
  await wait(()=>b.messages.some(m=>m.type==='host.grant'&&m.epoch>first.epoch),'새로고침 호스트 이전');
  await wait(()=>a.messages.filter(m=>m.type==='welcome').length>=2,'원래 사용자 복귀');
  await b.p.locator('.banner').filter({hasText:'방장: hostB'}).waitFor();
  assert.equal(a.messages.findLast(m=>m.type==='game').view.me.character,identity);checks.push('방장 새로고침→후임 이전·원래 정체로 재접속·호스트 탈환 없음');
  await b.p.getByPlaceholder('메시지',{exact:true}).fill('실브라우저 이전 완료');
  await b.p.getByRole('button',{name:'보내기',exact:true}).click();
  await wait(()=>b.messages.some(m=>m.type==='action.result'&&m.ok),'행동 확정');
  assert.equal(b.messages.filter(m=>m.type==='action.result'&&m.ok).length,1);
  await wait(()=>a.messages.some(m=>m.type==='game'&&m.events.some(e=>e.text.includes('실브라우저 이전 완료'))),'상대에게 채팅 전달');
  checks.push('이전 후 채팅1회 확정 및 상대 전달');
  const capture = async (p,name) => {const path=`${output}/${name}.png`;await p.screenshot({path,fullPage:true});captures.push({name,path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});};
  await capture(b.p,'after-migration');
  console.error('[browser-audit] 새로고침·채팅 확정');
  await b.p.close();
  await wait(()=>a.messages.filter(m=>m.type==='host.grant').length>=2,'후임 탭 종료');
  checks.push('후임 탭 종료→접속 중인 원래 사용자에게 이전');
  const resumed=await page(contexts[1]);
  await wait(()=>resumed.messages.some(m=>m.type==='game'),'후임 세션 재접속');
  await a.p.getByRole('button',{name:'나가기',exact:true}).click();
  await a.p.getByRole('button',{name:'잠시 나가기 — 봇이 대신 플레이, 로비에서 재입장 가능',exact:true}).click();
  await wait(()=>resumed.messages.some(m=>m.type==='host.grant'),'자리 비움 이전');
  checks.push('방장 자리 비움→후임 이전');
  await resumed.p.close();
  await pause(900);
  await a.p.getByRole('button',{name:'재입장',exact:true}).click();
  await wait(()=>a.messages.filter(m=>m.type==='host.grant').length>=3,'호스트 없는 방 복구');
  const restore=a.messages.findLast(m=>m.type==='host.grant');
  const saved=JSON.parse(restore.checkpoint).state.now;
  await wait(()=>a.messages.findLast(m=>m.type==='game')?.serverTime>=saved,'복구 확정');
  assert(a.messages.findLast(m=>m.type==='game').serverTime-saved<700);
  checks.push('모든 호스트 이탈 뒤 재입장·체크포인트 시계에서 재개');
  await a.p.getByRole('button',{name:'나가기',exact:true}).click();
  await a.p.getByRole('button',{name:'완전히 나가기 — 내 캐릭터는 사망 처리',exact:true}).click();
  await a.p.getByRole('button',{name:'만들기',exact:true}).waitFor();
  await create(a);
  const oldAckCount=a.messages.filter(m=>m.type==='host.ack').length;
  await a.p.getByRole('button',{name:'AI만 돌리기 (관전)',exact:true}).click();
  await wait(()=>a.messages.filter(m=>m.type==='host.ack').length>oldAckCount,'관전자 호스팅');
  assert.equal(a.messages.findLast(m=>m.type==='game').view.players.length,12);
  checks.push('새 AI 전용 판 관전자 브라우저 호스팅');
  await capture(a.p,'ai-spectator');
  assert.deepEqual(errors,[]);
  const files=['apps/client/src/net.ts','apps/client/src/Game.tsx','apps/client/src/host.worker.ts','apps/server/src/rooms.ts','apps/server/src/server.ts','apps/server/scripts/host-browser-audit.mjs'];
  const result={format:1,runtime:{node:process.version,browser:browser.version(),platform:process.platform,arch:process.arch},
    scope:'실제 Chromium headless 독립2프로필·웹 빌드·로컬 서버. 모바일/네트워크 지연/실제 백그라운드 탭 제한/VM ARM 검증 아님.',checks,errors,captures,
    hashes:Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await readFile(`${root}/${p}`)).digest('hex')])))};
  await writeFile(`${output}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
} finally { await Promise.all(browsers.map(b=>b.close()));server.kill('SIGTERM'); }
