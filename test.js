const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });
  
  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.message);
  });
  
  await page.goto('file:///home/rkd/Downloads/post-designer (2)/post-designer/index.html', { waitUntil: 'networkidle0' });
  
  // Click text tab
  await page.click('.sidebar-tab[data-panel="text"]');
  await new Promise(r => setTimeout(r, 200));
  
  // Click add text button
  await page.click('#btnAddText');
  await new Promise(r => setTimeout(r, 200));
  
  // Click text template
  await page.click('.t-montserrat');
  await new Promise(r => setTimeout(r, 200));
  
  await browser.close();
  console.log('Test complete');
})();
