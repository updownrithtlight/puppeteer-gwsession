const puppeteer = require('puppeteer');
const fs = require('fs');

async function getGWSession() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Step 1: 登录 SSO 平台
  await page.goto('https://sso.300.cn/CAS/login?service=https%3A%2F%2Fnew-api-console.300.cn%2Fapi-portal%2Fsecurity%2Fmember%2FgetIndexMemberInfo%3F_t%3D1763957223893%26backurl%3Dhttps%253A%252F%252Fnew-console.300.cn%252Fproduct%252Fmenhu');
  await page.waitForSelector('div.tab-item[name="member"]');
  await page.click('div.tab-item[name="member"]');

  const username = process.env.SSO_USERNAME;
  const password = process.env.SSO_PASSWORD;

  await page.type('#username', username);
  await page.type('#password', password);
  await page.click('.input-box-button');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // 获取 Step 1 登录后的 Cookie
  const cookies = await page.cookies();

  // Step 2: 访问目标页面
  const targetPage = await browser.newPage();
  await targetPage.setCookie(...cookies);
  await targetPage.goto('https://new2023032411251363380.fastindexs.com/npmanager/home?instance=NEW2023032411251363380', {
    waitUntil: 'networkidle2',
  });

  const targetCookies = await targetPage.cookies();
  const gwSession = targetCookies.find(c => c.name === 'GWSESSION');

  await browser.close();

  if (gwSession) {
    return gwSession.value;
  } else {
    throw new Error('❌ 未获取到 GWSESSION');
  }
}

module.exports = getGWSession;
