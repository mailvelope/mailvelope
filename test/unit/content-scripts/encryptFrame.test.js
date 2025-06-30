import EncryptFrame from '../../../src/content-scripts/encryptFrame';
import * as l10n from '../../../src/lib/l10n';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED} from '../../../src/lib/constants';

jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/content-scripts/main', () => ({
  currentProvider: {
    getRecipients: jest.fn(),
    setRecipients: jest.fn()
  }
}));

describe('EncryptFrame unit tests', () => {
  let encryptFrame;
  let mockTextarea;
  let mockContentEditable;
  let mockEventHandler;

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    // Mock DOM elements
    mockTextarea = document.createElement('textarea');
    mockTextarea.value = 'Hello World';
    mockTextarea.style.offsetTop = 100;
    mockContentEditable = document.createElement('div');
    mockContentEditable.contentEditable = true;
    mockContentEditable.innerHTML = 'Hello <b>World</b>';
    mockContentEditable.style.offsetTop = 200;
    // Mock attachShadow if needed
    const mockShadowRoot = document.createElement('div');
    mockShadowRoot.append = jest.fn();
    // Mock document methods
    document.createEvent = jest.fn(() => ({
      initEvent: jest.fn()
    }));
    // Mock window getSelection
    window.getSelection = jest.fn(() => ({
      selectAllChildren: jest.fn(),
      removeAllRanges: jest.fn(),
      toString: jest.fn(() => 'Hello World')
    }));
    // Clear mock setup
    const MockEventHandler = require('../__mocks__/lib/EventHandler').default;
    MockEventHandler.clearMockResponses();
    encryptFrame = new EncryptFrame();
    mockEventHandler = MockEventHandler.connect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(encryptFrame.id).toBeDefined();
      expect(encryptFrame.editElement).toBeNull();
      expect(encryptFrame.eFrame).toBeNull();
      expect(encryptFrame.port).toBeNull();
      expect(encryptFrame.emailTextElement).toBeNull();
      expect(encryptFrame.keyCounter).toBe(0);
      expect(encryptFrame.currentProvider).toBeDefined();
    });
  });

  describe('init', () => {
    it('should initialize with textarea element', () => {
      encryptFrame.init(mockTextarea);

      expect(encryptFrame.editElement).toBe(mockTextarea);
      expect(encryptFrame.editElement.dataset[FRAME_STATUS]).toBe(FRAME_ATTACHED);
      expect(encryptFrame.emailTextElement).toBe(mockTextarea);
    });

    it('should initialize with contenteditable element', () => {
      encryptFrame.init(mockContentEditable);

      expect(encryptFrame.editElement).toBe(mockContentEditable);
      expect(encryptFrame.editElement.dataset[FRAME_STATUS]).toBe(FRAME_ATTACHED);
      expect(encryptFrame.emailTextElement).toBe(mockContentEditable);
    });

    it('should handle iframe element', () => {
      const mockIframe = document.createElement('iframe');
      const mockBody = document.createElement('body');
      Object.defineProperty(mockIframe, 'contentDocument', {
        value: {body: mockBody},
        writable: true
      });
      encryptFrame.init(mockIframe);

      expect(encryptFrame.editElement).toBe(mockIframe);
      expect(encryptFrame.emailTextElement).toBe(mockBody);
    });
  });

  describe('establishConnection', () => {
    it('should establish port connection', () => {
      encryptFrame.establishConnection();

      expect(encryptFrame.port).toBeDefined();
      expect(encryptFrame.port.onUninstall.addListener).toHaveBeenCalled();
    });
  });

  describe('getEmailText', () => {
    beforeEach(() => {
      encryptFrame.emailTextElement = mockTextarea;
    });

    it('should get text from textarea', () => {
      const text = encryptFrame.getEmailText('text');

      expect(text).toBe('Hello World');
    });

    it('should get text from contenteditable element', () => {
      encryptFrame.emailTextElement = mockContentEditable;
      const text = encryptFrame.getEmailText('text');

      expect(window.getSelection).toHaveBeenCalled();
      expect(text).toBe('Hello World');
    });

    it('should get HTML from contenteditable element', () => {
      encryptFrame.emailTextElement = mockContentEditable;
      const html = encryptFrame.getEmailText('html');

      expect(html).toBe('Hello <b>World</b>');
    });
  });

  describe('setMessage', () => {
    let mockDispatchEvent;

    beforeEach(() => {
      mockDispatchEvent = jest.fn();
      mockTextarea.dispatchEvent = mockDispatchEvent;
      mockContentEditable.dispatchEvent = mockDispatchEvent;
      encryptFrame.emailTextElement = mockTextarea;
    });

    it('should set message in textarea', () => {
      const message = 'Encrypted message';
      encryptFrame.setMessage(message);

      expect(mockTextarea.value).toBe(message);
      expect(mockDispatchEvent).toHaveBeenCalled();
    });

    it('should set message in contenteditable element', () => {
      encryptFrame.emailTextElement = mockContentEditable;
      const message = 'Encrypted message';
      encryptFrame.setMessage(message);

      expect(mockContentEditable.innerHTML).toBe('<pre>Encrypted message</pre>');
      expect(mockDispatchEvent).toHaveBeenCalled();
    });

    it('should escape HTML in contenteditable element', () => {
      encryptFrame.emailTextElement = mockContentEditable;
      const message = '<script>alert("xss")</script>';
      encryptFrame.setMessage(message);

      expect(mockContentEditable.innerHTML).toBe('<pre>&lt;script&gt;alert("xss")&lt;/script&gt;</pre>');
    });

    it('should clear existing content before setting new message', () => {
      const child1 = document.createElement('div');
      const child2 = document.createElement('div');
      mockContentEditable.appendChild(child1);
      mockContentEditable.appendChild(child2);
      encryptFrame.emailTextElement = mockContentEditable;
      encryptFrame.setMessage('New message');

      expect(mockContentEditable.childNodes.length).toBe(1);
      expect(mockContentEditable.innerHTML).toBe('<pre>New message</pre>');
    });
  });

  describe('setEditorOutput', () => {
    beforeEach(() => {
      encryptFrame.normalizeButtons = jest.fn();
      encryptFrame.setMessage = jest.fn();
      encryptFrame.editElement = mockTextarea;
    });

    it('should set encrypted message and recipients', () => {
      const recipients = [{email: 'test@example.com'}, {email: 'test2@example.com'}];
      const encryptedText = '-----BEGIN PGP MESSAGE-----\n...\n-----END PGP MESSAGE-----';
      encryptFrame.setEditorOutput({
        text: encryptedText,
        to: recipients
      });

      expect(encryptFrame.normalizeButtons).toHaveBeenCalled();
      expect(encryptFrame.setMessage).toHaveBeenCalledWith(encryptedText);
      expect(encryptFrame.currentProvider.setRecipients).toHaveBeenCalledWith({
        recipients,
        editElement: mockTextarea
      });
    });

    it('should handle empty recipients', () => {
      encryptFrame.setEditorOutput({
        text: 'encrypted',
        to: []
      });

      expect(encryptFrame.currentProvider.setRecipients).toHaveBeenCalledWith({
        recipients: [],
        editElement: mockTextarea
      });
    });
  });

  describe('showMailEditor', () => {
    beforeEach(() => {
      encryptFrame.port = mockEventHandler;
      encryptFrame.editElement = mockTextarea;
      encryptFrame.emailTextElement = mockTextarea;
      encryptFrame.currentProvider.getRecipients.mockResolvedValue([{email: 'test@example.com'}]);
    });

    it('should emit display editor with plain text', async () => {
      mockTextarea.value = 'Plain text message';
      await encryptFrame.showMailEditor();

      expect(encryptFrame.port.emit).toHaveBeenCalledWith('eframe-display-editor', {
        text: 'Plain text message',
        recipients: [{email: 'test@example.com'}]
      });
    });

    it('should detect and normalize PGP message', async () => {
      mockTextarea.value = 'Some text\n-----BEGIN PGP MESSAGE-----\nEncrypted content\n-----END PGP MESSAGE-----\nMore text';
      await encryptFrame.showMailEditor();

      expect(encryptFrame.port.emit).toHaveBeenCalledWith('eframe-display-editor', {
        quotedMail: '-----BEGIN PGP MESSAGE-----\n\nEncrypted content\n-----END PGP MESSAGE-----',
        recipients: [{email: 'test@example.com'}]
      });
    });

    it('should handle invalid PGP message format', async () => {
      mockTextarea.value = '-----BEGIN PGP MESSAGE-----\nInvalid format';
      await encryptFrame.showMailEditor();

      expect(encryptFrame.port.emit).toHaveBeenCalledWith('eframe-display-editor', {
        text: '-----BEGIN PGP MESSAGE-----\nInvalid format',
        recipients: [{email: 'test@example.com'}]
      });
    });
  });

  describe('handleKeypress', () => {
    beforeEach(() => {
      encryptFrame.emailTextElement = mockTextarea;
      encryptFrame.eFrame = document.createElement('div');
      encryptFrame.eFrame.classList.add('m-show');
      encryptFrame.closeFrame = jest.fn();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should close frame after 13 keypresses', () => {
      const removeEventListener = jest.fn();
      encryptFrame.emailTextElement.removeEventListener = removeEventListener;
      // Simulate 13 keypresses
      for (let i = 0; i < 13; i++) {
        encryptFrame.handleKeypress();
      }

      expect(encryptFrame.keyCounter).toBe(13);
      expect(removeEventListener).toHaveBeenCalledWith('keypress', encryptFrame.handleKeypress);
      expect(encryptFrame.eFrame.classList.contains('m-show')).toBe(false);

      jest.runAllTimers();
      expect(encryptFrame.closeFrame).toHaveBeenCalled();
    });

    it('should not close frame with fewer than 13 keypresses', () => {
      for (let i = 0; i < 12; i++) {
        encryptFrame.handleKeypress();
      }

      expect(encryptFrame.keyCounter).toBe(12);
      expect(encryptFrame.eFrame.classList.contains('m-show')).toBe(true);
      expect(encryptFrame.closeFrame).not.toHaveBeenCalled();
    });
  });

  describe('closeFrame', () => {
    beforeEach(() => {
      encryptFrame.eFrame = document.createElement('div');
      encryptFrame.eFrame.classList.add('m-show');
      encryptFrame.eFrame.remove = jest.fn();
      encryptFrame.editElement = mockTextarea;
      encryptFrame.port = mockEventHandler;
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle final close', () => {
      encryptFrame.closeFrame(true);

      expect(encryptFrame.eFrame.classList.contains('m-show')).toBe(false);

      jest.runAllTimers();
      expect(encryptFrame.eFrame.remove).toHaveBeenCalled();
      expect(encryptFrame.port.disconnect).toHaveBeenCalled();
      expect(encryptFrame.editElement.dataset[FRAME_STATUS]).toBe('');
    });

    it('should handle temporary close', () => {
      encryptFrame.closeFrame(false);

      expect(encryptFrame.eFrame.classList.contains('m-show')).toBe(false);

      jest.runAllTimers();
      expect(encryptFrame.eFrame.remove).toHaveBeenCalled();
      expect(encryptFrame.port.disconnect).not.toHaveBeenCalled();
      expect(encryptFrame.editElement.dataset[FRAME_STATUS]).toBe(FRAME_DETACHED);
    });

    it('should stop event propagation when called with event', () => {
      const mockEvent = new Event('click');
      mockEvent.stopPropagation = jest.fn();
      encryptFrame.closeFrame(false, mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('setFrameDim', () => {
    beforeEach(() => {
      encryptFrame.editElement = mockTextarea;
      Object.defineProperty(encryptFrame.editElement, 'offsetTop', {
        value: 150,
        writable: true
      });
      encryptFrame.eFrame = document.createElement('div');
    });

    it('should set frame position based on edit element', () => {
      encryptFrame.setFrameDim();

      expect(encryptFrame.eFrame.style.top).toBe('155px');
      expect(encryptFrame.eFrame.style.right).toBe('20px');
    });
  });

  describe('registerEventListener', () => {
    beforeEach(() => {
      encryptFrame.port = mockEventHandler;
      document.addEventListener = jest.fn();
    });

    it('should register all event listeners', () => {
      encryptFrame.registerEventListener();

      expect(document.addEventListener).toHaveBeenCalledWith('mailvelope-observe', encryptFrame.setFrameDim);
      expect(encryptFrame.port.on).toHaveBeenCalledWith('set-editor-output', expect.any(Function));
      expect(encryptFrame.port.on).toHaveBeenCalledWith('destroy', expect.any(Function));
      expect(encryptFrame.port.on).toHaveBeenCalledWith('mail-editor-close', expect.any(Function));
    });
  });
});
