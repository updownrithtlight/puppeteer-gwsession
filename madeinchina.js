const fs = require('fs');
const puppeteer = require('puppeteer');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripEnvQuotes(value) {
  return (value || '').replace(/^"(.*)"$/, '$1');
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

async function clickFirstVisible(page, selectors, timeout = 3000) {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout });
      await page.click(selector);
      return selector;
    } catch (error) {
      // Try the next selector. Login pages change markup often.
    }
  }

  return null;
}

async function typeFirstVisible(page, selectors, value, label) {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 8000 });
      await page.click(selector, { clickCount: 3 });
      await page.type(selector, value, { delay: 40 });
      console.log(`Typed ${label} into ${selector}`);
      return selector;
    } catch (error) {
      // Try the next selector.
    }
  }

  await captureDebug(page, `madeinchina-${label}-missing`);
  throw new Error(`Could not find visible Made-in-China ${label} input.`);
}

async function waitForMadeInChinaLogin(page) {
  const waitSeconds = Number(process.env.MIC_MANUAL_LOGIN_TIMEOUT_SECONDS || 120);
  const deadline = Date.now() + waitSeconds * 1000;

  while (Date.now() < deadline) {
    const cookies = await page.cookies();
    const hasLoginCookie = cookies.some(cookie => {
      const name = cookie.name.toLowerCase();
      return (
        name.includes('session') ||
        name.includes('token') ||
        name.includes('auth') ||
        name.includes('login') ||
        name.includes('member') ||
        name.includes('mic')
      );
    });

    const currentUrl = page.url();
    if (hasLoginCookie && !currentUrl.includes('/sign-in')) {
      return;
    }

    await sleep(1000);
  }

  throw new Error(
    `Made-in-China login did not complete within ${waitSeconds}s. If captcha or email code appeared, complete it in the browser or increase MIC_MANUAL_LOGIN_TIMEOUT_SECONDS.`
  );
}

async function getMadeInChinaCookies() {
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

    const loginUrl = process.env.MIC_LOGIN_URL || 'https://login.made-in-china.com/';
    const targetUrl = process.env.MIC_TARGET_URL || 'https://www.made-in-china.com/';
    const username = stripEnvQuotes(process.env.MIC_USERNAME);
    const password = stripEnvQuotes(process.env.MIC_PASSWORD);

    if (!username || !password) {
      throw new Error('MIC_USERNAME and MIC_PASSWORD are required.');
    }

    console.log('Opening Made-in-China login page...');
    await page.goto(loginUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await sleep(1000);
    await captureDebug(page, 'madeinchina-after-goto');

    await clickFirstVisible(page, [
      'a[href*="sign-in"]',
      'button[data-role*="sign"]',
      '.sign-in',
      '.login',
    ]);

    await typeFirstVisible(
      page,
      [
        '#logonInfo\\.logUserName',
        'input[name="logonInfo.logUserName"]',
        'input[name="account"]',
        'input[name="email"]',
        'input[name="logonId"]',
        'input[type="email"]',
        'input[type="text"]',
      ],
      username,
      'username'
    );

    await typeFirstVisible(
      page,
      [
        '#logonInfo\\.logPassword',
        'input[name="logonInfo.logPassword"]',
        'input[name="password"]',
        'input[name="passwd"]',
        'input[type="password"]',
      ],
      password,
      'password'
    );

    const clickedSelector = await clickFirstVisible(
      page,
      [
        '#sign-in-submit',
        'button[type="submit"]',
        'input[type="submit"]',
        '.login-btn',
        '.sign-in-btn',
        '.btn-sign-in',
        '.btn-login',
      ],
      8000
    );

    if (!clickedSelector) {
      await captureDebug(page, 'madeinchina-login-button-missing');
      throw new Error('Could not find Made-in-China sign-in button.');
    }

    console.log(`Clicked Made-in-China login button: ${clickedSelector}`);
    await page
      .waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 20000,
      })
      .catch(() => {
        console.log('No full navigation after Made-in-China login, checking cookies/manual verification.');
      });

    await waitForMadeInChinaLogin(page);

    const targetPage = await browser.newPage();
    const cookies = await page.cookies();
    await targetPage.setCookie(...cookies);

    console.log('Opening Made-in-China target page...');
    await targetPage.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const targetCookies = await targetPage.cookies();
    console.log('Current Made-in-China target page cookies:');
    console.log(targetCookies);

    return targetCookies;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  getMadeInChinaCookies()
    .then(value => console.log('Final result =', value))
    .catch(err => console.error(err));
}

module.exports = getMadeInChinaCookies;
