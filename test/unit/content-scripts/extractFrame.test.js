import ExtractFrame from '../../../src/content-scripts/extractFrame';
import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED} from '../../../src/lib/constants';
import * as util from '../../../src/lib/util';
import {createMockRange, createMockSelection, createMockElementWithTagName, createMockElementWithOwnerDocument} from '../__mocks__/mockDOM';

jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/content-scripts/main', () => ({
  currentProvider: {
    getSender: jest.fn()
  }
}));
jest.mock('../../../src/content-scripts/extractFrame.css', () => '.m-extract-frame { display: block; }', {virtual: true});

jest.mock('../../../src/lib/util', () => require('../__mocks__/lib/util').default);

describe('ExtractFrame unit tests', () => {
  let extractFrame;
  let mockRange;
  let mockEventHandler;
  let mockIntersectionObserver;

  beforeEach(() => {
    // Mock Range - using centralized mock because Range is a browser API
    mockRange = createMockRange({
      toString: jest.fn(() => '-----BEGIN PGP MESSAGE-----\ntest message\n-----END PGP MESSAGE-----')
    });

    // Mock IntersectionObserver
    mockIntersectionObserver = {
      observe: jest.fn(),
      disconnect: jest.fn()
    };
    global.IntersectionObserver = jest.fn(() => mockIntersectionObserver);

    // Mock attachShadow
    Element.prototype.attachShadow = jest.fn(() => ({
      append: jest.fn()
    }));

    // Mock window methods
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
    global.setTimeout = jest.fn(fn => fn());

    // Setup parseHTML mock to return mock elements
    util.parseHTML.mockImplementation(() => {
      const mockElement = document.createElement('a');
      mockElement.className = 'm-frame-close';
      mockElement.textContent = '×';
      return [mockElement];
    });

    // Clear mock setup
    const MockEventHandler = require('../__mocks__/lib/EventHandler').default;
    MockEventHandler.clearMockResponses();

    extractFrame = new ExtractFrame();
    mockEventHandler = MockEventHandler.connect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(extractFrame.id).toBe('test-uuid-123');
      expect(extractFrame.pgpRange).toBeNull();
      expect(extractFrame.pgpElement).toBeNull();
      expect(extractFrame.domIntersectionObserver).toBeNull();
      expect(extractFrame.eFrame).toBeNull();
      expect(extractFrame.shadowRootElem).toBeNull();
      expect(extractFrame.port).toBeNull();
      expect(extractFrame.currentProvider).toBeDefined();
    });

    it('should bind methods correctly', () => {
      expect(typeof extractFrame.clickHandler).toBe('function');
      expect(typeof extractFrame.setFrameDim).toBe('function');
    });
  });

  describe('attachTo', () => {
    it('should call all initialization methods in correct order', () => {
      extractFrame.init = jest.fn();
      extractFrame.establishConnection = jest.fn();
      extractFrame.renderFrame = jest.fn();
      extractFrame.registerEventListener = jest.fn();

      extractFrame.attachTo(mockRange);

      expect(extractFrame.init).toHaveBeenCalledWith(mockRange);
      expect(extractFrame.establishConnection).toHaveBeenCalled();
      expect(extractFrame.renderFrame).toHaveBeenCalled();
      expect(extractFrame.registerEventListener).toHaveBeenCalled();
    });
  });

  describe('init', () => {
    it('should use existing wrapper element if present', () => {
      mockRange.commonAncestorContainer.classList.add('m-extract-wrapper');

      extractFrame.init(mockRange);

      expect(extractFrame.pgpRange).toBe(mockRange);
      expect(extractFrame.pgpElement).toBe(mockRange.commonAncestorContainer);
      expect(extractFrame.pgpElement.dataset[FRAME_STATUS]).toBe(FRAME_ATTACHED);
    });

    it('should create new wrapper element when none exists', () => {
      extractFrame.init(mockRange);

      expect(extractFrame.pgpRange).toBe(mockRange);
      expect(extractFrame.pgpElement).toBeDefined();
      expect(extractFrame.pgpElement.classList.contains('m-extract-wrapper')).toBe(true);
      expect(extractFrame.pgpElement.style.display).toBe('inline-block');
      expect(extractFrame.pgpElement.style.position).toBe('relative');
      expect(extractFrame.pgpElement.dataset[FRAME_STATUS]).toBe(FRAME_ATTACHED);
      expect(mockRange.extractContents).toHaveBeenCalled();
      expect(mockRange.insertNode).toHaveBeenCalledWith(extractFrame.pgpElement);
      expect(mockRange.selectNodeContents).toHaveBeenCalledWith(extractFrame.pgpElement);
    });
  });

  describe('establishConnection', () => {
    it('should establish EventHandler connection', () => {
      extractFrame.establishConnection();

      expect(extractFrame.port).toBeDefined();
    });
  });

  describe('clickHandler', () => {
    beforeEach(() => {
      extractFrame.eFrame = document.createElement('div');
      extractFrame.eFrame.addEventListener = jest.fn();
      extractFrame.eFrame.removeEventListener = jest.fn();
      extractFrame.eFrame.classList.add('m-cursor');
      extractFrame.toggleIcon = jest.fn();
    });

    it('should remove event listener and cursor class', () => {
      const mockCallback = jest.fn();
      const mockEvent = {stopPropagation: jest.fn()};

      extractFrame.clickHandler(mockCallback, mockEvent);

      expect(extractFrame.eFrame.removeEventListener).toHaveBeenCalledWith('click', extractFrame.clickHandler);
      expect(extractFrame.toggleIcon).toHaveBeenCalledWith(mockCallback);
      expect(extractFrame.eFrame.classList.contains('m-cursor')).toBe(false);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle call without event parameter', () => {
      const mockCallback = jest.fn();

      extractFrame.clickHandler(mockCallback);

      expect(extractFrame.eFrame.removeEventListener).toHaveBeenCalled();
      expect(extractFrame.toggleIcon).toHaveBeenCalledWith(mockCallback);
    });
  });

  describe('onShow', () => {
    beforeEach(() => {
      extractFrame.eFrame = document.createElement('div');
      extractFrame.eFrame.classList.add('m-show');
      extractFrame.setFrameDim = jest.fn();
    });

    it('should set frame dimensions and show classes', () => {
      extractFrame.onShow();

      expect(extractFrame.setFrameDim).toHaveBeenCalled();
      expect(extractFrame.eFrame.classList.contains('m-show')).toBe(true);
    });
  });

  describe('closeFrame', () => {
    beforeEach(() => {
      // Use real DOM elements where possible
      extractFrame.eFrame = document.createElement('div');
      extractFrame.eFrame.classList.add('m-show');
      extractFrame.shadowRootElem = document.createElement('div');

      // For pgpElement, we need to mock parentNode and remove because these behaviors are specific to the test
      extractFrame.pgpElement = {
        dataset: {},
        parentNode: {
          prepend: jest.fn()
        },
        remove: jest.fn()
      };

      extractFrame.pgpRange = mockRange;
      extractFrame.port = mockEventHandler;
      extractFrame.domIntersectionObserver = mockIntersectionObserver;
    });

    it('should handle reset and disconnect close', () => {
      const mockEvent = new Event('click');
      mockEvent.stopPropagation = jest.fn();

      extractFrame.closeFrame(true, true, mockEvent);

      expect(extractFrame.eFrame.classList.contains('m-show')).toBe(false);
      expect(mockIntersectionObserver.disconnect).toHaveBeenCalled();
      expect(global.removeEventListener).toHaveBeenCalledWith('resize', extractFrame.setFrameDim);
      expect(extractFrame.pgpElement.remove).toHaveBeenCalled();
      expect(extractFrame.port.disconnect).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle simple close without reset or disconnect', () => {
      extractFrame.closeFrame(false, false);

      expect(extractFrame.eFrame.classList.contains('m-show')).toBe(false);
      expect(extractFrame.pgpElement.dataset[FRAME_STATUS]).toBe(FRAME_DETACHED);
      expect(extractFrame.pgpElement.remove).not.toHaveBeenCalled();
      expect(extractFrame.port.disconnect).not.toHaveBeenCalled();
    });

    it('should handle event parameter correctly', () => {
      const mockEvent = new Event('click');
      mockEvent.stopPropagation = jest.fn();

      extractFrame.closeFrame(false, false, mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('toggleIcon', () => {
    beforeEach(() => {
      extractFrame.eFrame = document.createElement('div');
      extractFrame.eFrame.addEventListener = jest.fn();
      extractFrame.eFrame.classList.toggle = jest.fn();
    });

    it('should toggle m-open class and add callback listener', () => {
      const mockCallback = jest.fn();

      extractFrame.toggleIcon(mockCallback);

      expect(extractFrame.eFrame.addEventListener).toHaveBeenCalledWith('transitionend', mockCallback, {once: true});
      expect(extractFrame.eFrame.classList.toggle).toHaveBeenCalledWith('m-open');
    });

    it('should toggle class without callback', () => {
      extractFrame.toggleIcon();

      expect(extractFrame.eFrame.addEventListener).not.toHaveBeenCalled();
      expect(extractFrame.eFrame.classList.toggle).toHaveBeenCalledWith('m-open');
    });
  });

  describe('setFrameDim', () => {
    beforeEach(() => {
      extractFrame.pgpRange = mockRange;
      extractFrame.eFrame = document.createElement('div');
    });

    it('should set frame dimensions based on range', () => {
      extractFrame.setFrameDim();

      expect(mockRange.getBoundingClientRect).toHaveBeenCalled();
      expect(extractFrame.eFrame.style.width).toBe('300px');
      expect(extractFrame.eFrame.style.height).toBe('100px');
    });

    it('should return early if no width or height', () => {
      mockRange.getBoundingClientRect.mockReturnValue({width: 0, height: 0});
      const initialWidth = extractFrame.eFrame.style.width;

      extractFrame.setFrameDim();

      expect(extractFrame.eFrame.style.width).toBe(initialWidth);
    });
  });

  describe('getArmoredMessage', () => {
    beforeEach(() => {
      extractFrame.pgpRange = mockRange;
    });

    it('should get message from pre element without br tags', () => {
      // Use centralized mock for element with specific tagName behavior
      extractFrame.pgpElement = createMockElementWithTagName('pre', {
        querySelectorAll: jest.fn(() => [])
      });

      const result = extractFrame.getArmoredMessage();

      expect(mockRange.toString).toHaveBeenCalled();
      expect(result).toBe('-----BEGIN PGP MESSAGE-----\ntest message\n-----END PGP MESSAGE-----');
    });

    it('should get message using selection for other elements', () => {
      // Use centralized mocks for Selection and ownerDocument
      const mockSelection = createMockSelection({
        toString: jest.fn(() => 'selected message')
      });

      // createMockElementWithOwnerDocument already includes a div parentElement
      extractFrame.pgpElement = createMockElementWithOwnerDocument(mockSelection);

      const result = extractFrame.getArmoredMessage();

      expect(mockSelection.removeAllRanges).toHaveBeenCalledTimes(2);
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
      expect(mockSelection.toString).toHaveBeenCalled();
      expect(result).toBe('selected message');
    });
  });

  describe('getPGPMessage', () => {
    beforeEach(() => {
      extractFrame.getArmoredMessage = jest.fn(() => 'raw message');
      extractFrame.typeRegex = /test/;
    });

    it('should normalize armored message', () => {
      const result = extractFrame.getPGPMessage();

      expect(extractFrame.getArmoredMessage).toHaveBeenCalled();
      expect(util.normalizeArmored).toHaveBeenCalledWith('raw message', extractFrame.typeRegex);
      expect(result).toBe('raw message');
    });
  });

  describe('getEmailSender', () => {
    it('should delegate to currentProvider.getSender', () => {
      // Use real DOM element
      extractFrame.pgpElement = document.createElement('div');
      extractFrame.currentProvider.getSender.mockReturnValue('test@example.com');

      const result = extractFrame.getEmailSender();

      expect(extractFrame.currentProvider.getSender).toHaveBeenCalledWith(extractFrame.pgpElement);
      expect(result).toBe('test@example.com');
    });
  });

  describe('registerEventListener', () => {
    beforeEach(() => {
      extractFrame.port = mockEventHandler;
      extractFrame.closeFrame = jest.fn();
      document.addEventListener = jest.fn();
    });

    it('should register all event listeners', () => {
      extractFrame.registerEventListener();

      expect(document.addEventListener).toHaveBeenCalledWith('mailvelope-observe', extractFrame.setFrameDim);
      expect(extractFrame.port.on).toHaveBeenCalledWith('destroy', expect.any(Function));
      expect(extractFrame.port.onUninstall.addListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call closeFrame when destroy event is received', () => {
      extractFrame.registerEventListener();

      const destroyCallback = extractFrame.port.on.mock.calls.find(call => call[0] === 'destroy')[1];
      destroyCallback();

      expect(extractFrame.closeFrame).toHaveBeenCalledWith(true, true);
    });

    it('should call closeFrame when uninstall event is received', () => {
      extractFrame.registerEventListener();

      const uninstallCallback = extractFrame.port.onUninstall.addListener.mock.calls[0][0];
      uninstallCallback();

      expect(extractFrame.closeFrame).toHaveBeenCalledWith(true, false);
    });
  });
});

