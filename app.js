const fs = require('fs');
const puppeteer = require('puppeteer');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getExecutablePath() {
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }

  const defaultPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  return defaultPaths.find(browserPath => fs.existsSync(browserPath));
}

async function captureDebug(page, name) {
  const debugDir = process.env.DEBUG_DIR || '/tmp';
  fs.mkdirSync(debugDir, { recursive: true });

  const screenshotPath = `${debugDir}/${name}.png`;
  const htmlPath = `${debugDir}/${name}.html`;

  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(htmlPath, await page.content());

  console.log(`${name} URL:`, page.url());
  console.log(`${name} title:`, await page.title());
  console.log(`${name} screenshot:`, screenshotPath);
  console.log(`${name} html:`, htmlPath);
}

async function getGWSession() {
  const launchOptions = {
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };

  const executablePath = getExecutablePath();
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  let browser;

  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    const loginURL =
      'https://sso.300.cn/CAS/login?service=https%3A%2F%2Fnew2023032411251363380.fastindexs.com%2Fnpgw%2Fvisitormanager%2Fintelligent%2Fmanager%2FfindBatchUserInfoList%3Fbackurl%3Dhttps%253A%252F%252Fnew2023032411251363380.fastindexs.com%252Fnpmanager%252Fhome%253Finstance%253DNEW2025092314063500326%26instance%3DNEW2025092314063500326%26tenantId%3D412049%26authCheck%3Dtrue%253F%26tenantIdStr%3D412044%252C412045%252C412046%252C412047%252C412048%252C412049%252C412050';

    console.log('Opening SSO login page...');
    await page.goto(loginURL, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await sleep(1500);
    await captureDebug(page, 'sso-after-goto');

    try {
      console.log('Clicking account login tab...');
      await page.waitForSelector('#first-login .tab-item[name="member"]', {
        visible: true,
        timeout: 10000,
      });
      await page.click('#first-login .tab-item[name="member"]');
      await sleep(800);
    } catch (e) {
      console.log('Account login tab was not clicked, probably already selected:', e.message);
    }

    let username = process.env.SSO_USERNAME || '';
    let password = process.env.SSO_PASSWORD || '';
    username = username.replace(/^"(.*)"$/, '$1');
    password = password.replace(/^"(.*)"$/, '$1');

    console.log('Using username:', username);

    console.log('Typing username into #username...');
    try {
      await page.waitForSelector('#username', { visible: true, timeout: 30000 });
    } catch (e) {
      await captureDebug(page, 'sso-username-missing');
      throw e;
    }
    await page.click('#username', { clickCount: 3 });
    await page.type('#username', username, { delay: 50 });

    console.log('Typing password into #password...');
    await page.waitForSelector('#password', { visible: true });
    await page.click('#password', { clickCount: 3 });
    await page.type('#password', password, { delay: 50 });

    console.log('Clicking login button...');
    await page.waitForSelector('.input-box-button', { visible: true });
    await page.click('.input-box-button');

    console.log('Waiting for login result...');
    await page
      .waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 60000,
      })
      .catch(() => {
        console.log('No full navigation after login, continuing in case login used Ajax.');
      });

    console.log('Getting cookies after login...');
    const cookies = await page.cookies();

    const targetPage = await browser.newPage();
    await targetPage.setCookie(...cookies);

    const homeURL =
      'https://new2023032411251363380.fastindexs.com/npmanager/home?instance=NEW2025092314063500326';

    console.log('Opening target page...');
    await targetPage.goto(homeURL, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const targetCookies = await targetPage.cookies();

    console.log('Current target page cookies:');
    console.log(targetCookies);

    return targetCookies;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  getGWSession()
    .then(value => console.log('Final result =', value))
    .catch(err => console.error(err));
}

module.exports = getGWSession;
