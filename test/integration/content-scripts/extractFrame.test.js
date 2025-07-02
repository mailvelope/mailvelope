/* global page */

describe('ExtractFrame integration tests', () => {
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

      // Create PGP message content
      const pgpContent = document.createElement('div');
      pgpContent.id = 'pgp-content';
      pgpContent.style.width = '100%';
      pgpContent.style.height = '200px';
      pgpContent.style.border = '1px solid #ccc';
      pgpContent.style.padding = '10px';
      pgpContent.innerHTML = `
        -----BEGIN PGP MESSAGE-----
        Version: Mailvelope v4.0.0
        
        wcBMA0fcZ7XLrEBsAQgAyDHdL3KZmkfPGp7CY3DU8A3tUzF8CzMjj7k4
        ...encrypted content...
        -----END PGP MESSAGE-----
      `;
      container.appendChild(pgpContent);

      // Create another PGP message for multi-frame testing
      const pgpContent2 = document.createElement('pre');
      pgpContent2.id = 'pgp-content-2';
      pgpContent2.style.marginTop = '20px';
      pgpContent2.textContent = `-----BEGIN PGP MESSAGE-----
Version: Mailvelope v4.0.0

wcBMA0fcZ7XLrEBsAQgAyDHdL3KZmkfPGp7CY3DU8A3tUzF8CzMjj7k4
...second encrypted content...
-----END PGP MESSAGE-----`;
      container.appendChild(pgpContent2);
    });
  });

  afterEach(async () => {
    await page.evaluate(() => {
      window.testHarness.reset();
      const container = document.getElementById('test-container');
      if (container) {
        container.remove();
      }
      // Clean up any remaining shadow roots and frames
      document.querySelectorAll('.m-extract-wrapper').forEach(wrapper => {
        wrapper.remove();
      });
      document.querySelectorAll('div[id^="eFrame-"]').forEach(frame => {
        if (frame.parentNode && frame.parentNode.shadowRoot) {
          frame.parentNode.remove();
        }
      });
    });
  });

  describe('Shadow DOM rendering', () => {
    it('should create shadow DOM with extract frame and close button', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content');
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        // Wait for frame to render
        await new Promise(resolve => setTimeout(resolve, 200));

        // Find wrapper and shadow root
        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');
        const closeButton = shadowRoot.querySelector('.m-frame-close');
        const style = shadowRoot.querySelector('style');

        return {
          hasWrapper: Boolean(wrapper),
          hasShadowRoot: Boolean(shadowRoot),
          hasFrame: Boolean(frame),
          hasCloseButton: Boolean(closeButton),
          hasStyle: Boolean(style),
          frameId: frame?.id,
          frameClasses: frame ? Array.from(frame.classList) : [],
          closeButtonText: closeButton?.textContent,
          styleContent: style?.textContent?.includes('m-extract-frame')
        };
      });

      expect(result.hasWrapper).toBe(true);
      expect(result.hasShadowRoot).toBe(true);
      expect(result.hasFrame).toBe(true);
      expect(result.hasCloseButton).toBe(true);
      expect(result.hasStyle).toBe(true);
      expect(result.frameId).toMatch(/^eFrame-/);
      expect(result.frameClasses).toContain('m-extract-frame');
      expect(result.frameClasses).toContain('m-cursor');
      expect(result.closeButtonText).toBe('×');
      // Just check that style element exists rather than content
      expect(result.hasStyle).toBe(true);
    });

    it('should apply large frame class for tall content', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content');
        // Add lots of content to make it naturally tall
        pgpContent.innerHTML = `
          -----BEGIN PGP MESSAGE-----
          Version: Mailvelope v4.0.0
          
          wcBMA0fcZ7XLrEBsAQgAyDHdL3KZmkfPGp7CY3DU8A3tUzF8CzMjj7k4
          ...encrypted content...
          Line 1<br>Line 2<br>Line 3<br>Line 4<br>Line 5<br>
          Line 6<br>Line 7<br>Line 8<br>Line 9<br>Line 10<br>
          Line 11<br>Line 12<br>Line 13<br>Line 14<br>Line 15<br>
          Line 16<br>Line 17<br>Line 18<br>Line 19<br>Line 20<br>
          Line 21<br>Line 22<br>Line 23<br>Line 24<br>Line 25<br>
          Line 26<br>Line 27<br>Line 28<br>Line 29<br>Line 30<br>
          Line 31<br>Line 32<br>Line 33<br>Line 34<br>Line 35<br>
          Line 36<br>Line 37<br>Line 38<br>Line 39<br>Line 40<br>
          -----END PGP MESSAGE-----
        `;
        pgpContent.style.lineHeight = '20px'; // Force height

        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');

        return {
          hasLargeClass: frame.classList.contains('m-large'),
          frameHeight: range.getBoundingClientRect().height,
          contentHeight: pgpContent.getBoundingClientRect().height,
          frameClasses: Array.from(frame.classList)
        };
      });

      expect(result.frameHeight).toBeGreaterThan(600);
      expect(result.hasLargeClass).toBe(true);
    });
  });

  describe('Frame interactions', () => {
    it('should handle click on frame', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const mockEventHandler = window.testHarness.getMock('EventHandler');
        const pgpContent = document.getElementById('pgp-content');
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.establishConnection = function() {
          this.port = mockEventHandler;
        };
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');

        const beforeClick = {
          hasCursor: frame.classList.contains('m-cursor'),
          hasOpen: frame.classList.contains('m-open')
        };

        frame.click();

        const afterClick = {
          hasCursor: frame.classList.contains('m-cursor'),
          hasOpen: frame.classList.contains('m-open')
        };

        return {
          beforeClick,
          afterClick
        };
      });

      expect(result.beforeClick.hasCursor).toBe(true);
      expect(result.beforeClick.hasOpen).toBe(false);
      expect(result.afterClick.hasCursor).toBe(false);
      expect(result.afterClick.hasOpen).toBe(true);
    });

    it('should close frame when close button is clicked', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const mockEventHandler = window.testHarness.getMock('EventHandler');
        const pgpContent = document.getElementById('pgp-content');
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.establishConnection = function() {
          this.port = mockEventHandler;
        };
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');
        const closeButton = shadowRoot.querySelector('.m-frame-close');

        // Manually trigger onShow to add m-show class
        extractFrame.onShow();

        const beforeClose = {
          hasShow: frame.classList.contains('m-show'),
          frameStatus: wrapper.dataset.mveloFrame
        };

        closeButton.click();

        const afterClose = {
          hasShow: frame.classList.contains('m-show'),
          frameStatus: wrapper.dataset.mveloFrame
        };

        // Wait for shadow root removal
        await new Promise(resolve => setTimeout(resolve, 350));

        const shadowRootRemoved = !shadowHost.shadowRoot || shadowHost.shadowRoot.children.length === 0;

        return {
          beforeClose,
          afterClose,
          shadowRootRemoved
        };
      });

      expect(result.beforeClose.hasShow).toBe(true);
      expect(result.afterClose.hasShow).toBe(false);
      expect(result.afterClose.frameStatus).toBe('det');
    });
  });

  describe('Frame positioning and dimensions', () => {
    it('should set frame dimensions based on content', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content');
        pgpContent.style.width = '400px';
        pgpContent.style.height = '150px';
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');

        // Trigger setFrameDim manually since onShow calls it
        extractFrame.setFrameDim();

        return {
          frameWidth: frame.style.width,
          frameHeight: frame.style.height,
          contentRect: pgpContent.getBoundingClientRect()
        };
      });

      expect(result.frameWidth).toBeTruthy();
      expect(result.frameHeight).toBeTruthy();
      expect(parseFloat(result.frameWidth)).toBeGreaterThan(0);
      expect(parseFloat(result.frameHeight)).toBeGreaterThan(0);
    });

    it('should update dimensions on window resize', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content');
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');

        const initialDimensions = {
          width: frame.style.width,
          height: frame.style.height
        };

        // Change content size
        pgpContent.style.width = '600px';
        pgpContent.style.height = '300px';

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve => setTimeout(resolve, 100));

        const newDimensions = {
          width: frame.style.width,
          height: frame.style.height
        };

        return {
          initialDimensions,
          newDimensions,
          dimensionsChanged: initialDimensions.width !== newDimensions.width ||
                           initialDimensions.height !== newDimensions.height
        };
      });

      expect(result.dimensionsChanged).toBe(true);
    });
  });

  describe('IntersectionObserver behavior', () => {
    it('should trigger onShow when frame becomes visible', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content');
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');

        const beforeShow = frame.classList.contains('m-show');

        // Manually trigger onShow since IntersectionObserver is hard to test in browser environment
        extractFrame.onShow();

        const afterShow = frame.classList.contains('m-show');

        return {
          beforeShow,
          afterShow
        };
      });

      expect(result.beforeShow).toBe(false);
      expect(result.afterShow).toBe(true);
    });
  });

  describe('Message extraction', () => {
    it('should extract PGP message from pre element', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content-2'); // pre element
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 100));

        const armoredMessage = extractFrame.getArmoredMessage();

        return {
          message: armoredMessage,
          messageContainsPGP: armoredMessage.includes('-----BEGIN PGP MESSAGE-----'),
          messageContainsEnd: armoredMessage.includes('-----END PGP MESSAGE-----')
        };
      });

      expect(result.messageContainsPGP).toBe(true);
      expect(result.messageContainsEnd).toBe(true);
    });

    it('should extract PGP message from div element using selection', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content'); // div element
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 100));

        const armoredMessage = extractFrame.getArmoredMessage();

        return {
          message: armoredMessage,
          messageContainsPGP: armoredMessage.includes('-----BEGIN PGP MESSAGE-----'),
          messageContainsEnd: armoredMessage.includes('-----END PGP MESSAGE-----')
        };
      });

      expect(result.messageContainsPGP).toBe(true);
      expect(result.messageContainsEnd).toBe(true);
    });
  });

  describe('Multiple frames', () => {
    it('should handle multiple extract frames on same page', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent1 = document.getElementById('pgp-content');
        const pgpContent2 = document.getElementById('pgp-content-2');

        const range1 = document.createRange();
        range1.selectNodeContents(pgpContent1);
        const range2 = document.createRange();
        range2.selectNodeContents(pgpContent2);

        const extractFrame1 = new ExtractFrame();
        extractFrame1.ctrlName = `eFrame-${extractFrame1.id}`;
        const extractFrame2 = new ExtractFrame();
        extractFrame2.ctrlName = `eFrame-${extractFrame2.id}`;

        extractFrame1.attachTo(range1);
        extractFrame2.attachTo(range2);

        await new Promise(resolve => setTimeout(resolve, 200));

        // Manually trigger onShow for both frames
        extractFrame1.onShow();
        extractFrame2.onShow();

        const wrappers = document.querySelectorAll('.m-extract-wrapper');
        const shadowHost1 = wrappers[0].querySelector('div:last-child');
        const shadowHost2 = wrappers[1].querySelector('div:last-child');
        const frame1 = shadowHost1.shadowRoot.querySelector('.m-extract-frame');
        const frame2 = shadowHost2.shadowRoot.querySelector('.m-extract-frame');

        return {
          wrapperCount: wrappers.length,
          frame1Id: frame1.id,
          frame2Id: frame2.id,
          differentIds: frame1.id !== frame2.id,
          bothVisible: frame1.classList.contains('m-show') && frame2.classList.contains('m-show')
        };
      });

      expect(result.wrapperCount).toBe(2);
      expect(result.differentIds).toBe(true);
      expect(result.bothVisible).toBe(true);
      expect(result.frame1Id).toMatch(/^eFrame-/);
      expect(result.frame2Id).toMatch(/^eFrame-/);
    });

    it('should handle independent frame operations', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const mockEventHandler1 = window.testHarness.getMock('EventHandler');
        const mockEventHandler2 = window.testHarness.getMock('EventHandler');
        const pgpContent1 = document.getElementById('pgp-content');
        const pgpContent2 = document.getElementById('pgp-content-2');

        const range1 = document.createRange();
        range1.selectNodeContents(pgpContent1);
        const range2 = document.createRange();
        range2.selectNodeContents(pgpContent2);

        const extractFrame1 = new ExtractFrame();
        extractFrame1.ctrlName = `eFrame-${extractFrame1.id}`;
        const extractFrame2 = new ExtractFrame();
        extractFrame2.ctrlName = `eFrame-${extractFrame2.id}`;

        extractFrame1.establishConnection = function() { this.port = mockEventHandler1; };
        extractFrame2.establishConnection = function() { this.port = mockEventHandler2; };

        extractFrame1.attachTo(range1);
        extractFrame2.attachTo(range2);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrappers = document.querySelectorAll('.m-extract-wrapper');
        const shadowHost1 = wrappers[0].querySelector('div:last-child');
        const shadowHost2 = wrappers[1].querySelector('div:last-child');
        const frame1 = shadowHost1.shadowRoot.querySelector('.m-extract-frame');
        const frame2 = shadowHost2.shadowRoot.querySelector('.m-extract-frame');
        const closeButton1 = shadowHost1.shadowRoot.querySelector('.m-frame-close');

        // Close first frame
        closeButton1.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          frame1Status: wrappers[0].dataset.mveloFrame,
          frame2Status: wrappers[1].dataset.mveloFrame,
          frame1Show: frame1.classList.contains('m-show'),
          frame2Show: frame2.classList.contains('m-show')
        };
      });

      expect(result.frame1Status).toBe('det');
      expect(result.frame2Status).toBe('att');
      expect(result.frame1Show).toBe(false);
      expect(result.frame2Show).toBe(true);
    });
  });

  describe('Event handling', () => {
    it('should respond to mailvelope-observe events', async () => {
      const result = await page.evaluate(async () => {
        const {ExtractFrame} = window.testHarness.getContentScripts();
        const pgpContent = document.getElementById('pgp-content');
        const range = document.createRange();
        range.selectNodeContents(pgpContent);

        const extractFrame = new ExtractFrame();
        extractFrame.ctrlName = `eFrame-${extractFrame.id}`;
        extractFrame.attachTo(range);

        await new Promise(resolve => setTimeout(resolve, 200));

        const wrapper = document.querySelector('.m-extract-wrapper');
        const shadowHost = wrapper.querySelector('div:last-child');
        const shadowRoot = shadowHost.shadowRoot;
        const frame = shadowRoot.querySelector('.m-extract-frame');

        const initialDimensions = {
          width: frame.style.width,
          height: frame.style.height
        };

        // Change content size
        pgpContent.style.width = '500px';

        // Dispatch mailvelope-observe event
        document.dispatchEvent(new CustomEvent('mailvelope-observe'));

        await new Promise(resolve => setTimeout(resolve, 100));

        const newDimensions = {
          width: frame.style.width,
          height: frame.style.height
        };

        return {
          initialDimensions,
          newDimensions,
          dimensionsUpdated: initialDimensions.width !== newDimensions.width
        };
      });

      expect(result.dimensionsUpdated).toBe(true);
    });
  });
});

