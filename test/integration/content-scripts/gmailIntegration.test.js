/* global page */

/**
 * Gmail Integration Validation Tests
 *
 * These tests use mocked Gmail DOM structures to verify that:
 * 1. Mock DOM templates accurately represent real Gmail structure
 * 2. GmailIntegration can interact with mocked DOM
 *
 */

import {GmailDOMTemplates} from '../__mocks__/gmail-dom-templates';

describe('GmailIntegration validation tests (Phase 0)', () => {
  beforeAll(async () => {
    await page.goto(global.testPageUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof window.testHarness !== 'undefined');
  });

  beforeEach(async () => {
    await page.evaluate(() => {
      window.testHarness.initCore();

      // Set up preferences required by GmailIntegration
      const testPrefs = {
        security: {
          display_decrypted: 'inline',
          hide_armored_header: false,
          password_cache: true,
          password_timeout: 30
        },
        provider: {
          gmail_integration: true
        }
      };

      // Set prefs in modules/prefs
      window.testHarness.setPrefs(testPrefs);

      // Initialize content-scripts/main with prefs (this properly sets the prefs variable)
      const {csMain} = window.testHarness.getContentScripts();
      const testWatchList = []; // Empty watchlist for testing
      csMain.init(testPrefs, testWatchList);
    });
  });

  afterEach(async () => {
    await page.evaluate(() => {
      window.testHarness.reset();
      // Clean up any DOM elements created during tests
      document.querySelectorAll('.test-gmail-container').forEach(el => el.remove());
    });
  });

  describe('Compose button injection', () => {
    beforeEach(async () => {
      await page.evaluate(template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);
      }, GmailDOMTemplates.composeArea);
    });

    it('should inject Mailvelope button next to compose button', async () => {
      const result = await page.evaluate(async () => {
        const {GmailIntegration} = window.testHarness.getContentScripts();

        const gmail = new GmailIntegration();
        gmail.init();

        // Wait for async initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        // Look for the shadow host element that contains the button
        const shadowHost = Array.from(document.querySelectorAll('.z0 > div')).find(el => el.shadowRoot);
        const mailvelopeBtn = shadowHost?.shadowRoot?.querySelector('.mv-editor-btn-container');
        const editorBtn = mailvelopeBtn?.querySelector('#editorBtn');

        return {
          shadowHostExists: Boolean(shadowHost),
          buttonContainerExists: Boolean(mailvelopeBtn),
          buttonExists: Boolean(editorBtn),
          hasCorrectParent: Boolean(shadowHost && shadowHost.parentElement?.classList.contains('z0'))
        };
      });

      expect(result.shadowHostExists).toBe(true);
      expect(result.buttonContainerExists).toBe(true);
      expect(result.buttonExists).toBe(true);
      expect(result.hasCorrectParent).toBe(true);
    });

    it('should handle missing compose button gracefully', async () => {
      const result = await page.evaluate(async () => {
        // Remove compose button to test error handling
        document.querySelector('.z0')?.remove();

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();

        // Should not throw error
        let errorThrown = false;
        try {
          gmail.init();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          errorThrown = true;
        }

        return {errorThrown};
      });

      expect(result.errorThrown).toBe(false);
    });
  });

  describe('Compose button injection (Meet variant)', () => {
    beforeEach(async () => {
      await page.evaluate(template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);
      }, GmailDOMTemplates.composeAreaMeet);
    });

    it('should inject Mailvelope button in Meet variant layout', async () => {
      const result = await page.evaluate(async () => {
        const {GmailIntegration} = window.testHarness.getContentScripts();

        const gmail = new GmailIntegration();
        gmail.init();

        await new Promise(resolve => setTimeout(resolve, 100));

        // In Meet variant, button is inserted before the compose button
        const meetComposeBtn = document.querySelector('.Yh.akV');
        const mailvelopeBtn = meetComposeBtn?.previousSibling;

        return {
          meetComposeBtnExists: Boolean(meetComposeBtn),
          mailvelopeBtnExists: Boolean(mailvelopeBtn),
          isInsertedBeforeComposeBtn: Boolean(mailvelopeBtn && mailvelopeBtn.nextSibling === meetComposeBtn)
        };
      });

      expect(result.meetComposeBtnExists).toBe(true);
      expect(result.mailvelopeBtnExists).toBe(true);
      expect(result.isInsertedBeforeComposeBtn).toBe(true);
    });
  });

  describe('Message scanning', () => {
    it('should detect PGP message in Gmail view', async () => {
      const result = await page.evaluate(async template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();
        gmail.init();

        await new Promise(resolve => setTimeout(resolve, 100));

        // Scan for PGP messages
        await gmail.scanMessages();

        return {
          messagesFound: gmail.selectedMsgs?.size || 0,
          messageIds: gmail.selectedMsgs ? Array.from(gmail.selectedMsgs.keys()) : []
        };
      }, GmailDOMTemplates.messageWithPGP);

      expect(result.messagesFound).toBeGreaterThan(0);
      expect(result.messageIds.length).toBeGreaterThan(0);
      expect(result.messageIds[0]).toBe('msg-18c9a123abc');
    });

    it('should detect encrypted attachments', async () => {
      const result = await page.evaluate(async template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();
        gmail.init();

        await new Promise(resolve => setTimeout(resolve, 100));
        await gmail.scanMessages();

        const msgId = 'msg-456def789';
        const msgData = gmail.selectedMsgs?.get(msgId);

        return {
          messageFound: Boolean(msgData),
          attachmentCount: msgData?.att?.length || 0,
          attachmentNames: msgData?.att || []
        };
      }, GmailDOMTemplates.messageWithEncryptedAttachment);

      expect(result.messageFound).toBe(true);
      expect(result.attachmentCount).toBe(2);
      expect(result.attachmentNames).toContain('secret-document.txt.gpg');
      expect(result.attachmentNames).toContain('report.pdf.pgp');
    });

    it('should detect clipped PGP content', async () => {
      const result = await page.evaluate(async template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();
        gmail.init();

        await new Promise(resolve => setTimeout(resolve, 100));
        await gmail.scanMessages();

        const msgId = 'msg-clipped-pgp';
        const msgData = gmail.selectedMsgs?.get(msgId);

        return {
          messageFound: Boolean(msgData),
          isClipped: Boolean(msgData?.clipped)
        };
      }, GmailDOMTemplates.messageWithClippedPGP);

      expect(result.messageFound).toBe(true);
      expect(result.isClipped).toBe(true);
    });
  });

  describe('Action button injection', () => {
    it('should add action buttons to messages with PGP content', async () => {
      const result = await page.evaluate(async template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();
        gmail.init();

        await new Promise(resolve => setTimeout(resolve, 100));
        await gmail.scanMessages();

        // Wait for buttons to be injected
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check for injected action buttons
        const messageElem = document.querySelector('[data-message-id="msg-18c9a123abc"]');
        const actionButtons = messageElem?.querySelectorAll('[data-mv-btn-top]');

        return {
          actionButtonsCount: actionButtons?.length || 0,
          hasButtons: actionButtons && actionButtons.length > 0
        };
      }, GmailDOMTemplates.messageWithPGP);

      // Note: This test validates that scanMessages() completes without error
      // The actual button injection may require additional mock setup (port, etc.)
      expect(result.hasButtons).toBe(true);
    });
  });

  describe('User information extraction', () => {
    beforeEach(async () => {
      await page.evaluate(titleTemplate => {
        // Set document title for email extraction
        document.head.innerHTML = titleTemplate;
      }, GmailDOMTemplates.pageTitle);
    });

    it('should extract user email from page title', async () => {
      const result = await page.evaluate(async () => {
        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();

        let userInfo;
        try {
          userInfo = gmail.getUserInfo();
        } catch (error) {
          return {error: error.message};
        }

        return {
          email: userInfo?.email,
          legacyGsuite: userInfo?.legacyGsuite
        };
      });

      expect(result.email).toBe('alice@example.com');
      expect(result.legacyGsuite).toBe(false);
    });

    it('should detect legacy G Suite accounts', async () => {
      const result = await page.evaluate(async (titleTemplate, gsuiteIndicator) => {
        // Set both title and G Suite indicator
        document.head.innerHTML = titleTemplate;
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = gsuiteIndicator;
        document.body.appendChild(container);

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();

        let userInfo;
        try {
          userInfo = gmail.getUserInfo();
        } catch (error) {
          return {error: error.message};
        }

        return {
          email: userInfo?.email,
          legacyGsuite: userInfo?.legacyGsuite
        };
      }, GmailDOMTemplates.pageTitle, GmailDOMTemplates.legacyGSuiteIndicator);

      expect(result.email).toBe('alice@example.com');
      expect(result.legacyGsuite).toBe(true);
    });
  });

  describe('Multiple messages handling', () => {
    it('should scan and identify multiple messages', async () => {
      const result = await page.evaluate(async template => {
        const container = document.createElement('div');
        container.className = 'test-gmail-container';
        container.innerHTML = template;
        document.body.appendChild(container);

        const {GmailIntegration} = window.testHarness.getContentScripts();
        const gmail = new GmailIntegration();
        gmail.init();

        await new Promise(resolve => setTimeout(resolve, 100));
        await gmail.scanMessages();

        const messageIds = gmail.selectedMsgs ? Array.from(gmail.selectedMsgs.keys()) : [];
        const messageData = gmail.selectedMsgs ? Array.from(gmail.selectedMsgs.values()) : [];

        return {
          totalMessages: messageIds.length,
          messageIds,
          messagesWithPGP: messageData.filter(m => m.controllerId).length,
          messagesWithAttachments: messageData.filter(m => m.att && m.att.length > 0).length
        };
      }, GmailDOMTemplates.inboxWithMultipleMessages);

      // Should find messages with PGP content and encrypted attachments
      expect(result.totalMessages).toBeGreaterThan(0);
      expect(result.messagesWithPGP).toBeGreaterThan(0);
      expect(result.messagesWithAttachments).toBeGreaterThan(0);
    });
  });
});
