const puppeteer = require('puppeteer');

(async () => {
  try {
    // Puppeteer ब्राउज़र लॉन्च करें
    const browser = await puppeteer.launch({
      headless: true, // Headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Sandbox disable options (Termux में आवश्यक)
    });

    // नया पेज खोलें
    const page = await browser.newPage();

    // MetaMask वेबसाइट पर जाएं
    await page.goto('https://metamask.io/');
    console.log('MetaMask website opened successfully.');

    // Example: किसी text या action को claim करने का process
    // अपनी automation script यहां लिखें
    const title = await page.title();
    console.log(`Page Title: ${title}`);

    // ब्राउज़र बंद करें
    await browser.close();
    console.log('Browser closed successfully.');
  } catch (error) {
    console.error('Error occurred:', error);
  }
})();
