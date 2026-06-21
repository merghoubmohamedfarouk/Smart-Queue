import puppeteer from 'puppeteer';
import axios from 'axios';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('http://localhost:3001/login');
    await page.type('input[type="email"]', 'admin@test.com');
    await page.type('input[type="password"]', '123456');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('Logged in to admin');

    // Create ticket
    const res = await axios.post('http://localhost:3000/api/tickets/create', {});
    console.log('Ticket created:', res.data);
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // Click call
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const callBtn = btns.find(b => b.textContent.includes('MARK SERVED'));
      if (callBtn) {
        console.log('Found button, clicking...');
        callBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    const toast = await page.evaluate(() => {
      const el = document.querySelector('.toast-body');
      return el ? el.textContent : null;
    });
    console.log('Toast after call:', toast);

    await browser.close();
  } catch (e) {
    console.error(e);
  }
})();
