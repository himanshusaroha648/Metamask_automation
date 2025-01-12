const puppeteer = require('puppeteer');

// Path to the MetaMask extension
const METAMASK_PATH = '/path/to/metamask/extension';

// Football club platform URL
const FOOTBALL_CLUB_URL = 'https://onefootballclub.example.com';

// Common referral code to be used for all accounts
const referralCode = "YOUR_REFERRAL_CODE"; // Replace with your actual referral code

// Function to automate daily claims and account switching
async function automateDailyClaim() {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${METAMASK_PATH}`,
            `--load-extension=${METAMASK_PATH}`,
        ],
    });

    const pages = await browser.pages();
    const page = pages[0]; // Main browser page

    // Go to the football club platform
    await page.goto(FOOTBALL_CLUB_URL, { waitUntil: 'networkidle0' });

    // Loop through all MetaMask accounts (adjust this loop for the number of accounts)
    for (let accountIndex = 0; accountIndex < 50; accountIndex++) {
        console.log(`Switching to MetaMask account ${accountIndex + 1} with referral code ${referralCode}...`);

        // Open MetaMask popup for switching accounts
        const metamaskPage = await browser.newPage();
        await metamaskPage.goto('chrome-extension://<MetaMask-ID>/popup.html'); // Update MetaMask extension ID
        await metamaskPage.waitForSelector('.account-menu__icon'); // Update with the correct selector
        await metamaskPage.click('.account-menu__icon');

        // Select the desired account
        const accountSelector = `.account-list-item:nth-child(${accountIndex + 1})`; // Adjust based on MetaMask's UI
        await metamaskPage.waitForSelector(accountSelector);
        await metamaskPage.click(accountSelector);

        console.log(`Account ${accountIndex + 1} selected.`);
        await metamaskPage.close();

        // Submit the referral code (only once for all accounts)
        console.log(`Submitting referral code: ${referralCode}...`);
        await page.waitForSelector('#referral-code-input'); // Replace with the actual input field selector for referral code
        await page.type('#referral-code-input', referralCode); // Input referral code
        await page.click('#submit-referral-button'); // Click submit (replace with actual button selector)

        // Claim the daily reward
        console.log('Claiming daily reward...');
        await page.waitForSelector('#daily-claim-button'); // Replace with actual button selector
        await page.click('#daily-claim-button');

        // Wait for the claim to process
        await page.waitForTimeout(5000); // Adjust delay if needed
    }

    console.log('Daily claim completed for all accounts!');
    await browser.close();
}

automateDailyClaim().catch(console.error);
