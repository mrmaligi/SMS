const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

async function runTest() {
  console.log('Launching browser test...');
  const browser = await chromium.launch({ headless: true }); // Headless mode so it runs silently
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Visit Login page
    console.log('Navigating to http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    console.log('Verifying Login screen elements...');
    const title = await page.textContent('h1');
    if (!title.includes('LabKey Portal')) {
      throw new Error(`Expected login page title, got: ${title}`);
    }

    // 2. Perform Login
    console.log('Entering admin credentials...');
    await page.fill('#username-input', process.env.ADMIN_USERNAME || 'admin');
    await page.fill('#password-input', process.env.ADMIN_PASSWORD || 'adminpassword123');
    
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    console.log('Logged in successfully! Navigated to Dashboard.');

    // 3. Verify Dashboard Loads Products
    await page.waitForLoadState('networkidle');
    console.log('Verifying metrics and product list...');
    
    const productRowsCount = await page.locator('tbody tr').count();
    console.log(`Successfully loaded ${productRowsCount} product rows in the dashboard table.`);
    if (productRowsCount === 0) {
      throw new Error('No products loaded in the dashboard table.');
    }

    // 4. Test Manual Stock Adjustment
    console.log('Opening manual stock adjustment modal...');
    // Click manual adjustment button for the first product
    await page.click('tbody tr:first-child button:has-text("Adjust")');
    
    console.log('Entering adjustment details (+5 quantity)...');
    await page.fill('input[type="number"]', '5');
    await page.fill('textarea', 'Playwright automated verification adjustment');
    
    console.log('Submitting manual adjustment...');
    await page.click('button:has-text("Apply Adjustment")');
    await page.waitForTimeout(2000); // Wait for API response and refresh
    console.log('Manual adjustment completed!');

    // 5. Test AI Invoice OCR Parsing
    console.log('Navigating to http://localhost:3000/dashboard/upload...');
    await page.goto('http://localhost:3000/dashboard/upload');
    await page.waitForLoadState('networkidle');

    // Choose the first sample invoice PDF from the Labkey folder
    const sampleInvoicePath = path.join('C:', 'Users', 'PC', 'OneDrive', 'Desktop', 'Labkey', '251008-056945.pdf');
    console.log(`Setting file upload to: ${sampleInvoicePath}`);
    
    // Set file input
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('div.border-dashed');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(sampleInvoicePath);
    console.log('Invoice uploaded in UI. Click "Extract & Match SKUs" to call Gemini...');

    // Click Parse button
    await page.click('#parse-invoice-btn');
    
    // Gemini parsing can take a few seconds, wait for reconciliation container to appear
    console.log('Waiting for Gemini to parse invoice (OCR + matching)...');
    await page.waitForSelector('#submit-reconciliation-btn', { timeout: 60000 });
    console.log('Gemini finished parsing! Reviewing matches...');

    // Get count of parsed items
    const parsedItemsCount = await page.locator('div.grid-cols-12').count();
    console.log(`Parsed ${parsedItemsCount} line items from invoice.`);

    // Click submit reconciliation
    console.log('Approving and applying stock changes...');
    await page.click('#submit-reconciliation-btn');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    console.log('Reconciliation applied! Returned back to Dashboard successfully.');

    console.log('--------------------------------------------------');
    console.log('SUCCESS: All End-to-End browser tests passed successfully!');
    console.log('--------------------------------------------------');

  } catch (err) {
    console.error('E2E Test Failed:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

runTest();
