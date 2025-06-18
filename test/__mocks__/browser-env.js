// Browser environment setup utilities for Jest tests
export const setupBrowserAPIs = () => {
  // URL API
  global.URL = global.URL || {};
  global.URL.createObjectURL = jest.fn(() =>
    `blob:http://localhost/${Math.random().toString(36).substr(2, 9)}`
  );
  global.URL.revokeObjectURL = jest.fn();

  // Form submission
  Object.defineProperty(window.HTMLFormElement.prototype, 'submit', {
    value: jest.fn(),
    writable: true,
    configurable: true
  });

  // Observers
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));

  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));

  // Media queries
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });

  // Animation
  global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
  global.cancelAnimationFrame = jest.fn();

  // Scrolling
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();

  // Window.close
  window.close = jest.fn();

  // jQuery (if needed by legacy components)
  global.jQuery = global.$ = {
    fn: {},
    extend: jest.fn()
  };
};

// Cleanup function
export const cleanupBrowserAPIs = () => {
  delete global.URL.createObjectURL;
  delete global.URL.revokeObjectURL;
  delete global.ResizeObserver;
  delete global.IntersectionObserver;
  delete window.matchMedia;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  delete window.scrollTo;
  delete global.jQuery;
  delete global.$;
};
