const puppeteer = require('puppeteer');

async function getGWSession() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Step 1：打开 SSO 登录页
  await page.goto(
    'https://sso.300.cn/CAS/login?service=https%3A%2F%2Fnew-api-console.300.cn%2Fapi-portal%2Fsecurity%2Fmenu%2FgetHomeMenus',
    { waitUntil: 'networkidle2' }
  );

  const username = process.env.SSO_USERNAME;
  const password = process.env.SSO_PASSWORD;

  // Step 2：输入账号（通过 placeholder）
  await page.waitForSelector('input[placeholder="请输入账号"]');
  await page.type('input[placeholder="请输入账号"]', username, { delay: 30 });

  // Step 3：输入密码
  await page.type('input[placeholder="请输入密码"]', password, { delay: 30 });

  // Step 4：点击“立即登录”
  await page.waitForSelector('input.input-box-button.m20');
  await page.click('input.input-box-button.m20');

  // Step 5：等待跳转
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Step 6：取 SSO Cookie
  const cookies = await page.cookies();

  // Step 7：带 cookie 打开业务系统
  const targetPage = await browser.newPage();
  await targetPage.setCookie(...cookies);

  await targetPage.goto(
    'https://new2023032411251363380.fastindexs.com/npmanager/home?instance=NEW2025092314063500326',
    { waitUntil: 'networkidle2' }
  );

  const targetCookies = await targetPage.cookies();
  const gwSession = targetCookies.find(c => c.name === 'GWSESSION');

  await browser.close();

  if (!gwSession) throw new Error('❌ 未获取到 GWSESSION');

  return gwSession.value;
}

module.exports = getGWSession;
