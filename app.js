const puppeteer = require('puppeteer');

async function getGWSession() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 模拟正常浏览器 UA，避免被识别成奇怪客户端
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Step 1：打开 SSO 登录页
  const loginUrl =
    'https://sso.300.cn/CAS/login?service=https%3A%2F%2Fnew-api-console.300.cn%2Fapi-portal%2Fsecurity%2Fmenu%2FgetHomeMenus';

  await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  const username = process.env.SSO_USERNAME;
  const password = process.env.SSO_PASSWORD;

  if (!username || !password) {
    throw new Error('环境变量 SSO_USERNAME / SSO_PASSWORD 未设置');
  }

  // Step 2：等待账号密码登录表单出现
  // 根据你截图的 DOM：form id="fm2"，里面有一个 text 和一个 password 输入框
  await page.waitForSelector('#fm2 input[type="text"]', { timeout: 30000 });
  await page.waitForSelector('#fm2 input[type="password"]', { timeout: 30000 });

  // 找到用户名输入框和密码输入框
  const usernameSelector = '#fm2 input[type="text"]';
  const passwordSelector = '#fm2 input[type="password"]';

  // 先清空一下（防止页面上已有默认值）
  await page.click(usernameSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');

  await page.type(usernameSelector, username, { delay: 30 });

  await page.click(passwordSelector, { clickCount: 3 });
  await page.keyboard.press('Backspace');

  await page.type(passwordSelector, password, { delay: 30 });

  // Step 3：点击“立即登录”
  // 对应你截图里的：
  // <input type="button" class="input-box-button m20" onclick="loginCheck();" value="立即登录">
  await page.waitForSelector('input.input-box-button.m20', { timeout: 30000 });
  await page.click('input.input-box-button.m20');

  // Step 4：等待跳转（CAS 登录成功后会跳回 service 地址）
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

  // Step 5：取 SSO Cookie
  const cookies = await page.cookies();

  // Step 6：带着 cookie 打开业务系统页面
  const targetPage = await browser.newPage();
  await targetPage.setCookie(...cookies);

  await targetPage.goto(
    'https://new2023032411251363380.fastindexs.com/npmanager/home?instance=NEW2025092314063500326',
    { waitUntil: 'networkidle2', timeout: 60000 }
  );

  const targetCookies = await targetPage.cookies();
  const gwSession = targetCookies.find(c => c.name === 'GWSESSION');

  await browser.close();

  if (!gwSession) {
    throw new Error('未获取到 GWSESSION，可能未成功登录');
  }

  return gwSession.value;
}

module.exports = getGWSession;
