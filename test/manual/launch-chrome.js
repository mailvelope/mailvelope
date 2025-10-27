#!/usr/bin/env node

/**
 * Launch Chrome/Chromium with the Mailvelope extension loaded
 *
 * This script:
 * - Launches a Chrome browser instance
 * - Loads the extension from build/chrome/
 * - Opens the onboarding page for testing
 * - Keeps the browser open for manual testing
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname, '../../build/chrome');
const ONBOARDING_PATH = 'components/onboarding/onboarding.html';

async function launchChromeWithExtension() {
  // Check if extension build exists
  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error('❌ Extension not built yet!');
    console.error('   Run: npm run build (or npx grunt)');
    console.error('   Expected location: build/chrome/');
    process.exit(1);
  }

  console.log('🚀 Launching Chrome with Mailvelope extension...');
  console.log('📁 Extension path:', EXTENSION_PATH);

  // Launch Chrome with extension loaded
  const browser = await puppeteer.launch({
    headless: false, // Must be visible for extension testing
    devtools: true,  // Open DevTools automatically
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
    // Use default Chrome/Chromium installation
    executablePath: process.env.CHROME_PATH || puppeteer.executablePath(),
  });

  const pages = await browser.pages();
  const page = pages[0];

  // Get extension ID (it's auto-generated based on path)
  // We need to navigate to chrome://extensions to find it, or calculate it
  // For simplicity, we'll wait a moment and then provide instructions

  console.log('');
  console.log('✅ Chrome launched with extension loaded!');
  console.log('');
  console.log('📋 To access the extension:');
  console.log('   1. Go to chrome://extensions/ to see the extension ID');
  console.log('   2. Navigate to chrome-extension://<ID>/components/onboarding/onboarding.html');
  console.log('   3. Or click the extension icon in the toolbar');
  console.log('');
  console.log('💡 Tips:');
  console.log('   - DevTools is already open for debugging');
  console.log('   - Check the Console tab for any errors');
  console.log('   - Press Ctrl+C in this terminal to close the browser');
  console.log('');

  // Navigate to a blank page to start
  await page.goto('chrome://extensions/');

  // Keep the script running until user stops it
  process.on('SIGINT', async () => {
    console.log('\n👋 Closing browser...');
    await browser.close();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

launchChromeWithExtension().catch(error => {
  console.error('❌ Error launching Chrome:', error);
  process.exit(1);
});
