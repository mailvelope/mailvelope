/**
 * Integration tests for Mailvelope Client API
 * Uses Puppeteer to test in real browser environment
 */

/* global page */
describe('Mailvelope Client API Integration', () => {
  beforeAll(async () => {
    // Navigate to test page
    await page.goto(global.testPageUrl, {
      waitUntil: 'domcontentloaded'
    });
    // Wait for test harness to be available
    await page.waitForFunction(
      () => typeof window.testHarness !== 'undefined',
      {timeout: 1000}
    );
    // Initialize client API (only for client-API tests)
    await page.evaluate(() => window.testHarness.initClientAPI());
  }, 2000);

  beforeEach(async () => {
    // Initialize core components for each test
    await page.evaluate(() => window.testHarness.initCore());
  });

  afterEach(async () => {
    // Reset state after each test
    await page.evaluate(() => window.testHarness.reset());
  });

  describe('Handling keyrings', () => {
    it('can create a keyring', async () => {
      const result = await page.evaluate(async () => {
        const keyring = await window.mailvelope.createKeyring('email@test.example');
        return keyring !== null && typeof keyring === 'object';
      });
      expect(result).toBe(true);
    });

    it('rejects getting keyring if there is none', async () => {
      const error = await page.evaluate(async () => {
        try {
          await window.mailvelope.getKeyring('email@test.example');
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toBeTruthy();
    });

    it('rejects creating duplicate keyring', async () => {
      const error = await page.evaluate(async () => {
        try {
          await window.mailvelope.createKeyring('existing@test.example');
          await window.mailvelope.createKeyring('existing@test.example');
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toBeTruthy();
    });

    it('can get a keyring', async () => {
      const result = await page.evaluate(async () => {
        const existing_keyring = await window.mailvelope.createKeyring('existing@test.example');
        const retrieved_keyring = await window.mailvelope.getKeyring('existing@test.example');
        // Check if they have the same identifier
        return existing_keyring.identifier === retrieved_keyring.identifier;
      });
      expect(result).toBe(true);
    });

    it('rejects getting keyring with wrong handle', async () => {
      const error = await page.evaluate(async () => {
        try {
          await window.mailvelope.createKeyring('existing@test.example');
          await window.mailvelope.getKeyring('email@test.example');
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toBeTruthy();
    });
  });

  describe('Processing autocrypt', () => {
    beforeEach(async () => {
      // Set preferences before creating keyring
      await page.evaluate(() => {
        window.testHarness.setPrefs({
          keyserver: {
            autocrypt_lookup: true,
            key_binding: false,
            mvelo_tofu_lookup: false,
            oks_lookup: false,
            wkd_lookup: false
          }
        });
      });
      await page.evaluate(async () => {
        await window.mailvelope.createKeyring('email@test.example');
      });
    });

    it('processes Autocrypt header, stores key, and makes it available', async () => {
      const result = await page.evaluate(async () => {
        // Get test headers from test harness
        const fixtures = window.testHarness.getFixtures();
        const headers = fixtures.testAutocryptHeaders;
        const keyring = await window.mailvelope.getKeyring('email@test.example');
        await keyring.processAutocryptHeader(headers);
        const validationResult = await keyring.validKeyForAddress([headers.from]);
        return validationResult[headers.from]?.keys?.[0]?.source;
      });
      expect(result).toBe('AC');
    });
  });
});
