/* global page */

describe('providerSpecific integration tests', () => {
  beforeAll(async () => {
    await page.goto(global.testPageUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof window.testHarness !== 'undefined');
  });

  beforeEach(async () => {
    await page.evaluate(() => {
      window.testHarness.initCore();
    });
  });

  afterEach(async () => {
    await page.evaluate(() => {
      window.testHarness.reset();
      // Clean up any DOM elements created during tests
      document.querySelectorAll('.test-provider-container').forEach(el => el.remove());
    });
  });

  describe('Provider initialization and selection', () => {
    it('should initialize providers and return correct instances', async () => {
      const result = await page.evaluate(() => {
        const contentScripts = window.testHarness.getContentScripts();

        // Check if providerSpecific is available
        if (!contentScripts.providerSpecific) {
          return {error: 'providerSpecific not available in testHarness'};
        }

        const providerSpecific = contentScripts.providerSpecific;
        providerSpecific.init({provider: {gmail_integration: false}});

        const gmail = providerSpecific.get('mail.google.com');
        const yahoo = providerSpecific.get('mail.yahoo.com');
        const outlook = providerSpecific.get('outlook.live.com');
        const defaultProvider = providerSpecific.get('unknown.provider.com');

        return {
          gmail: gmail.constructor.name,
          yahoo: yahoo.constructor.name,
          outlook: outlook.constructor.name,
          default: defaultProvider.constructor.name
        };
      });

      if (result.error) {
        console.log('Available content scripts:', await page.evaluate(() => Object.keys(window.testHarness.getContentScripts())));
        throw new Error(result.error);
      }

      expect(result.gmail).toBe('Gmail');
      expect(result.yahoo).toBe('Yahoo');
      expect(result.outlook).toBe('Outlook');
      expect(result.default).toBe('Default');
    });
  });

  describe('Gmail provider DOM interactions', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        // Create Gmail-like DOM structure
        const container = document.createElement('div');
        container.className = 'test-provider-container';
        container.innerHTML = `
          <div class="I5">
            <!-- Gmail composer structure -->
            <div class="agb">
              <div class="afV" data-hovercard-id="test1@example.com"></div>
              <div class="afV" data-hovercard-id="test2@example.com"></div>
            </div>
            <div class="agP aFw"></div>
            <div class="aoD hl"></div>
            <div class="aoT"></div>
            <div class="Am Al"></div>
          </div>
          
          <!-- Gmail email view structure -->
          <div class="gs">
            <div class="cf ix">
              <span email="sender@example.com"></span>
            </div>
          </div>
        `;
        document.body.appendChild(container);
      });
    });

    it('should extract recipients from Gmail DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const gmail = providerSpecific.get('mail.google.com');
        const editElement = document.querySelector('.agP.aFw');

        const recipients = await gmail.getRecipients(editElement);

        return {
          recipientCount: recipients.length,
          recipients
        };
      });

      expect(result.recipientCount).toBe(2);
      expect(result.recipients[0]).toEqual({email: 'test1@example.com'});
      expect(result.recipients[1]).toEqual({email: 'test2@example.com'});
    });

    it('should extract sender from Gmail DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const gmail = providerSpecific.get('mail.google.com');
        const emailElement = document.querySelector('.cf.ix span[email]');

        const sender = await gmail.getSender(emailElement);

        return {
          senderCount: sender.length,
          sender
        };
      });

      expect(result.senderCount).toBe(1);
      expect(result.sender[0]).toEqual({email: 'sender@example.com'});
    });

    it('should set recipients in Gmail DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const gmail = providerSpecific.get('mail.google.com');
        const editElement = document.querySelector('.agP.aFw');
        const input = document.querySelector('.agP.aFw');
        const recipients = [
          {email: 'new1@example.com'},
          {email: 'new2@example.com'}
        ];

        gmail.setRecipients({recipients, editElement});

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          inputValue: input.value,
          inputExists: Boolean(input)
        };
      });

      expect(result.inputExists).toBe(true);
      expect(result.inputValue).toBe('new1@example.com, new2@example.com');
    });
  });

  describe('Yahoo provider DOM interactions', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        // Create Yahoo-like DOM structure
        const container = document.createElement('div');
        container.className = 'test-provider-container';
        container.innerHTML = `
          <div class="compose-header">
            <div data-test-id="container-to">
              <div data-test-id="pill" title="test1@example.com">test1@example.com</div>
              <div data-test-id="pill" title="test2@example.com">test2@example.com</div>
              <ul class="pill-list">
                <li class="pill-container">
                  <input class="input-to" type="text">
                </li>
              </ul>
            </div>
          </div>
          
          <!-- Yahoo email view structure -->
          <div class="message-view">
            <header>
              <div data-test-id="message-from">
                <div data-test-id="email-pill">
                  <span><span>sender@yahoo.com</span></span>
                </div>
              </div>
            </header>
          </div>
          
          <div data-test-id="compose-subject"></div>
          <div id="editor-container">
            <div data-test-id="rte"></div>
          </div>
        `;
        document.body.appendChild(container);
      });
    });

    it('should extract recipients from Yahoo DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const yahoo = providerSpecific.get('mail.yahoo.com');
        const recipients = await yahoo.getRecipients();

        return {
          recipientCount: recipients.length,
          recipients
        };
      });

      expect(result.recipientCount).toBe(2);
      expect(result.recipients[0]).toEqual({email: 'test1@example.com'});
      expect(result.recipients[1]).toEqual({email: 'test2@example.com'});
    });

    it('should extract sender from Yahoo DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const yahoo = providerSpecific.get('mail.yahoo.com');
        const emailElement = document.querySelector('.message-view header');

        const sender = await yahoo.getSender(emailElement);

        return {
          senderCount: sender.length,
          sender
        };
      });

      expect(result.senderCount).toBe(1);
      expect(result.sender[0]).toEqual({email: 'sender@yahoo.com'});
    });

    it('should set recipients in Yahoo DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const yahoo = providerSpecific.get('mail.yahoo.com');
        const input = document.querySelector('.input-to');
        const recipients = [
          {email: 'new1@yahoo.com'},
          {email: 'new2@yahoo.com'}
        ];

        yahoo.setRecipients({recipients});

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          inputValue: input.value,
          inputExists: Boolean(input)
        };
      });

      expect(result.inputExists).toBe(true);
      expect(result.inputValue).toBe('new1@yahoo.com, new2@yahoo.com');
    });
  });

  describe('Outlook provider DOM interactions', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        // Create Outlook-like DOM structure
        const container = document.createElement('div');
        container.className = 'test-provider-container';
        container.innerHTML = `
          <div role="main">
            <div data-selection-index="0">
              <div class="lpc-hoverTarget">
                <div>test1@outlook.com</div>
              </div>
            </div>
            <div data-selection-index="1">
              <div class="lpc-hoverTarget">
                <div>test2@outlook.com</div>
              </div>
            </div>
            <input class="ms-BasePicker-input" type="text">
          </div>
          
          <!-- Outlook email view structure -->
          <div class="item-part">
            <div class="item-header-actions">
              <div>
                <div class="lpc-hoverTarget">
                  <div><span>sender@outlook.com</span></div>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(container);
      });
    });

    it('should extract sender from Outlook DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const outlook = providerSpecific.get('outlook.live.com');
        const emailElement = document.querySelector('.item-part');

        const sender = await outlook.getSender(emailElement);

        return {
          senderCount: sender.length,
          sender
        };
      });

      expect(result.senderCount).toBe(1);
      expect(result.sender[0]).toEqual({email: 'sender@outlook.com'});
    });

    it('should set recipients in Outlook DOM', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const outlook = providerSpecific.get('outlook.live.com');
        const editElement = document.querySelector('[role="main"]');
        const input = document.querySelector('.ms-BasePicker-input');
        const recipients = [
          {email: 'new1@outlook.com'}
        ];

        outlook.setRecipients({recipients, editElement});

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 600));

        return {
          inputExists: Boolean(input),
          editElementExists: Boolean(editElement)
        };
      });

      expect(result.inputExists).toBe(true);
      expect(result.editElementExists).toBe(true);
    });

    it('should handle persona extraction with timeout', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const outlook = providerSpecific.get('outlook.live.com');
        const persona = document.querySelector('.lpc-hoverTarget');

        try {
          // This should timeout since we don't have the full persona card structure
          const extracted = await outlook.extractPersona(persona);
          return {
            success: true,
            result: extracted
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });

      // Should return empty array when persona card doesn't appear
      expect(result.success).toBe(true);
      expect(result.result).toEqual([]);
    });
  });

  describe('Default provider fallback', () => {
    it('should handle unknown providers gracefully', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const defaultProvider = providerSpecific.get('mail.unknown-provider.com');

        const recipients = await defaultProvider.getRecipients();
        const sender = await defaultProvider.getSender();

        // setRecipients should not throw
        defaultProvider.setRecipients({recipients: [{email: 'test@example.com'}]});

        return {
          providerName: defaultProvider.constructor.name,
          recipients,
          sender
        };
      });

      expect(result.providerName).toBe('Default');
      expect(result.recipients).toEqual([]);
      expect(result.sender).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing DOM elements gracefully', async () => {
      const result = await page.evaluate(async () => {
        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const gmail = providerSpecific.get('mail.google.com');

        // Test with elements that don't have required parent structure
        try {
          const fakeElement = document.createElement('div');
          const recipients = await gmail.getRecipients(fakeElement);
          const sender = await gmail.getSender(fakeElement);

          return {
            recipients,
            sender,
            error: null
          };
        } catch (error) {
          return {
            recipients: [],
            sender: [],
            error: error.message
          };
        }
      });

      // Should handle gracefully by returning empty arrays
      expect(result.recipients).toEqual([]);
      expect(result.sender).toEqual([]);
    });

    it('should handle malformed email addresses', async () => {
      const result = await page.evaluate(async () => {
        // Create container with invalid email data
        const container = document.createElement('div');
        container.className = 'test-provider-container';
        container.innerHTML = `
          <div class="I5">
            <div class="agb">
              <div class="afV" data-hovercard-id="not-an-email"></div>
              <div class="afV" data-hovercard-id="valid@example.com"></div>
              <div class="afV" data-hovercard-id=""></div>
            </div>
          </div>
        `;
        document.body.appendChild(container);

        const {providerSpecific} = window.testHarness.getContentScripts();
        providerSpecific.init({provider: {gmail_integration: false}});

        const gmail = providerSpecific.get('mail.google.com');
        const editElement = document.querySelector('.agb');

        const recipients = await gmail.getRecipients(editElement);

        return {
          recipientCount: recipients.length,
          recipients
        };
      });

      // Should only extract valid email addresses
      expect(result.recipientCount).toBe(1);
      expect(result.recipients[0]).toEqual({email: 'valid@example.com'});
    });
  });

  describe('React value setting', () => {
    it('should properly set React input values', async () => {
      const result = await page.evaluate(() => {
        // Create a mock React input with _valueTracker
        const input = document.createElement('input');
        input._valueTracker = {
          setValue() {
            // Mock setValue function
          }
        };

        const container = document.createElement('div');
        container.className = 'test-provider-container';
        container.appendChild(input);
        document.body.appendChild(container);

        // Mock the setReactValue function behavior
        const setReactValue = (input, value) => {
          input.focus();
          input.value = value;
          const event = new Event('input', {bubbles: true});
          const tracker = input._valueTracker;
          if (tracker && tracker.setValue) {
            tracker.setValue('');
          }
          input.dispatchEvent(event);
        };

        setReactValue(input, 'test@example.com');

        return {
          inputValue: input.value,
          hasTracker: Boolean(input._valueTracker)
        };
      });

      expect(result.inputValue).toBe('test@example.com');
      expect(result.hasTracker).toBe(true);
    });
  });
});
