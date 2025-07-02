/**
 * Mock DOM utilities for unit tests
 * Only includes mocks for browser APIs that cannot be easily created in jsdom
 */

/**
 * Creates a mock Range object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock Range object
 */
export function createMockRange(overrides = {}) {
  const container = overrides.commonAncestorContainer || document.createElement('div');
  return {
    commonAncestorContainer: container,
    extractContents: jest.fn(() => document.createDocumentFragment()),
    insertNode: jest.fn(),
    selectNodeContents: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      width: 300,
      height: 100,
      top: 0,
      left: 0,
      right: 300,
      bottom: 100
    })),
    toString: jest.fn(() => ''),
    ...overrides
  };
}

/**
 * Creates a mock Selection object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock Selection object
 */
export function createMockSelection(overrides = {}) {
  return {
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    selectAllChildren: jest.fn(),
    toString: jest.fn(() => ''),
    getRangeAt: jest.fn(),
    rangeCount: 0,
    ...overrides
  };
}

/**
 * Creates a mock element with specific tagName behavior
 * @param {string} tagName - The tag name (e.g., 'pre', 'div')
 * @param {Object} additionalProps - Additional properties to add
 * @returns {Object} Mock element with tagName behavior
 */
export function createMockElementWithTagName(tagName, additionalProps = {}) {
  const element = document.createElement('div');

  // Add custom tagName behavior with parentElement that also has tagName
  const tagNameWithMethod = {
    toLowerCase: () => tagName.toLowerCase()
  };

  Object.defineProperty(element, 'parentElement', {
    value: {
      tagName: tagNameWithMethod
    },
    configurable: true
  });

  // Add any additional properties
  Object.assign(element, additionalProps);

  return element;
}

/**
 * Creates a mock element with ownerDocument that has getSelection
 * @param {Object} selection - Mock selection object
 * @returns {Object} Mock element with ownerDocument.getSelection
 */
export function createMockElementWithOwnerDocument(selection) {
  const element = document.createElement('div');

  Object.defineProperty(element, 'ownerDocument', {
    value: {
      getSelection: jest.fn(() => selection)
    },
    configurable: true
  });

  // Add parentElement that is not a pre element
  Object.defineProperty(element, 'parentElement', {
    value: {
      tagName: {
        toLowerCase: () => 'div'
      }
    },
    configurable: true
  });

  return element;
}
