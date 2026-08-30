const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const outDir = path.resolve(__dirname, '..', 'readme_images');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

  // 1. Landing Page (Clean Hero)
  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:5173/?clean=true', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '01_landing_hero.png'), fullPage: false });

  // 2. Workspace Selector
  console.log('2. Capturing Workspace Selector...');
  await page.goto('http://localhost:5173/workspace', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, '02_workspace_selector.png'), fullPage: false });

  // 3. Projects Portfolio
  console.log('3. Capturing Projects Portfolio...');
  await page.goto('http://localhost:5173/projects', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, '03_projects_portfolio.png'), fullPage: false });

  // 4. Incident Intake Modal
  console.log('4. Capturing Incident Intake Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const newBtn = btns.find((b) => b.textContent && (b.textContent.includes('NEW REPORT') || b.textContent.includes('NEW INCIDENT')));
    if (newBtn) newBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '04_incident_intake_modal.png'), fullPage: false });

  // Close modal
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));

  // 5. Project Telemetry & Tom Copilot Drawer
  console.log('5. Capturing Project Telemetry & Tom AI Copilot Drawer...');
  await page.goto('http://localhost:5173/projects/PAY', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200));

  // Open the Tom AI Copilot Drawer
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const tomBtn = btns.find((b) => b.textContent && (b.textContent.includes('TOM') || b.textContent.includes('AI') || b.textContent.includes('COPILOT')));
    if (tomBtn) tomBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Click SLA Bottleneck in drawer if available
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const diagBtn = buttons.find((b) => b.textContent && (b.textContent.includes('SLA BOTTLENECK') || b.textContent.includes('DUPLICATE RADAR')));
    if (diagBtn) diagBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(outDir, '05_project_telemetry_and_ai_copilot.png'), fullPage: false });

  console.log('SUCCESS: All 5 screenshots updated in readme_images/');
  await browser.close();
}

capture().catch((e) => {
  console.error('Capture error:', e);
  process.exit(1);
});
