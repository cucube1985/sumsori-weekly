const {chromium}=require('C:/Users/21cra/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179');await page.waitForFunction(()=>!document.body.classList.contains('loading'),{timeout:25000});
 assert.equal(await page.getByRole('tab').count(),7);assert.match(await page.locator('#status').innerText(),/最新|최신|최근/);
 await page.getByRole('tab').nth(6).click();assert.match(await page.locator('#air').innerText(),/자료 없음/);
 await page.locator('#day6').press('ArrowLeft');assert.equal(await page.locator('#day5').getAttribute('aria-selected'),'true');
 await page.locator('#regionGroup').selectOption('gyeonggi');await page.waitForFunction(()=>!document.body.classList.contains('loading'),{timeout:25000});assert.equal(await page.locator('#region option').count(),5);
 await page.locator('#mapToggle').click();await page.locator('.map-cell').last().click();await page.waitForFunction(()=>!document.body.classList.contains('loading'),{timeout:25000});assert.match(await page.locator('#todayRegion').innerText(),/동부/);
 await page.locator('#indoor summary').click();await page.locator('#inTemp').fill('24');await page.locator('#inHumidity').fill('72');await page.locator('#washDays').fill('21');await page.locator('#leak').check();await page.getByRole('button',{name:'실내 조건 반영하기'}).click();assert.match(await page.locator('#moldOutput').innerText(),/환경 기반 예측 · 매우 높음/);
 await page.locator('#miteResult').selectOption('low');await page.locator('#miteDate').fill('2026-10-01');await page.locator('#mitePlace').fill('침구');await page.locator('#cfu').fill('0');await page.locator('#moldDate').fill('2026-10-01');await page.locator('#moldPlace').fill('침실');await page.locator('#agency').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'실내 조건 반영하기'}).click();assert.match(await page.locator('#moldOutput').innerText(),/전문기관 검사 · 단계 미분류/);assert.equal(await page.locator('#moldOutput img').count(),0);
 await page.reload();await page.waitForFunction(()=>!document.body.classList.contains('loading'),{timeout:25000});assert.equal(await page.locator('#inHumidity').inputValue(),'72');assert.match(await page.locator('#miteOutput').textContent(),/직접 측정 · 낮음/);
 await page.screenshot({path:'.openai/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'.openai/mobile.png',fullPage:true});
 await page.locator('#indoor summary').click();await page.locator('#clearIndoor').click();assert.match(await page.locator('#miteOutput').innerText(),/자료 없음/);assert.equal(await page.evaluate(()=>localStorage.getItem('sumsori-weekly-indoor-v1')),null);
 assert.deepEqual(errors,[]);console.log('BROWSER PASS: live forecast, tabs + keyboard, Gyeonggi switch, indoor prediction, lab zero, safe text, reload persistence, delete, mobile width.');
 const offline=await browser.newContext(),p2=await offline.newPage();await p2.route(/open-meteo\.com/,r=>r.abort());await p2.goto('http://127.0.0.1:4179');await p2.waitForFunction(()=>!document.body.classList.contains('loading'),{timeout:25000});assert.match(await p2.locator('#status').innerText(),/계절 경향만/);assert.equal(await p2.getByRole('tab').count(),7);assert.match(await p2.locator('#air').innerText(),/자료 없음/);console.log('BROWSER PASS: complete network failure leaves honest seasonal fallback with 7 dates.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
