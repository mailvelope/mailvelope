/* global page */

describe('EncryptFrame integration tests', () => {
  beforeAll(async () => {
    await page.goto(global.testPageUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof window.testHarness !== 'undefined');
  });

  beforeEach(async () => {
    await page.evaluate(() => {
      window.testHarness.initCore();
      // Create test container
      const container = document.createElement('div');
      container.id = 'test-container';
      container.style.position = 'relative';
      container.style.width = '800px';
      container.style.height = '600px';
      container.style.margin = '50px';
      document.body.appendChild(container);
      // Create textarea
      const textarea = document.createElement('textarea');
      textarea.id = 'test-textarea';
      textarea.style.width = '100%';
      textarea.style.height = '200px';
      textarea.value = 'Hello World';
      container.appendChild(textarea);
      // Create contenteditable div
      const contentEditable = document.createElement('div');
      contentEditable.id = 'test-contenteditable';
      contentEditable.contentEditable = true;
      contentEditable.style.width = '100%';
      contentEditable.style.height = '200px';
      contentEditable.style.border = '1px solid #ccc';
      contentEditable.style.marginTop = '20px';
      contentEditable.innerHTML = 'Hello <b>World</b>';
      container.appendChild(contentEditable);
    });
  });

  afterEach(async () => {
    await page.evaluate(() => {
      window.testHarness.reset();
      const container = document.getElementById('test-container');
      if (container) {
        container.remove();
      }
      // Clean up any remaining shadow roots
      document.querySelectorAll('div[id^="eFrame-"]').forEach(el => {
        if (el.parentNode && el.parentNode.shadowRoot) {
          el.parentNode.remove();
        }
      });
    });
  });

  describe('Shadow DOM rendering', () => {
    it('should create shadow DOM with encrypt button', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const textarea = document.getElementById('test-textarea');
        const encryptFrame = new EncryptFrame();
        encryptFrame.attachTo(textarea);
        // Wait for frame to render
        await new Promise(resolve => setTimeout(resolve, 100));
        // Find shadow root
        const shadowHost = textarea.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-encrypt-frame');
        const button = shadowRoot.querySelector('#editorBtn');
        const closeButton = shadowRoot.querySelector('.m-encrypt-close');
        return {
          hasShadowRoot: Boolean(shadowRoot),
          hasFrame: Boolean(frame),
          hasButton: Boolean(button),
          hasCloseButton: Boolean(closeButton),
          frameId: frame?.id,
          buttonText: button?.textContent.trim()
        };
      });

      expect(result.hasShadowRoot).toBe(true);
      expect(result.hasFrame).toBe(true);
      expect(result.hasButton).toBe(true);
      expect(result.hasCloseButton).toBe(true);
      expect(result.frameId).toMatch(/^eFrame-/);
      expect(result.buttonText).toBeTruthy();
    });

    it('should apply correct CSS classes and show animation', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const textarea = document.getElementById('test-textarea');
        const encryptFrame = new EncryptFrame();
        encryptFrame.attachTo(textarea);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost = textarea.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-encrypt-frame');
        return {
          hasShowClass: frame.classList.contains('m-show'),
          frameClasses: Array.from(frame.classList)
        };
      });

      expect(result.hasShowClass).toBe(true);
      expect(result.frameClasses).toContain('m-encrypt-frame');
      expect(result.frameClasses).toContain('m-show');
    });
  });

  describe('Button interactions', () => {
    it('should activate editor when encrypt button is clicked', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const mockEventHandler = window.testHarness.getMock('EventHandler');
        const mockProvider = window.testHarness.getMock('Provider');
        const textarea = document.getElementById('test-textarea');
        const encryptFrame = new EncryptFrame();
        // Setup mocks
        encryptFrame.currentProvider = mockProvider;
        encryptFrame.establishConnection = function() {
          this.port = mockEventHandler;
        };
        encryptFrame.attachTo(textarea);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost = textarea.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const button = shadowRoot.querySelector('#editorBtn');
        const container = shadowRoot.querySelector('.m-encrypt-container');
        const beforeClick = container.classList.contains('active');
        button.click();
        // Wait for async showMailEditor to complete
        await new Promise(resolve => setTimeout(resolve, 50));
        const afterClick = container.classList.contains('active');
        return {
          beforeClick,
          afterClick,
          emitCalls: mockEventHandler.getEmitCalls()
        };
      });

      expect(result.beforeClick).toBe(false);
      expect(result.afterClick).toBe(true);
      expect(result.emitCalls).toHaveLength(1);
      expect(result.emitCalls[0].event).toBe('eframe-display-editor');
    });

    it('should close frame when close button is clicked', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const mockEventHandler = window.testHarness.getMock('EventHandler');
        const mockProvider = window.testHarness.getMock('Provider');
        const textarea = document.getElementById('test-textarea');
        const encryptFrame = new EncryptFrame();
        // Setup mocks
        encryptFrame.currentProvider = mockProvider;
        encryptFrame.establishConnection = function() {
          this.port = mockEventHandler;
        };
        encryptFrame.attachTo(textarea);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost = textarea.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-encrypt-frame');
        const closeButton = shadowRoot.querySelector('.m-encrypt-close');
        const beforeClose = frame.classList.contains('m-show');
        closeButton.click();
        const afterClose = frame.classList.contains('m-show');
        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 350));
        const frameRemoved = !shadowRoot.querySelector('.m-encrypt-frame');
        const frameStatus = textarea.dataset.mveloFrame;
        return {
          beforeClose,
          afterClose,
          frameRemoved,
          frameStatus
        };
      });

      expect(result.beforeClose).toBe(true);
      expect(result.afterClose).toBe(false);
      expect(result.frameRemoved).toBe(true);
      expect(result.frameStatus).toBe('det');
    });
  });

  describe('Frame positioning', () => {
    it('should position frame relative to textarea', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const textarea = document.getElementById('test-textarea');
        textarea.style.marginTop = '100px';
        const encryptFrame = new EncryptFrame();
        encryptFrame.attachTo(textarea);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost = textarea.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-encrypt-frame');
        return {
          frameTop: frame.style.top,
          frameRight: frame.style.right,
          textareaOffsetTop: textarea.offsetTop
        };
      });

      expect(result.frameTop).toBe(`${result.textareaOffsetTop + 5}px`);
      expect(result.frameRight).toBe('20px');
    });

    it('should update position on window resize', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const textarea = document.getElementById('test-textarea');
        const encryptFrame = new EncryptFrame();
        encryptFrame.attachTo(textarea);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost = textarea.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-encrypt-frame');
        const initialTop = frame.style.top;
        // Change textarea position
        textarea.style.marginTop = '200px';
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve => setTimeout(resolve, 50));
        const newTop = frame.style.top;
        return {
          initialTop,
          newTop,
          changed: initialTop !== newTop
        };
      });

      expect(result.changed).toBe(true);
    });
  });

  describe('ContentEditable support', () => {
    it('should work with contenteditable elements', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const mockEventHandler = window.testHarness.getMock('EventHandler');
        const mockProvider = window.testHarness.getMock('Provider');
        const contentEditable = document.getElementById('test-contenteditable');
        const encryptFrame = new EncryptFrame();
        // Setup mocks
        encryptFrame.currentProvider = mockProvider;
        encryptFrame.establishConnection = function() {
          this.port = mockEventHandler;
        };
        encryptFrame.attachTo(contentEditable);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost = contentEditable.nextSibling;
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-encrypt-frame');
        const button = shadowRoot.querySelector('#editorBtn');
        button.click();
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));
        const emitCalls = mockEventHandler.getEmitCalls();
        const editorCall = emitCalls.find(call => call.event === 'eframe-display-editor');
        return {
          hasFrame: Boolean(frame),
          hasButton: Boolean(button),
          editorOptions: editorCall?.data,
          emitCalls: emitCalls.length
        };
      });

      expect(result.hasFrame).toBe(true);
      expect(result.hasButton).toBe(true);
      expect(result.editorOptions).toBeTruthy();
      expect(result.editorOptions.text).toContain('Hello World');
      expect(result.emitCalls).toBeGreaterThan(0);
    });
  });

  describe('Multiple frames', () => {
    it('should handle multiple encrypt frames on same page', async () => {
      const result = await page.evaluate(async () => {
        const {EncryptFrame} = window.testHarness.getContentScripts();
        const textarea = document.getElementById('test-textarea');
        const contentEditable = document.getElementById('test-contenteditable');
        const encryptFrame1 = new EncryptFrame();
        const encryptFrame2 = new EncryptFrame();
        encryptFrame1.attachTo(textarea);
        encryptFrame2.attachTo(contentEditable);
        await new Promise(resolve => setTimeout(resolve, 100));
        const shadowHost1 = textarea.nextSibling;
        const shadowHost2 = contentEditable.nextSibling;
        const frame1 = shadowHost1.shadowRoot.querySelector('.m-encrypt-frame');
        const frame2 = shadowHost2.shadowRoot.querySelector('.m-encrypt-frame');
        return {
          frame1Id: frame1.id,
          frame2Id: frame2.id,
          differentIds: frame1.id !== frame2.id,
          bothVisible: frame1.classList.contains('m-show') && frame2.classList.contains('m-show')
        };
      });

      expect(result.differentIds).toBe(true);
      expect(result.bothVisible).toBe(true);
      expect(result.frame1Id).toMatch(/^eFrame-/);
      expect(result.frame2Id).toMatch(/^eFrame-/);
    });
  });
});
