/**
 * Integration tests for the editor deferred-authorization flow with the
 * Outlook provider. Drives the real port/factory/controller chain:
 * outlookInt port → OutlookController → editorController peer → editor port
 * → editor-mount → authorization-required error in the editor.
 */

/* global page */

describe('Editor deferred authorization (Outlook)', () => {
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
    });
  });

  it('should not open the editor while no authorization exists', async () => {
    const result = await page.evaluate(async () => {
      const {controllerPool} = window.testHarness.getControllerFactory();
      const outlookPort = window.testHarness.createPortConnection('outlookInt-owagate1');
      await new Promise(resolve => setTimeout(resolve, 50));
      const outlookCtrl = await controllerPool.get('owagate1');
      // compose click without a stored token
      outlookPort.postMessage({event: 'open-editor', userInfo: {email: 'thomas@mailvelope.net'}, text: ''});
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        editorCreated: Boolean(outlookCtrl?.peers.editorController),
        pendingRequests: outlookCtrl?.authorizationRequests.length
      };
    });

    expect(result.editorCreated).toBe(false);
    expect(result.pendingRequests).toBe(1);
  });

  it('should emit the Outlook auth error in the editor when the token is gone at mount', async () => {
    const result = await page.evaluate(async () => {
      const {controllerPool} = window.testHarness.getControllerFactory();
      // valid stored token so the editor opens without deferred authorization
      await chrome.storage.local.set({'mvelo.oauth.outlook': {
        'thomas@mailvelope.net': {
          access_token: 'test-access-token',
          access_token_exp: Date.now() + 3600 * 1000,
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send'
        }
      }});
      const outlookPort = window.testHarness.createPortConnection('outlookInt-owatest1');
      await new Promise(resolve => setTimeout(resolve, 50));
      const outlookCtrl = await controllerPool.get('owatest1');
      // compose button click: content script emits open-editor
      outlookPort.postMessage({event: 'open-editor', userInfo: {email: 'thomas@mailvelope.net'}, text: ''});
      // wait for the auth gate + editor peer creation to complete
      for (let i = 0; i < 40 && !outlookCtrl?.peers.editorController; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const editorId = outlookCtrl?.peers.editorController?.id;
      if (!editorId) {
        return {error: 'no editor peer created'};
      }
      // token gone by the time the editor mounts (e.g. removed in settings)
      await chrome.storage.local.remove('mvelo.oauth.outlook');
      // editor popup page connects and mounts
      const editorPort = window.testHarness.createPortConnection(`editor-${editorId}`);
      editorPort.enableEventCapture();
      await new Promise(resolve => setTimeout(resolve, 50));
      editorPort.postMessage({event: 'editor-mount'});
      const event = await editorPort.waitForEvent('error-message', 3000);
      return {code: event.error.code, message: event.error.message};
    });

    expect(result).not.toHaveProperty('error');
    expect(result.code).toBe('AUTHORIZATION_REQUIRED');
    // chrome.i18n mock returns the key, so the message identifies the chosen l10n key
    expect(result.message).toBe('outlook_integration_auth_error_send');
  });

  it('should emit the Outlook auth error after a service-worker restart (editor port reconnects first)', async () => {
    const result = await page.evaluate(async () => {
      const {controllerPool} = window.testHarness.getControllerFactory();
      // valid stored token so the editor opens without deferred authorization
      await chrome.storage.local.set({'mvelo.oauth.outlook': {
        'thomas@mailvelope.net': {
          access_token: 'test-access-token',
          access_token_exp: Date.now() + 3600 * 1000,
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send'
        }
      }});
      const outlookPort = window.testHarness.createPortConnection('outlookInt-owatest2');
      await new Promise(resolve => setTimeout(resolve, 50));
      const outlookCtrl = await controllerPool.get('owatest2');
      outlookPort.postMessage({event: 'open-editor', userInfo: {email: 'thomas@mailvelope.net'}, text: ''});
      // wait for the auth gate + editor peer creation to complete
      for (let i = 0; i < 40 && !outlookCtrl?.peers.editorController; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const editorId = outlookCtrl?.peers.editorController?.id;
      if (!editorId) {
        return {error: 'no editor peer created'};
      }
      await chrome.storage.local.remove('mvelo.oauth.outlook');
      // service worker restart: in-memory controllers gone, session storage survives
      controllerPool.map.clear();
      // editor popup page reconnects and mounts
      const editorPort = window.testHarness.createPortConnection(`editor-${editorId}`);
      editorPort.enableEventCapture();
      await new Promise(resolve => setTimeout(resolve, 50));
      editorPort.postMessage({event: 'editor-mount'});
      const event = await editorPort.waitForEvent('error-message', 3000);
      return {code: event.error.code, message: event.error.message};
    });

    expect(result).not.toHaveProperty('error');
    expect(result.code).toBe('AUTHORIZATION_REQUIRED');
    expect(result.message).toBe('outlook_integration_auth_error_send');
  });

  it('should emit the Outlook auth error after a service-worker restart (integration port reconnects first)', async () => {
    const result = await page.evaluate(async () => {
      const {controllerPool} = window.testHarness.getControllerFactory();
      // valid stored token so the editor opens without deferred authorization
      await chrome.storage.local.set({'mvelo.oauth.outlook': {
        'thomas@mailvelope.net': {
          access_token: 'test-access-token',
          access_token_exp: Date.now() + 3600 * 1000,
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send'
        }
      }});
      const outlookPort = window.testHarness.createPortConnection('outlookInt-owatest3');
      await new Promise(resolve => setTimeout(resolve, 50));
      const outlookCtrl = await controllerPool.get('owatest3');
      outlookPort.postMessage({event: 'open-editor', userInfo: {email: 'thomas@mailvelope.net'}, text: ''});
      // wait for the auth gate + editor peer creation to complete
      for (let i = 0; i < 40 && !outlookCtrl?.peers.editorController; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const editorId = outlookCtrl?.peers.editorController?.id;
      if (!editorId) {
        return {error: 'no editor peer created'};
      }
      await chrome.storage.local.remove('mvelo.oauth.outlook');
      // service worker restart: in-memory controllers gone, session storage survives
      controllerPool.map.clear();
      // OWA content script reconnects first, then the editor page
      window.testHarness.createPortConnection('outlookInt-owatest3');
      await new Promise(resolve => setTimeout(resolve, 50));
      const editorPort = window.testHarness.createPortConnection(`editor-${editorId}`);
      editorPort.enableEventCapture();
      await new Promise(resolve => setTimeout(resolve, 50));
      editorPort.postMessage({event: 'editor-mount'});
      const event = await editorPort.waitForEvent('error-message', 3000);
      return {code: event.error.code, message: event.error.message};
    });

    expect(result).not.toHaveProperty('error');
    expect(result.code).toBe('AUTHORIZATION_REQUIRED');
    expect(result.message).toBe('outlook_integration_auth_error_send');
  });
});
