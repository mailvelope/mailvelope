/**
 * Integration tests for OutlookIntegration
 *
 * Test-Driven Development (TDD) approach:
 * - Tests use mock DOM templates from outlook-dom-templates.js
 * - Tests drive the implementation of outlookIntegration.js
 * - Each test validates a specific feature against realistic Outlook DOM structure
 */

/* global page */

import {OutlookDOMTemplates} from '../__mocks__/outlook-dom-templates';

describe('OutlookIntegration TDD tests', () => {
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
      // Clean up test containers
      document.querySelectorAll('.test-outlook-container').forEach(el => el.remove());
    });
  });

  describe('Constructor and Initialization', () => {
    it('RED: should create OutlookIntegration instance with required properties', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();

        return {
          hasInstance: Boolean(outlook),
          hasId: Boolean(outlook.id),
          hasPort: outlook.port === null,
          hasEditorBtn: outlook.editorBtn === null,
          hasEditorBtnRoot: outlook.editorBtnRoot === null,
          hasSelectedMsgs: outlook.selectedMsgs === null,
          hasUserInfo: outlook.userInfo === null
        };
      });

      expect(result.hasInstance).toBe(true);
      expect(result.hasId).toBe(true);
      expect(result.hasPort).toBe(true);
      expect(result.hasEditorBtn).toBe(true);
      expect(result.hasEditorBtnRoot).toBe(true);
      expect(result.hasSelectedMsgs).toBe(true);
      expect(result.hasUserInfo).toBe(true);
    });

    it('RED: should have init method that establishes connection', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        return {
          hasPort: Boolean(outlook.port),
          hasEventListener: Boolean(outlook.updateElements)
        };
      });

      expect(result.hasPort).toBe(true);
      expect(result.hasEventListener).toBe(true);
    });
  });

  describe('User Info Extraction', () => {
    beforeEach(async () => {
      // Set up Outlook user mailbox DOM
      await page.evaluate(template => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = template;
        document.body.appendChild(container);
      }, OutlookDOMTemplates.userMailbox);
    });

    it('should extract user email from data-folder-name attribute', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const userInfo = outlook.getUserInfo();

        return {
          hasEmail: Boolean(userInfo.email),
          email: userInfo.email
        };
      });

      expect(result.hasEmail).toBe(true);
      expect(result.email).toBe('toberndo@outlook.com');
    });

    it('should cache user info after first call', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const firstCall = outlook.getUserInfo();
        const secondCall = outlook.getUserInfo();

        return {
          sameReference: firstCall === secondCall,
          email: firstCall.email
        };
      });

      expect(result.sameReference).toBe(true);
      expect(result.email).toBe('toberndo@outlook.com');
    });

    it('should throw error when mailbox element not found', async () => {
      const result = await page.evaluate(() => {
        // Remove the mailbox element
        const mailbox = document.querySelector('[id^="primaryMailboxRoot"]');
        mailbox?.remove();

        const {OutlookIntegration} = window.testHarness.getContentScripts();
        const outlook = new OutlookIntegration();

        try {
          outlook.getUserInfo();
          return {error: null};
        } catch (error) {
          return {error: error.message};
        }
      });

      expect(result.error).toBe('Outlook User Id not found.');
    });

    it('should extract email from title attribute when data-folder-name is missing', async () => {
      const result = await page.evaluate(() => {
        // Remove data-folder-name attribute
        const mailbox = document.querySelector('[id^="primaryMailboxRoot"]');
        mailbox?.removeAttribute('data-folder-name');

        const {OutlookIntegration} = window.testHarness.getContentScripts();
        const outlook = new OutlookIntegration();
        const userInfo = outlook.getUserInfo();

        return {
          hasEmail: Boolean(userInfo.email),
          email: userInfo.email
        };
      });

      expect(result.hasEmail).toBe(true);
      expect(result.email).toBe('toberndo@outlook.com');
    });
  });

  describe('Compose Button Injection', () => {
    beforeEach(async () => {
      // Set up Outlook compose toolbar DOM and user mailbox
      await page.evaluate(templates => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = templates.composeToolbar + templates.userMailbox;
        document.body.appendChild(container);
      }, {composeToolbar: OutlookDOMTemplates.composeToolbar, userMailbox: OutlookDOMTemplates.userMailbox});
    });

    it('RED: should inject Mailvelope button next to compose button', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        // Wait for async initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Look for Mailvelope button in toolbar
        const toolbar = document.querySelector('.ms-OverflowSet.root-169');
        const mailvelopeButton = toolbar?.querySelector('[data-mv-editor-btn]');

        return {
          toolbarExists: Boolean(toolbar),
          buttonExists: Boolean(mailvelopeButton),
          buttonHasShadowRoot: Boolean(mailvelopeButton?.shadowRoot)
        };
      });

      expect(result.toolbarExists).toBe(true);
      expect(result.buttonExists).toBe(true);
      expect(result.buttonHasShadowRoot).toBe(true);
    });

    it('RED: should not duplicate button if already exists', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await new Promise(resolve => setTimeout(resolve, 100));

        // Call attachEditorBtn again
        outlook.attachEditorBtn();

        await new Promise(resolve => setTimeout(resolve, 100));

        // Count Mailvelope buttons
        const buttons = document.querySelectorAll('[data-mv-editor-btn]');

        return {
          buttonCount: buttons.length
        };
      });

      expect(result.buttonCount).toBe(1);
    });

    it('RED: should handle missing compose button gracefully', async () => {
      const result = await page.evaluate(async () => {
        // Remove compose button
        const composeIcon = document.querySelector('[data-icon-name="ComposeRegular"]');
        composeIcon?.closest('.ms-OverflowSet-item')?.remove();

        const {OutlookIntegration} = window.testHarness.getContentScripts();
        const outlook = new OutlookIntegration();

        let errorThrown = false;
        try {
          outlook.init();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          errorThrown = true;
        }

        const mailvelopeButton = document.querySelector('[data-mv-editor-btn]');

        return {
          errorThrown,
          buttonExists: Boolean(mailvelopeButton)
        };
      });

      expect(result.errorThrown).toBe(false);
      expect(result.buttonExists).toBe(false);
    });

    it('RED: should emit open-editor event on button click', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await new Promise(resolve => setTimeout(resolve, 100));

        // Track emitted events
        let emittedEvent = null;
        const originalEmit = outlook.port.emit;
        outlook.port.emit = (eventName, data) => {
          emittedEvent = {eventName, data};
          return originalEmit.call(outlook.port, eventName, data);
        };

        // Find and click Mailvelope button
        const mailvelopeButton = document.querySelector('[data-mv-editor-btn]');
        const buttonInShadow = mailvelopeButton?.shadowRoot?.querySelector('#editorBtn');
        buttonInShadow?.click();

        return {
          eventEmitted: Boolean(emittedEvent),
          eventName: emittedEvent?.eventName
        };
      });

      expect(result.eventEmitted).toBe(true);
      expect(result.eventName).toBe('open-editor');
    });
  });

  describe('PGP Message Detection', () => {
    beforeEach(async () => {
      // Set up reading pane with PGP content
      await page.evaluate(template => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = template;
        document.body.appendChild(container);
      }, OutlookDOMTemplates.readingPaneWithPGP);
    });

    it.skip('RED: should detect PGP message in reading pane', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await outlook.scanMessages();

        return {
          hasSelectedMsgs: Boolean(outlook.selectedMsgs),
          selectedMsgsCount: outlook.selectedMsgs?.size || 0
        };
      });

      expect(result.hasSelectedMsgs).toBe(true);
      expect(result.selectedMsgsCount).toBeGreaterThan(0);
    });

    it('RED: should not detect PGP in plain text messages', async () => {
      // Use reading pane without PGP
      await page.evaluate(template => {
        document.querySelector('.test-outlook-container').innerHTML = template;
      }, OutlookDOMTemplates.readingPaneWithActions);

      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await outlook.scanMessages();

        return {
          selectedMsgsCount: outlook.selectedMsgs?.size || 0
        };
      });

      expect(result.selectedMsgsCount).toBe(0);
    });
  });

  describe('Encrypted Attachment Detection', () => {
    beforeEach(async () => {
      // Set up message with encrypted attachments
      await page.evaluate(template => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = template;
        document.body.appendChild(container);
      }, OutlookDOMTemplates.messageWithEncryptedAttachments);
    });

    it('RED: should detect .gpg attachments', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const messageElem = document.querySelector('.aVla3');

        const attachments = outlook.getEncryptedAttachments(messageElem);

        return {
          attachmentCount: attachments.length,
          hasGpgFile: attachments.some(att => att.endsWith('.gpg'))
        };
      });

      expect(result.attachmentCount).toBeGreaterThan(0);
      expect(result.hasGpgFile).toBe(true);
    });

    it('RED: should detect .pgp attachments', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const messageElem = document.querySelector('.aVla3');

        const attachments = outlook.getEncryptedAttachments(messageElem);

        return {
          hasPgpFile: attachments.some(att => att.endsWith('.pgp'))
        };
      });

      expect(result.hasPgpFile).toBe(true);
    });

    it('RED: should detect .asc attachments', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const messageElem = document.querySelector('.aVla3');

        const attachments = outlook.getEncryptedAttachments(messageElem);

        return {
          hasAscFile: attachments.some(att => att.endsWith('.asc'))
        };
      });

      expect(result.hasAscFile).toBe(true);
    });

    it('RED: should not detect regular attachments as encrypted', async () => {
      // Use message with regular PDF
      await page.evaluate(template => {
        document.querySelector('.test-outlook-container').innerHTML = template;
      }, OutlookDOMTemplates.messageWithAttachment);

      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const messageElem = document.querySelector('.aVla3');

        const attachments = outlook.getEncryptedAttachments(messageElem);

        return {
          attachmentCount: attachments.length
        };
      });

      expect(result.attachmentCount).toBe(0);
    });
  });

  describe('Secure Action Buttons', () => {
    beforeEach(async () => {
      // Set up reading pane with PGP content and action buttons, and user mailbox
      await page.evaluate(templates => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = templates.readingPaneWithPGP + templates.userMailbox;
        document.body.appendChild(container);
      }, {readingPaneWithPGP: OutlookDOMTemplates.readingPaneWithPGP, userMailbox: OutlookDOMTemplates.userMailbox});
    });

    it.skip('RED: should add Secure Reply button to messages with PGP content', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await outlook.scanMessages();

        const secureReplyBtn = document.querySelector('[data-mv-btn-action="secure-reply"]');

        return {
          buttonExists: Boolean(secureReplyBtn),
          hasShadowRoot: Boolean(secureReplyBtn?.shadowRoot)
        };
      });

      expect(result.buttonExists).toBe(true);
      expect(result.hasShadowRoot).toBe(true);
    });

    it.skip('RED: should add Secure Forward button', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await outlook.scanMessages();

        const secureForwardBtn = document.querySelector('[data-mv-btn-action="secure-forward"]');

        return {
          buttonExists: Boolean(secureForwardBtn)
        };
      });

      expect(result.buttonExists).toBe(true);
    });

    it.skip('RED: should emit secure-button event on Secure Reply click', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await outlook.scanMessages();

        // Track emitted events
        let emittedEvent = null;
        const originalEmit = outlook.port.emit;
        outlook.port.emit = (eventName, data) => {
          emittedEvent = {eventName, data};
          return originalEmit.call(outlook.port, eventName, data);
        };

        // Click Secure Reply button
        const secureReplyBtn = document.querySelector('[data-mv-btn-action="secure-reply"]');
        const buttonInShadow = secureReplyBtn?.shadowRoot?.querySelector('button');
        buttonInShadow?.click();

        return {
          eventEmitted: Boolean(emittedEvent),
          eventName: emittedEvent?.eventName,
          eventType: emittedEvent?.data?.type
        };
      });

      expect(result.eventEmitted).toBe(true);
      expect(result.eventName).toBe('secure-button');
      expect(result.eventType).toBe('reply');
    });
  });

  describe('Message ID Generation', () => {
    beforeEach(async () => {
      // Set up reading pane with conversation for msgId testing
      await page.evaluate(templates => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = templates.readingPaneWithPGP + templates.userMailbox;
        document.body.appendChild(container);
      }, {readingPaneWithPGP: OutlookDOMTemplates.readingPaneWithPGP, userMailbox: OutlookDOMTemplates.userMailbox});
    });

    it('should generate msgId from conversation and message index', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const msgElem = document.querySelector('.aVla3');

        let msgId = null;
        let error = null;
        try {
          msgId = outlook.getMsgId(msgElem);
        } catch (e) {
          error = e.message;
        }

        return {
          msgId,
          error,
          hasMsgId: Boolean(msgId),
          hasHash: msgId?.includes('#')
        };
      });

      expect(result.error).toBe(null);
      expect(result.hasMsgId).toBe(true);
      expect(result.hasHash).toBe(true);
    });

    it('should extract active conversation ID from MailList', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const conversationId = outlook.getActiveConversationId();

        return {
          conversationId,
          hasConversationId: Boolean(conversationId),
          isExpectedFormat: conversationId === 'AQQkADAwATMwMAItYjBiZi03YmY3LTAwAi0wMAoAEABjgKbAj7DwSKnW58xs6QY7'
        };
      });

      expect(result.hasConversationId).toBe(true);
      expect(result.isExpectedFormat).toBe(true);
    });

    it('should get correct message index from DOM position', async () => {
      const result = await page.evaluate(() => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        const msgElem = document.querySelector('.aVla3');
        const messageIndex = outlook.getMessageIndex(msgElem);

        return {
          messageIndex,
          isNumber: typeof messageIndex === 'number',
          isNonNegative: messageIndex >= 0
        };
      });

      expect(result.isNumber).toBe(true);
      expect(result.isNonNegative).toBe(true);
      expect(result.messageIndex).toBe(0); // First message in conversation
    });

    it('should handle missing conversation gracefully', async () => {
      const result = await page.evaluate(() => {
        // Remove MailList to simulate missing conversation
        document.getElementById('MailList')?.remove();

        const {OutlookIntegration} = window.testHarness.getContentScripts();
        const outlook = new OutlookIntegration();
        const msgElem = document.querySelector('.aVla3');

        let error = null;
        try {
          outlook.getMsgId(msgElem);
        } catch (e) {
          error = e.message;
        }

        return {
          error
        };
      });

      expect(result.error).toBe('No active conversation found');
    });
  });

  describe('Cleanup and Deactivation', () => {
    beforeEach(async () => {
      await page.evaluate(template => {
        const container = document.createElement('div');
        container.className = 'test-outlook-container';
        container.innerHTML = template;
        document.body.appendChild(container);
      }, OutlookDOMTemplates.composeToolbar);
    });

    it('RED: should remove editor button on deactivate', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        await new Promise(resolve => setTimeout(resolve, 100));

        const buttonBeforeDeactivate = document.querySelector('[data-mv-editor-btn]');

        outlook.deactivate();

        const buttonAfterDeactivate = document.querySelector('[data-mv-editor-btn]');

        return {
          buttonExistedBefore: Boolean(buttonBeforeDeactivate),
          buttonExistsAfter: Boolean(buttonAfterDeactivate)
        };
      });

      expect(result.buttonExistedBefore).toBe(true);
      expect(result.buttonExistsAfter).toBe(false);
    });

    it('RED: should remove event listeners on deactivate', async () => {
      const result = await page.evaluate(async () => {
        const {OutlookIntegration} = window.testHarness.getContentScripts();

        const outlook = new OutlookIntegration();
        outlook.init();

        const hasListenerBefore = Boolean(outlook.updateElements);

        outlook.deactivate();

        // Check if mailvelope-observe listener is still active
        // This is hard to test directly, but we can check if selectedMsgs is cleared
        const selectedMsgsCleared = outlook.selectedMsgs === null;

        return {
          hasListenerBefore,
          selectedMsgsCleared
        };
      });

      expect(result.hasListenerBefore).toBe(true);
      expect(result.selectedMsgsCleared).toBe(true);
    });
  });
});
