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

  // Step 2：确保进入账号密码登录表单（fm2）
  await page.waitForSelector('#fm2');

  // 输入账号
  await page.type('#fm2 #username', username, { delay: 50 });

  // 输入密码
  await page.type('#fm2 #password', password, { delay: 50 });

  // 点击“立即登录”
  await page.click('#fm2 .input-box-button.m20');

  // 等待跳转
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Step 3：取 SSO Cookie
  const cookies = await page.cookies();

  // Step 4：带着 cookie 打开业务系统页面
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
