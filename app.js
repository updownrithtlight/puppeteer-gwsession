const puppeteer = require('puppeteer');

// 简单的 sleep，避免用 waitFor / waitForTimeout 这些版本不兼容的 API
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGWSession() {
  const browser = await puppeteer.launch({
    headless: false, // ✅ 现在可以放心用有头模式（画在 Xvfb 上）
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
 

  const page = await browser.newPage();

  const loginURL =
    'https://sso.300.cn/CAS/login?service=https%3A%2F%2Fnew2023032411251363380.fastindexs.com%2Fnpgw%2Fvisitormanager%2Fintelligent%2Fmanager%2FfindBatchUserInfoList%3Fbackurl%3Dhttps%253A%252F%252Fnew2023032411251363380.fastindexs.com%252Fnpmanager%252Fhome%253Finstance%253DNEW2025092314063500326%26instance%3DNEW2025092314063500326%26tenantId%3D412049%26authCheck%3Dtrue%253F%26tenantIdStr%3D412044%252C412045%252C412046%252C412047%252C412048%252C412049%252C412050';

  console.log('⏳ 打开 SSO 登录页...');
  await page.goto(loginURL, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  await sleep(1500);

  // Step 1: 保底点一下「账号登录」tab
  try {
    console.log('🖱 点击账号登录 tab...');
    await page.waitForSelector('#first-login .tab-item[name="member"]', { visible: true, timeout: 10000 });
    await page.click('#first-login .tab-item[name="member"]');
    await sleep(800);
  } catch (e) {
    console.log('⚠️ 没点到账号登录 tab（可能默认就是账号登录）：', e.message);
  }

  // 读环境变量（顺便把多余的引号去掉）
  let username = process.env.SSO_USERNAME || '';
  let password = process.env.SSO_PASSWORD || '';
  username = username.replace(/^"(.*)"$/, '$1');
  password = password.replace(/^"(.*)"$/, '$1');

  console.log('👤 使用账号：', username);
  console.log('⌨  使用密码：', password);

  // Step 2: 直接用 #username / #password
  console.log('⌨ 输入账号 #username...');
  await page.waitForSelector('#username', { visible: true, timeout: 30000 });
  await page.click('#username', { clickCount: 3 }); // 选中原内容
  await page.type('#username', username, { delay: 50 });

  console.log('⌨ 输入密码 #password...');
  await page.waitForSelector('#password', { visible: true });
  await page.click('#password', { clickCount: 3 });
  await page.type('#password', password, { delay: 50 });

  console.log('🖱 点击登录按钮 .input-box-button...');
  await page.waitForSelector('.input-box-button', { visible: true });
  await page.click('.input-box-button');

  console.log('⏳ 等待登录结果...');
  await page
    .waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: 60000,
    })
    .catch(() => {
      console.log('⚠️ 登录可能是 Ajax，无完整跳转，忽略导航等待');
    });

  // Step 3: 拿 Cookie
  console.log('🍪 获取登录后的 Cookie...');
  const cookies = await page.cookies();

  const targetPage = await browser.newPage();
  await targetPage.setCookie(...cookies);

  const homeURL =
    'https://new2023032411251363380.fastindexs.com/npmanager/home?instance=NEW2025092314063500326';

  console.log('⏳ 打开目标页面...');
  await targetPage.goto(homeURL, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  const targetCookies = await targetPage.cookies();

  console.log("📌 当前页面所有 cookies:");
  console.log(targetCookies);
 
  return targetCookies;
}

// 直接执行该文件时自动跑一遍
if (require.main === module) {
  getGWSession()
    .then(v => console.log('最终结果 =', v))
    .catch(err => console.error(err));
}

module.exports = getGWSession;
