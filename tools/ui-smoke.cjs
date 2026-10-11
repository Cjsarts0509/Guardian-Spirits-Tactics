// Run against an isolated local server, never the production game.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdirSync, writeFileSync, readdirSync } = require('node:fs');
const assert = require('node:assert/strict');
const output = process.env.UI_ARTIFACT_DIR || 'ui-artifacts';
const base = 'http://127.0.0.1:8799';
mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']}: {}) });
  const errors = [];
  const checks = [];
  let activePage;
  async function shot(page, name) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(i => i.complete));
    const broken = await page.locator('img').evaluateAll(images => images.filter(i => !i.naturalWidth).map(i => i.src));
    assert.deepEqual(broken, [], `${name}: missing images`);
    const outside=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,iw:innerWidth,ih:innerHeight}));
    assert(outside.w<=outside.iw+2&&outside.h<=outside.ih+2,`${name}: outer viewport overflow ${JSON.stringify(outside)}`);
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    checks.push(name);
  }
  try {
    for (const mode of ['왕자들의 내전', '태초의 전쟁', '리델루트 황야', '트롤 부족의 반란']) {
      const index = checks.filter(n => n.endsWith('-battle')).length;
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      activePage = page;
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(base);
      await page.getByRole('button', { name: '게스트로 입장', exact: true }).waitFor();
      if (!index) {
        // Decode all shipped UI images, including rarely used skills and result banners.
        const assets = readdirSync('apps/client/public/ui', { recursive: true }).filter(p => /\.(png|webp)$/.test(p));
        for (let i = 0; i < assets.length; i += 8) {
          const bad = await page.evaluate(async paths => {
            const results = await Promise.all(paths.map(async path => {
              const image = new Image(); image.src = '/ui/' + path;
              try { await image.decode(); return null; } catch { return path; }
            }));
            return results.filter(Boolean);
          }, assets.slice(i, i + 8));
          assert.deepEqual(bad, [], 'All UI assets must decode in Chromium');
        }
        await shot(page, 'login');
      }
      await page.getByPlaceholder('닉네임', { exact: true }).fill(`UI검증${index}`);
      await page.getByRole('button', { name: '게스트로 입장', exact: true }).click();
      await page.getByRole('heading', { name: '대기실', exact: true }).waitFor();
      if (!index) {
        await shot(page, 'lobby');
        await page.getByRole('button', { name: '내 정보 · 설정' }).click();
        await page.getByText('게스트의 계정 전적은 저장되지 않습니다.', { exact: false }).waitFor();
        await shot(page, 'guest-profile');await page.getByRole('button',{name:'소리 설정',exact:true}).click();await page.getByLabel('버튼 효과음',{exact:true}).selectOption('interface/click_001.ogg');await page.getByRole('button',{name:'버튼 클릭 1 듣기',exact:true}).click();assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('gst.sfx')).choices.ui_click))==='interface/click_001.ogg','sound selection persistence');await shot(page,'sound-settings');
        await page.getByRole('button', { name: '닫기', exact: true }).click();
        await page.clock.install();await page.clock.fastForward(30*60*1000+16000);await page.getByRole('button',{name:'게스트로 입장',exact:true}).waitFor();await page.clock.resume();await page.getByPlaceholder('닉네임',{exact:true}).fill(`UI검증${index}`);await page.getByRole('button',{name:'게스트로 입장',exact:true}).click();await page.getByRole('heading',{name:'대기실',exact:true}).waitFor();
      }
      await page.getByRole('button', { name: '＋ 방 만들기', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '방 만들기' });
      await dialog.getByRole('button', { name: mode, exact: false }).click();
      await dialog.getByLabel('방 제목', { exact: true }).fill(`화면 검증 ${index}`);
      await dialog.getByLabel('최대 인원', { exact: true }).selectOption('8');
      if (!index) {await shot(page,'create-room');await page.mouse.click(1,1);assert(await dialog.isVisible(),'outside click must not close create dialog');}
      await dialog.getByRole('button', { name: '방 만들기', exact: true }).click();
      for (let slot = 2; slot <= 8; slot++) await page.getByLabel(`${slot}번 슬롯 종류`, { exact: true }).selectOption('ai');
      await page.getByRole('button', { name: '준비', exact: true }).click();
      await page.getByRole('button', { name: '준비 취소', exact: true }).waitFor();
      await shot(page, `${index}-ready`);
      await page.getByRole('button', { name: '게임 시작', exact: true }).click();
      await page.getByRole('timer').waitFor();
      assert(await page.getByRole('timer').innerText() !== '0', 'Countdown must not skip on a new client');
      await page.getByRole('button', { name: '역할 랜덤 배분', exact: true }).waitFor({ timeout: 10000 });
      if(index===1)await page.getByLabel('플레이어 이름',{exact:true}).selectOption('anonymous');
      await page.getByRole('button', { name: '역할 랜덤 배분', exact: true }).click();
      await page.getByAltText('카드 뒷면').first().waitFor();
      await shot(page, `${index}-shuffle`);
      await page.getByRole('button', { name: '역할 확인', exact: true }).waitFor();
      await page.locator('.reveal .character-frame').waitFor();
      assert.equal(await page.locator('.staging-role .character-frame').count(),0,'role must remain hidden behind reveal until confirmation');
      await shot(page, `${index}-reveal`);
      await page.getByRole('button', { name: '역할 확인', exact: true }).click();
      await page.getByLabel('채팅 메시지', { exact: true }).fill('역할 배분 후 대화 확인');
      await page.getByRole('button', { name: '전송', exact: true }).click();
      await page.getByText('역할 배분 후 대화 확인', { exact: false }).waitFor();
      await page.getByRole('button', { name: '전투 시작', exact: true }).click();
      await page.locator('.game .my-skill-grid').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('.players .character-frame').length === 8);
      assert(await page.getByAltText('정체 미공개', { exact: true }).count() >= 7, 'Opponent identities must remain hidden');
      assert.equal(await page.locator('.players>.pcard').count(),12,'battle always has 12 slots');
      if(index===1)assert(!(await page.locator('.players').innerText()).includes(`UI검증${index}`),'anonymous nickname leaked');
      if(!index){
        const icon=page.locator('.my-skill-grid .tooltip-anchor').first();await icon.hover();await page.getByRole('tooltip').waitFor();
        const tip=await page.getByRole('tooltip').boundingBox();assert(tip.x>=0&&tip.y>=0&&tip.x+tip.width<=1440&&tip.y+tip.height<=1000,'tooltip viewport clamp');
        await page.mouse.move(1420,980);await page.locator('.players .pcard').nth(1).click({button:'right',position:{x:20,y:20}});await page.getByRole('menu').waitFor();
        const menu=await page.getByRole('menu').boundingBox();assert(menu.x>=0&&menu.y>=0&&menu.x+menu.width<=1440&&menu.y+menu.height<=1000,'menu viewport clamp');
        await page.keyboard.press('Escape');await page.mouse.click(5,5);
        await page.setViewportSize({width:1366,height:768});await shot(page,'battle-1366');await page.setViewportSize({width:1920,height:1080});await shot(page,'battle-1920');await page.setViewportSize({width:1440,height:1000});
      }
      await shot(page, `${index}-battle`);
      await page.setViewportSize({ width: 390, height: 844 });
      await shot(page, `${index}-mobile`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      assert(!overflow, `${mode}: mobile horizontal overflow`);
      // The isolated fixture ends the match through normal forfeiture handling.
      // Results, replay requests and controls still use real browser/server transport.
      await page.setViewportSize({ width: 1440, height: 1000 });
      const finish = await fetch('http://127.0.0.1:8800/finish', { method: 'POST' });
      assert(finish.ok, `fixture finish failed: ${await finish.text()}`);
      await page.locator('.result-cinematic').waitFor();const cinemaAt=Date.now();
      await page.getByRole('heading', { name: '전장의 복기', exact: true }).waitFor();assert(Date.now()-cinemaAt>=4500,'5-second result cinema');
      await page.waitForFunction(() => document.querySelectorAll('.replay-roster .character-frame').length === 8);
      assert.equal(await page.getByAltText('정체 미공개', { exact: true }).count(), 0, 'Replay must show all identities');
      assert(await page.locator('.replay-events').innerText(), 'Replay log must contain events');
      if(!index){await page.getByRole('button',{name:'채팅',exact:true}).click();await page.getByLabel('채팅 메시지',{exact:true}).fill('복기 중 대화');await page.getByRole('button',{name:'전송',exact:true}).click();await page.getByText('복기 중 대화',{exact:false}).waitFor();await page.getByLabel('채팅창 불투명도',{exact:true}).fill('0.5');const header=page.locator('.replay-chat-handle');const h=await header.boundingBox();await page.mouse.move(h.x+30,h.y+20);await page.mouse.down();await page.mouse.move(h.x-150,h.y-100);await page.mouse.up();await shot(page,'replay-chat');await header.getByRole('button').click();}
      await shot(page, `${index}-results`);
      const timeline = page.getByLabel('복기 시간', { exact: true });
      const end = Number(await timeline.getAttribute('max'));
      assert(end > 0, 'Replay needs a nonzero duration');
      await page.getByRole('button', { name: '처음', exact: true }).click();
      assert.equal(await timeline.inputValue(), '0');
      await page.getByLabel('재생 속도', { exact: true }).selectOption('16');
      await page.getByRole('button', { name: '재생', exact: true }).click();
      await page.waitForFunction(() => Number(document.querySelector('[aria-label="복기 시간"]').value) > 0);
      await page.getByRole('button', { name: '재생', exact: true }).waitFor({ timeout: 10000 });
      assert.equal(Number(await timeline.inputValue()), end, 'Playback must stop at the final frame');
      await page.getByLabel('로그 종류', { exact: true }).selectOption('attack');
      assert(await page.locator('.replay-events .replay-event').count() > 0, 'Forfeits must appear in death filter');
      await page.getByLabel('로그 종류', { exact: true }).selectOption('all');
      await timeline.focus();
      await timeline.press('Home');
      assert.equal(await timeline.inputValue(), '0', 'Keyboard seek must reach the first frame');
      await shot(page, `${index}-replay-start`);
      await page.setViewportSize({ width: 390, height: 844 });
      await shot(page, `${index}-results-mobile`);
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), `${mode}: results mobile horizontal overflow`);
      await page.getByRole('button', { name: '대기실로', exact: true }).click();
      await page.getByRole('heading', { name: '대기실', exact: true }).waitFor();
      await context.close();
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true });
      writeFileSync(`${output}/failure.html`, await activePage.content());
    }
    throw error;
  } finally {
    writeFileSync(`${output}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
