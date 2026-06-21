const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.url().includes('/api/tickets/call')) {
      console.log('CALL RESPONSE:', response.status(), response.statusText());
    }
  });

  await page.goto('http://localhost:3001/login');
  await page.type('input[type="email"]', 'admin@test.com');
  await page.type('input[type="password"]', '123456');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  console.log('Logged in to admin');

  // Create a ticket via API to avoid messing with tabs
  const axios = require('axios');
  const res = await axios.post('http://localhost:3000/api/tickets/create', {});
  console.log('Ticket created:', res.data);

  // Click call next
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('MARK SERVED'));
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Find toast
  const toast = await page.evaluate(() => {
    const el = document.querySelector('.toast-body');
    return el ? el.textContent : null;
  });
  console.log('Toast after call:', toast);

  await browser.close();
})();
