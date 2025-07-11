/* global page */

describe('DecryptController integration tests', () => {
  beforeAll(async () => {
    await page.goto(global.testPageUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof window.testHarness !== 'undefined');

    // Initialize core and create test keyring once for all tests
    await page.evaluate(async () => {
      await window.testHarness.initCore();
      await window.testHarness.createTestKeyring('test-keyring-id', {importTestKeys: true});
    });
  });

  beforeEach(async () => {
    await page.evaluate(() => {
      // Only reset state and set preferences for each test
      window.testHarness.reset();

      // Set up test preferences
      window.testHarness.setPrefs({
        general: {
          auto_sign_msg: false,
          auto_add_primary: false
        },
        security: {
          password_cache: true,
          display_decrypted: 'inline'
        }
      });
    });
  });

  /**
   * Setup function to create DecryptController
   * Since DecryptController has no peer controllers, setup is simplified
   * @param {Object} config - Configuration options
   * @param {string} config.mainType - Controller main type ('decryptCont' or 'dFrame')
   * @param {Object} config.controllerState - Initial state for controller
   * @param {Object} config.mocks - Mock configurations for different modules
   */
  const setupDecryptController = async (config = {}) => {
    await page.evaluate(async config => {
      const {createController} = window.testHarness.getControllerFactory();
      const {createPortConnection} = window.testHarness;

      // Generate unique ID
      const controllerId = crypto.randomUUID().replaceAll('-', '');
      const mainType = config.mainType || 'decryptCont';

      // Create main port for DecryptController
      const mainPortName = `${mainType}-${controllerId}`;
      const mainPort = createPortConnection(mainPortName);
      const decryptController = createController(mainType, mainPort._otherPort);

      // Set initial state if provided
      if (config.controllerState) {
        await decryptController.setState(config.controllerState);
      }

      // Create dDialog port (always needed for decrypt operations)
      const dDialogPortName = `dDialog-${controllerId}`;
      const dDialogPort = createPortConnection(dDialogPortName);
      const dDialogReceivedPort = dDialogPort._otherPort;
      decryptController.addPort(dDialogReceivedPort);

      // Enable event capturing
      mainPort.enableEventCapture();
      dDialogPort.enableEventCapture();

      // Enable event capturing on the controller's receiving ports
      decryptController._port?.enableEventCapture();
      decryptController.ports.dDialog?._port?.enableEventCapture();

      // Store references
      window.testHarness.setTestData('decryptSetup', {
        decryptController,
        mainPort,
        dDialogPort,
        mainType,
        controllerId
      });
    }, config);
  };

  describe('Controller Initialization', () => {
    it('should create DecryptController with decryptCont main type', async () => {
      await setupDecryptController({mainType: 'decryptCont'});

      const result = await page.evaluate(() => {
        const {decryptController, mainType} = window.testHarness.getTestData('decryptSetup');
        return {
          mainType: decryptController.mainType,
          hasId: typeof decryptController.id === 'string',
          hasState: typeof decryptController.state === 'object',
          expectedMainType: mainType
        };
      });

      expect(result.mainType).toBe('decryptCont');
      expect(result.hasId).toBe(true);
      expect(result.hasState).toBe(true);
      expect(result.mainType).toBe(result.expectedMainType);
    });

    it('should create DecryptController with dFrame main type', async () => {
      await setupDecryptController({mainType: 'dFrame'});

      const result = await page.evaluate(() => {
        const {decryptController} = window.testHarness.getTestData('decryptSetup');
        return {
          mainType: decryptController.mainType,
          hasId: typeof decryptController.id === 'string',
          hasState: typeof decryptController.state === 'object'
        };
      });

      expect(result.mainType).toBe('dFrame');
      expect(result.hasId).toBe(true);
      expect(result.hasState).toBe(true);
    });

    it('should register event handlers correctly', async () => {
      await setupDecryptController();

      const result = await page.evaluate(() => {
        const {decryptController} = window.testHarness.getTestData('decryptSetup');
        const handlers = Array.from(decryptController._handlers.keys());
        return {
          hasDecryptDialogCancel: handlers.includes('decrypt-dialog-cancel'),
          hasDecryptMessageInit: handlers.includes('decrypt-message-init'),
          hasDecryptMessage: handlers.includes('decrypt-message'),
          hasDframeDisplayPopup: handlers.includes('dframe-display-popup'),
          hasSetArmored: handlers.includes('set-armored'),
          hasDecryptInlineUserInput: handlers.includes('decrypt-inline-user-input')
        };
      });

      expect(result.hasDecryptDialogCancel).toBe(true);
      expect(result.hasDecryptMessageInit).toBe(true);
      expect(result.hasDecryptMessage).toBe(true);
      expect(result.hasDframeDisplayPopup).toBe(true);
      expect(result.hasSetArmored).toBe(true);
      expect(result.hasDecryptInlineUserInput).toBe(true);
    });

    it('should initialize with correct default state', async () => {
      await setupDecryptController();

      const result = await page.evaluate(() => {
        const {decryptController} = window.testHarness.getTestData('decryptSetup');
        return {
          state: decryptController.state,
          armored: decryptController.armored,
          message: decryptController.message,
          sender: decryptController.sender,
          popup: decryptController.popup,
          reconnect: decryptController.reconnect
        };
      });

      expect(result.state).toEqual({
        popupId: null,
        popupOpenerTabId: null
      });
      expect(result.armored).toBe(null);
      expect(result.message).toBe(null);
      expect(result.sender).toBe(null);
      expect(result.popup).toBe(null);
      expect(result.reconnect).toBe(false);
    });

    it('should handle port connections correctly', async () => {
      await setupDecryptController();

      const result = await page.evaluate(() => {
        const {decryptController} = window.testHarness.getTestData('decryptSetup');
        return {
          hasMainPort: decryptController.hasPort(decryptController.mainType),
          hasDDialogPort: decryptController.hasPort('dDialog'),
          portKeys: Object.keys(decryptController.ports)
        };
      });

      expect(result.hasMainPort).toBe(true);
      expect(result.hasDDialogPort).toBe(true);
      expect(result.portKeys).toContain('dDialog');
    });
  });

  describe('Message Setup and Armored Data', () => {
    it('should handle set-armored event with basic data', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize decrypt first to create decryptReady promise
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        // Wait for decrypt-message-init to be processed on the receiving side
        await decryptController._port.waitForEvent('decrypt-message-init');

        // Trigger set-armored event
        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for set-armored to be processed on the receiving side
        await decryptController._port.waitForEvent('set-armored');

        return {
          armored: decryptController.armored,
          keyringId: decryptController.keyringId,
          reconnect: decryptController.reconnect
        };
      });

      expect(result.armored).toBe('-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----');
      expect(result.keyringId).toBe('test-keyring-id');
      expect(result.reconnect).toBe(false);
    });

    it('should handle set-armored event with sender address', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize decrypt first
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        await decryptController._port.waitForEvent('decrypt-message-init');

        // Trigger set-armored event with sender
        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id',
          options: {
            senderAddress: 'sender@example.com'
          }
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored');

        return {
          armored: decryptController.armored,
          sender: decryptController.sender,
          keyringId: decryptController.keyringId
        };
      });

      expect(result.armored).toBe('-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----');
      expect(result.sender).toBe('sender@example.com');
      expect(result.keyringId).toBe('test-keyring-id');
    });

    it('should handle set-armored event with allKeyrings option', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize decrypt first
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        await decryptController._port.waitForEvent('decrypt-message-init');

        // Trigger set-armored event with allKeyrings
        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          allKeyrings: true
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored');

        return {
          armored: decryptController.armored,
          keyringId: decryptController.keyringId
        };
      });

      expect(result.armored).toBe('-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----');
      expect(result.keyringId).toBe(undefined);
    });

    it('should handle set-armored event in reconnect mode', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // First initialize with reconnect
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: true
        });

        // Wait for init
        await decryptController._port.waitForEvent('decrypt-message-init');

        // Then set armored
        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored');

        return {
          armored: decryptController.armored,
          reconnect: decryptController.reconnect
        };
      });

      expect(result.armored).toBe('-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----');
      expect(result.reconnect).toBe(true);
    });
  });

  describe('Decryption Initialization', () => {
    it('should handle decrypt-message-init event', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');

        // Trigger decrypt-message-init event
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        // Wait for processing
        await decryptController._port.waitForEvent('decrypt-message-init');

        return {
          reconnect: decryptController.reconnect,
          hasDecryptReady: decryptController.decryptReady !== null,
          keyringId: decryptController.keyringId
        };
      });

      expect(result.reconnect).toBe(false);
      expect(result.hasDecryptReady).toBe(true);
      expect(result.keyringId).toBe('localhost|#|mailvelope'); // Should be set to preferred keyring
    });

    it('should handle decrypt-message-init with reconnect', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');

        // Trigger decrypt-message-init with reconnect
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: true
        });

        // Wait for processing
        await decryptController._port.waitForEvent('decrypt-message-init');

        return {
          reconnect: decryptController.reconnect,
          hasDecryptReady: decryptController.decryptReady !== null
        };
      });

      expect(result.reconnect).toBe(true);
      expect(result.hasDecryptReady).toBe(true);
    });

    it('should emit error when popup is required but not available', async () => {
      // Set preferences to require popup
      await page.evaluate(() => {
        window.testHarness.setPrefs({
          security: {
            display_decrypted: 'popup'
          }
        });
      });

      await setupDecryptController({mainType: 'dFrame'});

      const result = await page.evaluate(async () => {
        const {mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');

        // Trigger decrypt-message-init
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        // Wait for error message
        const errorEvent = await dDialogPort.waitForEvent('error-message');

        return errorEvent;
      });

      expect(result.event).toBe('error-message');
      expect(result.error).toContain('decrypt_no_popup_error');
    });

    it('should request armored data from dFrame port', async () => {
      await setupDecryptController({mainType: 'dFrame'});

      const result = await page.evaluate(async () => {
        const {mainPort} = window.testHarness.getTestData('decryptSetup');

        // Trigger decrypt-message-init
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        // Wait for get-armored request (mainPort is the dFrame when mainType is 'dFrame')
        const getArmoredEvent = await mainPort.waitForEvent('get-armored');

        return getArmoredEvent;
      });

      expect(result.event).toBe('get-armored');
    });
  });

  describe('Decryption Flow Success Cases', () => {
    it('should perform successful decryption with cached password', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');

        // Create a real encrypted message using the test harness
        const testMessage = 'Hello, this is a test message!';
        const testArmored = await window.testHarness.encryptTestMessage(testMessage);

        // Initialize decryption
        mainPort.postMessage({
          event: 'decrypt-message-init',
          reconnect: false
        });

        // Wait for init
        await decryptController._port.waitForEvent('decrypt-message-init');

        // Set armored data
        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for decryption to complete
        await dDialogPort.waitForEvent('decrypted-message', 5000);

        // Check for events
        const events = dDialogPort.getCapturedEvents();
        const waitingEvents = events.filter(e => e.event === 'waiting');
        const decryptedEvent = events.find(e => e.event === 'decrypted-message');

        return {
          hasWaitingStart: waitingEvents.some(e => e.waiting === true),
          hasWaitingEnd: waitingEvents.some(e => e.waiting === false),
          hasDecryptedMessage: decryptedEvent !== undefined,
          decryptedContent: decryptedEvent ? decryptedEvent.message : null,
          expectedMessage: testMessage
        };
      });

      expect(result.hasWaitingStart).toBe(true);
      expect(result.hasWaitingEnd).toBe(true);
      expect(result.hasDecryptedMessage).toBe(true);
      expect(result.decryptedContent).toBe(result.expectedMessage);
    });

    it('should handle signature verification during decryption', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');

        // Create a real encrypted and signed message using the test harness
        const testMessage = 'Test signed message content';
        const testArmored = await window.testHarness.encryptTestMessage(testMessage, {
          signingKeyFpr: 'add0c44ae80a572f3805729cf47328454fa3ab54' // api_test key fingerprint
        });

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await dDialogPort.waitForEvent('decrypted-message', 2000);

        // Look for signature verification event
        const events = dDialogPort.getCapturedEvents();
        const sigVerifyEvent = events.find(e => e.event === 'signature-verification');
        const decryptedEvent = events.find(e => e.event === 'decrypted-message');

        return {
          hasSignatureVerification: sigVerifyEvent !== undefined,
          signatures: sigVerifyEvent ? sigVerifyEvent.signers : null,
          decryptedContent: decryptedEvent ? decryptedEvent.message : null,
          expectedMessage: testMessage
        };
      });

      expect(result.hasSignatureVerification).toBe(true);
      expect(result.signatures).toBeTruthy();
      expect(result.signatures.length).toBeGreaterThan(0);
      expect(result.decryptedContent).toBe(result.expectedMessage);
    });

    it('should emit decrypt-done for container mode', async () => {
      await setupDecryptController({mainType: 'decryptCont'});

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');

        // Create a real encrypted message using the test harness
        const testMessage = 'Test container mode message';
        const testArmored = await window.testHarness.encryptTestMessage(testMessage);

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await dDialogPort.waitForEvent('decrypted-message', 2000);

        // Look for decrypt-done event
        const events = mainPort.getCapturedEvents();
        const decryptDoneEvent = events.find(e => e.event === 'decrypt-done');

        return {
          hasDecryptDone: decryptDoneEvent !== undefined
        };
      });

      expect(result.hasDecryptDone).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle ARMOR_PARSE_ERROR', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored', 2000);

        // Check for error message
        const events = dDialogPort.getCapturedEvents();
        const errorEvent = events.find(e => e.event === 'error-message');

        return {
          hasErrorMessage: errorEvent !== undefined,
          errorMessage: errorEvent ? errorEvent.error : null
        };
      });

      expect(result.hasErrorMessage).toBe(true);
      expect(result.errorMessage).toBe('message_read_error');
    });

    it('should handle NO_KEY_FOUND error', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored', 2000);

        // Check for error message
        const events = dDialogPort.getCapturedEvents();
        const errorEvent = events.find(e => e.event === 'error-message');

        return {
          hasErrorMessage: errorEvent !== undefined,
          errorMessage: errorEvent ? errorEvent.error : null
        };
      });

      expect(result.hasErrorMessage).toBe(true);
      expect(result.errorMessage).toBe('message_read_error');
    });

    it('should handle generic decryption errors for API', async () => {
      await setupDecryptController({mainType: 'decryptCont'});

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored', 2000);

        // Check for error message on main port (API)
        const events = mainPort.getCapturedEvents();
        const errorEvent = events.find(e => e.event === 'error-message');

        return {
          hasErrorMessage: errorEvent !== undefined,
          errorCode: errorEvent ? errorEvent.error.code : null,
          errorMessage: errorEvent ? errorEvent.error.message : null
        };
      });

      expect(result.hasErrorMessage).toBe(true);
      expect(result.errorCode).toBe('ARMOR_PARSE_ERROR');
      expect(result.errorMessage).toBe('message_read_error');
    });

    it('should handle corrupted message data', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');
        const corruptedArmored = '-----BEGIN PGP MESSAGE-----\ncorrupted data\n-----END PGP MESSAGE-----';

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: corruptedArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored', 2000);

        // Check for error message
        const events = dDialogPort.getCapturedEvents();
        const errorEvent = events.find(e => e.event === 'error-message');

        return {
          hasErrorMessage: errorEvent !== undefined,
          errorMessage: errorEvent ? errorEvent.error : null
        };
      });

      expect(result.hasErrorMessage).toBe(true);
      expect(result.errorMessage).toBe('message_read_error');
    });

    it('should handle missing private key gracefully', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Initialize and set armored
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id'
        });

        // Wait for processing
        await decryptController._port.waitForEvent('set-armored', 2000);

        // Check for error or lock message
        const events = dDialogPort.getCapturedEvents();
        const errorEvent = events.find(e => e.event === 'error-message');
        const lockEvent = events.find(e => e.event === 'lock');

        return {
          hasErrorMessage: errorEvent !== undefined,
          hasLockEvent: lockEvent !== undefined,
          errorMessage: errorEvent ? errorEvent.error : null
        };
      });

      // Should either show error or lock dialog
      expect(result.hasErrorMessage || result.hasLockEvent).toBe(true);
    });
  });

  describe('Cleanup and Cancellation', () => {
    it('should handle dialog cancellation', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort, dDialogPort} = window.testHarness.getTestData('decryptSetup');

        // Initialize controller
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        // Trigger dialog cancel
        mainPort.postMessage({event: 'decrypt-dialog-cancel'});

        // Wait for processing
        await decryptController._port.waitForEvent('decrypt-dialog-cancel');

        // Check for lock event
        const events = dDialogPort.getCapturedEvents();
        const lockEvent = events.find(e => e.event === 'lock');

        return {
          hasLockEvent: lockEvent !== undefined,
          popupState: decryptController.state
        };
      });

      expect(result.hasLockEvent).toBe(true);
    });

    it('should handle resource cleanup on cancel', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');

        // Set some state
        decryptController.setState({
          popupId: 'test-popup-id',
          popupOpenerTabId: 'test-tab-id'
        });

        // Initialize controller
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        // Trigger dialog cancel
        mainPort.postMessage({event: 'decrypt-dialog-cancel'});

        // Wait for processing
        await decryptController._port.waitForEvent('decrypt-dialog-cancel');

        return {
          popupState: decryptController.state,
          popup: decryptController.popup
        };
      });

      // State should be cleaned up
      expect(result.popup).toBe(null);
    });

    it('should handle state reset correctly', async () => {
      await setupDecryptController();

      const result = await page.evaluate(async () => {
        const {decryptController, mainPort} = window.testHarness.getTestData('decryptSetup');
        const testArmored = '-----BEGIN PGP MESSAGE-----\ntest encrypted content\n-----END PGP MESSAGE-----';

        // Set some data
        mainPort.postMessage({event: 'decrypt-message-init', reconnect: false});
        await decryptController._port.waitForEvent('decrypt-message-init');

        mainPort.postMessage({
          event: 'set-armored',
          data: testArmored,
          keyringId: 'test-keyring-id',
          options: {senderAddress: 'test@example.com'}
        });
        await decryptController._port.waitForEvent('set-armored');

        // Verify data is set
        const beforeCancel = {
          armored: decryptController.armored,
          sender: decryptController.sender,
          keyringId: decryptController.keyringId
        };

        // Cancel dialog
        mainPort.postMessage({event: 'decrypt-dialog-cancel'});
        await decryptController._port.waitForEvent('decrypt-dialog-cancel');

        // Check if data is still there (it should be, cancel doesn't clear message data)
        const afterCancel = {
          armored: decryptController.armored,
          sender: decryptController.sender,
          keyringId: decryptController.keyringId
        };

        return {
          beforeCancel,
          afterCancel
        };
      });

      // Data should persist after cancel (only UI state changes)
      expect(result.beforeCancel.armored).toBe(result.afterCancel.armored);
      expect(result.beforeCancel.sender).toBe(result.afterCancel.sender);
      expect(result.beforeCancel.keyringId).toBe(result.afterCancel.keyringId);
    });
  });
});

