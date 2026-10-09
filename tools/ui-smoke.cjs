// Run against an isolated local server, never the production game.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const output = process.env.UI_ARTIFACT_DIR || 'ui-artifacts';
const base = 'http://127.0.0.1:8799';
mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const checks = [];
  let activePage;
  async function shot(page, name) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(i => i.complete));
    const broken = await page.locator('img').evaluateAll(images => images.filter(i => !i.naturalWidth).map(i => i.src));
    assert.deepEqual(broken, [], `${name}: missing images`);
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
      if (!index) await shot(page, 'login');
      await page.getByPlaceholder('닉네임', { exact: true }).fill(`UI검증${index}`);
      await page.getByRole('button', { name: '게스트로 입장', exact: true }).click();
      await page.getByRole('heading', { name: '대기실', exact: true }).waitFor();
      if (!index) {
        await shot(page, 'lobby');
        await page.getByRole('button', { name: '내 정보 · 전적' }).click();
        await page.getByText('게스트는 계정 전적이 저장되지 않습니다.', { exact: false }).waitFor();
        await shot(page, 'guest-profile');
        await page.getByRole('button', { name: '닫기', exact: true }).click();
      }
      await page.getByRole('button', { name: '＋ 방 만들기', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '방 만들기' });
      await dialog.getByRole('button', { name: mode, exact: false }).click();
      await dialog.getByLabel('방 제목', { exact: true }).fill(`화면 검증 ${index}`);
      await dialog.getByLabel('최대 인원', { exact: true }).selectOption('8');
      if (!index) await shot(page, 'create-room');
      await dialog.getByRole('button', { name: '방 만들기', exact: true }).click();
      for (let slot = 2; slot <= 8; slot++) await page.getByLabel(`${slot}번 슬롯 종류`, { exact: true }).selectOption('ai');
      await page.getByRole('button', { name: '준비', exact: true }).click();
      await page.getByRole('button', { name: '준비 취소', exact: true }).waitFor();
      await shot(page, `${index}-ready`);
      await page.getByRole('button', { name: '게임 시작', exact: true }).click();
      await page.getByRole('timer').waitFor();
      assert(await page.getByRole('timer').innerText() !== '0', 'Countdown must not skip on a new client');
      await page.getByRole('button', { name: '역할 랜덤 배분', exact: true }).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '역할 랜덤 배분', exact: true }).click();
      await page.getByAltText('카드 뒷면').first().waitFor();
      await shot(page, `${index}-shuffle`);
      await page.getByRole('button', { name: '역할 확인', exact: true }).waitFor();
      await page.locator('.reveal .character-frame').waitFor();
      await shot(page, `${index}-reveal`);
      await page.getByRole('button', { name: '역할 확인', exact: true }).click();
      await page.getByLabel('채팅 메시지', { exact: true }).fill('역할 배분 후 대화 확인');
      await page.getByRole('button', { name: '전송', exact: true }).click();
      await page.getByText('역할 배분 후 대화 확인', { exact: false }).waitFor();
      await page.getByRole('button', { name: '전투 시작', exact: true }).click();
      await page.locator('.game .skillbar').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelectorAll('.players .character-frame').length === 8);
      assert(await page.getByAltText('정체 미공개', { exact: true }).count() >= 7, 'Opponent identities must remain hidden');
      await shot(page, `${index}-battle`);
      await page.setViewportSize({ width: 390, height: 844 });
      await shot(page, `${index}-mobile`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      assert(!overflow, `${mode}: mobile horizontal overflow`);
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
