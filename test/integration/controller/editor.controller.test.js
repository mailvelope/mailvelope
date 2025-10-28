/* global page */

describe('EditorController integration tests', () => {
  beforeAll(async () => {
    await page.goto(global.testPageUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof window.testHarness !== 'undefined');
  });

  beforeEach(async () => {
    await page.evaluate(async () => {
      await window.testHarness.initCore();

      // Create test keyring with test keys
      await window.testHarness.createTestKeyring('test-keyring-id', {importTestKeys: true});

      // Set up test preferences
      window.testHarness.setPrefs({
        general: {
          auto_sign_msg: false,
          auto_add_primary: false
        },
        security: {
          password_cache: true
        },
        keyserver: {
          mvelo_tofu_lookup: false,
          oks_lookup: false,
          wkd_lookup: false,
          autocrypt_lookup: false
        }
      });
    });
  });

  afterEach(async () => {
    await page.evaluate(() => {
      window.testHarness.reset();
    });
  });

  /**
   * Setup function to create EditorController with peer controllers
   * Creates Gmail controller and Editor controller with proper port connections
   * @param {Object} config - Configuration options
   * @param {boolean} config.embedded - Whether to create editorCont port for embedded mode
   * @param {boolean} config.integration - Whether to set integration mode
   * @param {Object} config.editorState - Initial state for editor controller
   * @param {Object} config.gmailMocks - Mock functions for gmail controller methods
   * @param {Object} config.mocks - Mock configurations for different modules
   */
  const setupEditorController = async (config = {}) => {
    await page.evaluate(async config => {
      const {createController} = window.testHarness.getControllerFactory();
      const {createPortConnection} = window.testHarness;

      // Generate unique IDs
      const gmailId = crypto.randomUUID().replaceAll('-', '');
      const editorId = crypto.randomUUID().replaceAll('-', '');

      // Create Gmail controller with port
      const gmailPortName = `gmailInt-${gmailId}`;

      // Create port connection for Gmail controller
      const gmailPort = createPortConnection(gmailPortName);
      const gmailController = createController('gmailInt', gmailPort._otherPort);

      // Apply Gmail controller mocks if provided
      if (config.gmailMocks) {
        Object.entries(config.gmailMocks).forEach(([method, mockBehavior]) => {
          if (mockBehavior === 'mock-token') {
            // Simple return value mock
            gmailController[method] = async () => 'mock-token';
          } else if (mockBehavior === 'auth-error') {
            // Error throwing mock
            gmailController[method] = async () => {
              throw new Error('Auth failed');
            };
          } else if (mockBehavior === 'with-callbacks') {
            // Mock that calls beforeAuth/afterAuth callbacks
            gmailController[method] = async ({beforeAuth, afterAuth}) => {
              if (beforeAuth) { beforeAuth(); }
              if (afterAuth) { afterAuth(); }
              return 'token';
            };
          }
        });
      }

      // Create EditorController as peer of GmailController
      await gmailController.createPeer('editorController');
      const editorController = gmailController.peers.editorController;

      // Set initial state if provided
      if (config.editorState) {
        await editorController.setState(config.editorState);
      }

      // Create port for editor view connecting to EditorController
      const editorPortName = `editor-${editorId}`;
      const editorPort = createPortConnection(editorPortName);
      const editorReceivedPort = editorPort._otherPort;
      editorController.addPort(editorReceivedPort);

      // Create editorCont port if embedded mode requested
      let editorContPort;
      let editorContReceivedPort;
      if (config.embedded) {
        const editorContPortName = `editorCont-${editorId}`;
        editorContPort = createPortConnection(editorContPortName);
        editorContReceivedPort = editorContPort._otherPort;
        editorController.addPort(editorContReceivedPort);
      }

      // Set up event capturing using Port class methods
      // Capture events sent TO the test (i.e., responses from controller)
      editorPort.enableEventCapture();
      if (editorContPort) {
        editorContPort.enableEventCapture();
      }

      // Store references using test harness to avoid serialization issues
      window.testHarness.setTestData('editorSetup', {
        gmailController,
        editorController,
        gmailPort,
        editorPort,
        editorContPort,
        editorReceivedPort,
        editorContReceivedPort
      });
    }, config);
  };

  describe('Editor Mount and Initialization', () => {
    it('should emit set-mode event in standard mode', async () => {
      await setupEditorController();

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');

        // Trigger editor-mount event
        editorPort.postMessage({event: 'editor-mount'});

        // Wait for set-mode event (response from controller)
        const event = await editorPort.waitForEvent('set-mode');

        // Return event data for verification
        return event;
      });

      // Verify event data
      expect(result.event).toBe('set-mode');
      expect(result).toMatchObject({
        embedded: false,
        integration: false
      });
    });

    it('should emit set-mode event in embedded mode', async () => {
      await setupEditorController({embedded: true});

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Trigger editor-mount event
        editorPort.postMessage({event: 'editor-mount'});

        // Wait for set-mode event
        const event = await editorPort.waitForEvent('set-mode');

        return event;
      });

      // Verify event data
      expect(result.event).toBe('set-mode');
      expect(result).toMatchObject({
        embedded: true,
        integration: false
      });
    });

    it('should handle integration mode with auth success', async () => {
      await setupEditorController({
        editorState: {integration: true, userInfo: {email: 'test@example.com'}},
        gmailMocks: {
          getAccessToken: 'mock-token'
        }
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Trigger editor-mount event
        editorPort.postMessage({event: 'editor-mount'});

        // Wait for set-mode event
        const event = await editorPort.waitForEvent('set-mode');

        // Should not emit error-message for successful auth
        await new Promise(resolve => setTimeout(resolve, 100));
        const errorEvent = editorPort.getCapturedEvents().find(e => e.event === 'error-message');

        return {
          event,
          hasError: errorEvent !== undefined
        };
      });

      // Verify event data
      expect(result.event.event).toBe('set-mode');
      expect(result.event).toMatchObject({
        embedded: false,
        integration: true
      });
      expect(result.hasError).toBe(false);
    });

    it('should emit error-message on auth failure in integration mode', async () => {
      await setupEditorController({
        editorState: {integration: true, userInfo: {email: 'test@example.com'}},
        gmailMocks: {
          getAccessToken: 'auth-error'
        }
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Trigger editor-mount event
        editorPort.postMessage({event: 'editor-mount'});

        // Wait for error-message event
        const errorEvent = await editorPort.waitForEvent('error-message');

        return errorEvent;
      });

      // Verify error event
      expect(result.event).toBe('error-message');
      expect(result.error).toEqual({
        code: 'AUTHORIZATION_FAILED',
        message: 'Auth failed',
        autoHide: false,
        dismissable: false
      });
    });
  });

  describe('Authorization Flow', () => {
    it('should emit authorization required error on beforeAuthorization', async () => {
      await setupEditorController({
        editorState: {integration: true, userInfo: {email: 'test@example.com'}},
        gmailMocks: {
          getAccessToken: 'with-callbacks'
        }
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Trigger editor-mount to initiate auth flow
        editorPort.postMessage({event: 'editor-mount'});

        // Wait for error-message event from beforeAuth
        const errorEvent = await editorPort.waitForEvent('error-message');

        return errorEvent;
      });

      // Verify error event
      expect(result.event).toBe('error-message');
      expect(result.error).toMatchObject({
        code: 'AUTHORIZATION_REQUIRED',
        autoHide: false,
        dismissable: false
      });
      expect(result.error.message).toContain('gmail_integration_auth_error_send');
    });

    it('should emit hide-notification on afterAuthorization', async () => {
      await setupEditorController({
        editorState: {integration: true, userInfo: {email: 'test@example.com'}},
        gmailMocks: {
          getAccessToken: 'with-callbacks'
        }
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Trigger editor-mount to initiate auth flow
        editorPort.postMessage({event: 'editor-mount'});

        // Wait for hide-notification event from afterAuth
        const hideEvent = await editorPort.waitForEvent('hide-notification');

        return hideEvent;
      });

      // Verify hide-notification event
      expect(result.event).toBe('hide-notification');
    });
  });

  describe('Editor Load and Options', () => {
    it('should emit editor-ready in container mode', async () => {
      await setupEditorController({embedded: true});

      const result = await page.evaluate(async () => {
        const {editorPort, editorContPort} = window.testHarness.getTestData('editorSetup');
        // Trigger editor-load event
        editorPort.postMessage({event: 'editor-load'});

        // Wait for editor-ready event on editorCont port
        const readyEvent = await editorContPort.waitForEvent('editor-ready');

        return readyEvent;
      });

      // Verify event
      expect(result.event).toBe('editor-ready');
    });

    it('should emit set-init-data in standalone mode', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorController, editorPort} = window.testHarness.getTestData('editorSetup');
        // Set some options on the controller
        const options = {
          subject: 'Test Subject',
          signMsg: true,
          predefinedText: 'Hello World'
        };
        editorController.options = options;

        // Trigger editor-load event
        editorPort.postMessage({event: 'editor-load'});

        // Wait for set-init-data event
        const initEvent = await editorPort.waitForEvent('set-init-data');

        return {
          event: initEvent.event,
          data: initEvent.data || initEvent, // Use the whole event if data is not present
          hasDefaultKeyFpr: (initEvent.data ? initEvent.data.defaultKeyFpr : initEvent.defaultKeyFpr) !== undefined
        };
      });

      // Verify event data
      expect(result.event).toBe('set-init-data');
      expect(result.data).toMatchObject({
        signMsg: true,
        subject: 'Test Subject',
        text: 'Hello World'
      });
      expect(result.hasDefaultKeyFpr).toBe(true);
    });

    it('should emit public-key-userids for recipients', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorController, editorPort} = window.testHarness.getTestData('editorSetup');
        // Set recipients
        const recipients = {
          to: [{email: 'test@mailvelope.com'}],
          cc: [{email: 'j.doe@gmail.com'}]
        };
        editorController.options = {recipients};

        // Trigger editor-load event
        editorPort.postMessage({event: 'editor-load'});

        // Wait for public-key-userids event
        const recipientsEvent = await editorPort.waitForEvent('public-key-userids');

        return recipientsEvent;
      });

      // Verify event data
      expect(result.event).toBe('public-key-userids');
      expect(result.keys).toHaveLength(1); // Only test@mailvelope.com has a key in the keyring
      expect(result.to).toHaveLength(1);
      expect(result.cc).toHaveLength(1); // j.doe@gmail.com will be in the list but without a key
      expect(result.cc[0]).toMatchObject({
        email: 'j.doe@gmail.com',
        checkServer: true // No key found locally
      });
      expect(result.to[0]).toMatchObject({
        email: 'test@mailvelope.com',
        fingerprint: expect.any(String)
      });
    });

    it('should handle editor-options event', async () => {
      await setupEditorController();

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Send editor-options event
        editorPort.postMessage({
          event: 'editor-options',
          keyringId: 'test-keyring-id',
          options: {
            subject: 'Test Subject',
            signMsg: false,
            privKeys: true
          }
        });

        // Wait for set-init-data event
        const initEvent = await editorPort.waitForEvent('set-init-data');

        return {
          event: initEvent.event,
          data: initEvent.data || initEvent,
          hasPrivKeys: (initEvent.data || initEvent).privKeys !== undefined,
          hasDefaultKeyFpr: (initEvent.data || initEvent).defaultKeyFpr !== undefined
        };
      });

      // Verify event data
      expect(result.event).toBe('set-init-data');
      expect(result.data).toMatchObject({
        signMsg: false,
        subject: 'Test Subject'
      });
      expect(result.hasPrivKeys).toBe(true);
      expect(result.hasDefaultKeyFpr).toBe(true);
    });
  });

  describe('Recipient and Key Management', () => {
    it('should emit key-update after key lookup', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Send key-lookup event
        editorPort.postMessage({
          event: 'key-lookup',
          recipient: {email: 'newuser@example.com'}
        });

        // Wait for key-update event
        const updateEvent = await editorPort.waitForEvent('key-update');

        return {
          event: updateEvent.event,
          hasKeys: updateEvent.keys !== undefined
        };
      });

      // Verify event
      expect(result.event).toBe('key-update');
      expect(result.hasKeys).toBe(true);
    });

    it('should handle key lookup failure gracefully', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Send key-lookup event
        editorPort.postMessage({
          event: 'key-lookup',
          recipient: {email: 'unknown@example.com'}
        });

        // Wait for key-update event (should still be emitted)
        const updateEvent = await editorPort.waitForEvent('key-update');

        return {
          event: updateEvent.event,
          hasKeys: updateEvent.keys !== undefined
        };
      });

      // Verify event
      expect(result.event).toBe('key-update');
      expect(result.hasKeys).toBe(true);
    });

    it('should emit public-key-userids with correct recipient mapping', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorController, editorPort} = window.testHarness.getTestData('editorSetup');
        // Test setRecipientData directly
        const recipients = {
          to: [
            {email: 'test@mailvelope.com'},
            {email: 'unknown@example.com'}
          ],
          cc: [
            {email: 'j.doe@gmail.com'}
          ]
        };

        await editorController.setRecipientData(recipients);

        // Wait for public-key-userids event
        const recipientsEvent = await editorPort.waitForEvent('public-key-userids');

        return {
          event: recipientsEvent.event,
          hasKeys: recipientsEvent.keys !== undefined,
          toLength: recipientsEvent.to ? recipientsEvent.to.length : 0,
          ccLength: recipientsEvent.cc ? recipientsEvent.cc.length : 0
        };
      });

      // Verify event
      expect(result.event).toBe('public-key-userids');
      expect(result.hasKeys).toBe(true);
      expect(result.toLength).toBe(2);
      expect(result.ccLength).toBe(1);
    });
  });

  describe('Encryption/Decryption Tests', () => {
    it('should emit get-plaintext for container encrypt', async () => {
      await setupEditorController({
        embedded: true,
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Send editor-container-encrypt event
        editorPort.postMessage({
          event: 'editor-container-encrypt',
          keyringId: 'test-keyring-id',
          recipients: ['test@mailvelope.com']
        });

        // Wait for get-plaintext event
        const plaintextEvent = await editorPort.waitForEvent('get-plaintext');

        return plaintextEvent;
      });

      // Verify event
      expect(result.event).toBe('get-plaintext');
      expect(result).toMatchObject({
        action: 'encrypt'
      });
    });

    it('should emit error for missing recipient keys', async () => {
      await setupEditorController({
        embedded: true,
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort, editorContPort} = window.testHarness.getTestData('editorSetup');
        // Send editor-container-encrypt event with unknown recipient
        editorPort.postMessage({
          event: 'editor-container-encrypt',
          keyringId: 'test-keyring-id',
          recipients: ['test@example.com', 'unknown@example.com']
        });

        // Wait for error message on editorCont port
        const errorEvent = await editorContPort.waitForEvent('error-message');

        return errorEvent;
      });

      // Verify error
      expect(result.event).toBe('error-message');
      expect(result.error).toMatchObject({
        message: 'No valid encryption key for recipient address',
        code: 'NO_KEY_FOR_RECIPIENT'
      });
    });

    it('should emit get-plaintext for draft creation', async () => {
      await setupEditorController({
        embedded: true,
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Send editor-container-create-draft event
        editorPort.postMessage({
          event: 'editor-container-create-draft',
          keyringId: 'test-keyring-id'
        });

        // Wait for get-plaintext event
        const plaintextEvent = await editorPort.waitForEvent('get-plaintext');

        return plaintextEvent;
      });

      // Verify event
      expect(result.event).toBe('get-plaintext');
      expect(result).toMatchObject({
        action: 'encrypt',
        draft: true
      });
    });

    it('should emit error for draft creation without private key', async () => {
      await page.evaluate(async () => {
        // Create a keyring with only public keys (no private key)
        await window.testHarness.createTestKeyring('no-private-key-keyring');
      });

      await setupEditorController({
        embedded: true,
        editorState: {keyringId: 'no-private-key-keyring'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort, editorContPort} = window.testHarness.getTestData('editorSetup');

        // Send editor-container-create-draft event
        editorPort.postMessage({
          event: 'editor-container-create-draft',
          keyringId: 'no-private-key-keyring'
        });

        // Wait for error message
        const errorEvent = await editorContPort.waitForEvent('error-message');

        return errorEvent;
      });

      // Verify error
      expect(result.event).toBe('error-message');
      expect(result.error).toMatchObject({
        message: 'No private key found for creating draft.',
        code: 'NO_KEY_FOR_ENCRYPTION'
      });
    });

    it('should emit get-plaintext for sign-only operation', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort} = window.testHarness.getTestData('editorSetup');
        // Send sign-only event
        editorPort.postMessage({
          event: 'sign-only',
          signKeyFpr: '1234567890ABCDEF1234567890ABCDEF12345678'
        });

        // Wait for get-plaintext event
        const plaintextEvent = await editorPort.waitForEvent('get-plaintext');

        return plaintextEvent;
      });

      // Verify event
      expect(result.event).toBe('get-plaintext');
      expect(result).toMatchObject({
        action: 'sign'
      });
    });

    it('should handle full encryption flow', async () => {
      await setupEditorController({
        editorState: {keyringId: 'test-keyring-id'}
      });

      const result = await page.evaluate(async () => {
        const {editorPort, gmailController} = window.testHarness.getTestData('editorSetup');

        // Track calls to gmailController.encryptedMessage
        let encryptedMessageCalled = false;
        let encryptedMessageArgs = null;
        gmailController.encryptedMessage = function(...args) {
          encryptedMessageCalled = true;
          encryptedMessageArgs = args[0];
          // Don't call the original method as it requires Gmail API setup
          // Just return success
          return Promise.resolve();
        };

        // Send editor-plaintext event
        editorPort.postMessage({
          event: 'editor-plaintext',
          action: 'encrypt',
          message: 'Hello World',
          keysTo: [{fingerprint: 'add0c44ae80a572f3805729cf47328454fa3ab54', email: 'test@mailvelope.com'}],
          keysCc: [],
          keysEx: [],
          attachments: [],
          signMsg: false,
          subject: 'Test Subject'
        });

        // Wait for encrypt-in-progress event
        const progressEvent = await editorPort.waitForEvent('encrypt-in-progress');

        // Wait for encrypt-end event
        const endEvent = await editorPort.waitForEvent('encrypt-end');

        return {
          progressEvent: progressEvent.event,
          endEvent: endEvent.event,
          encryptedMessageCalled,
          encryptedMessageArgs,
          armoredContainsPgpHeader: encryptedMessageArgs && encryptedMessageArgs.armored &&
                                    encryptedMessageArgs.armored.includes('-----BEGIN PGP MESSAGE-----')
        };
      });

      // Verify events
      expect(result.progressEvent).toBe('encrypt-in-progress');
      expect(result.endEvent).toBe('encrypt-end');

      // Verify gmail controller was called
      expect(result.encryptedMessageCalled).toBe(true);
      expect(result.encryptedMessageArgs).toMatchObject({
        encFiles: [],
        subject: 'Test Subject',
        to: [{email: 'test@mailvelope.com'}],
        cc: []
      });
      expect(result.armoredContainsPgpHeader).toBe(true);
    });
  });
});
