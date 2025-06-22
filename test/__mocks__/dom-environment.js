// DOM environment setup for React component tests (app/, components/)

export const setupDOMEnvironment = () => {
  // URL API
  window.URL = window.URL || {};
  window.URL.createObjectURL = jest.fn(() =>
    `blob:http://localhost/${Math.random().toString(36).substr(2, 9)}`
  );
  window.URL.revokeObjectURL = jest.fn();

  // Form submission
  Object.defineProperty(window.HTMLFormElement.prototype, 'submit', {
    value: jest.fn(),
    writable: true,
    configurable: true
  });

  // Observers
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));

  window.IntersectionObserver = jest.fn().mockImplementation(() => ({
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
  window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
  window.cancelAnimationFrame = jest.fn();

  // Scrolling
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();

  // Window.close
  window.close = jest.fn();

  // Setup limited Chrome runtime API for UI components
  setupChromeRuntimeForUI();
};

// Chrome runtime API setup for UI components only
const setupChromeRuntimeForUI = () => {
  window.chrome = {
    runtime: {
      id: 'kajibbejlbohfaggdiogboambcijhkke',
      sendMessage: jest.fn(),
      connect: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onConnect: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      getURL: jest.fn(path => `chrome-extension://mock-id/${path}`),
      getManifest: jest.fn(() => ({oauth2: {client_id: '123'}})),
      reload: jest.fn()
    },
    permissions: {
      contains: jest.fn().mockResolvedValue(true),
      request: jest.fn().mockResolvedValue(true)
    },
    i18n: {
      getMessage: jest.fn(key => key)
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        clear: jest.fn().mockResolvedValue()
      },
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        clear: jest.fn().mockResolvedValue()
      },
      session: {
        set: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue({}),
        remove: jest.fn().mockResolvedValue(),
        getBytesInUse: jest.fn().mockResolvedValue(0)
      }
    }
  };
};

// Cleanup function
export const cleanupDOMEnvironment = () => {
  delete window.URL.createObjectURL;
  delete window.URL.revokeObjectURL;
  delete window.ResizeObserver;
  delete window.IntersectionObserver;
  delete window.matchMedia;
  delete window.requestAnimationFrame;
  delete window.cancelAnimationFrame;
  delete window.scrollTo;
  delete window.chrome;
};
