// Service worker environment setup for background script tests (controller/, lib/, modules/)
import {Port} from './port-integration';
import localStorage from './localStorage';

export const setupServiceWorkerEnvironment = () => {
  // Service worker global context
  global.self = global;

  // Core JavaScript APIs (should already exist, but ensure they're available)
  global.console = console;
  global.JSON = JSON;
  global.Math = Math;
  global.Date = Date;
  global.RegExp = RegExp;

  // Timers (already available in Node.js, but ensure they're on global)
  global.setTimeout = setTimeout;
  global.setInterval = setInterval;
  global.clearTimeout = clearTimeout;
  global.clearInterval = clearInterval;

  // Fetch API
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: jest.fn(() => Promise.resolve({})),
      text: jest.fn(() => Promise.resolve('')),
      blob: jest.fn(() => Promise.resolve(new Blob())),
      headers: new Map()
    })
  );

  // URL APIs
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;

  // Text encoding/decoding
  if (typeof TextEncoder !== 'undefined') {
    global.TextEncoder = TextEncoder;
  } else {
    global.TextEncoder = class {
      encode(str) {
        return Buffer.from(str, 'utf8');
      }
    };
  }
  if (typeof TextDecoder !== 'undefined') {
    global.TextDecoder = TextDecoder;
  } else {
    global.TextDecoder = class {
      decode(buffer) {
        return Buffer.from(buffer).toString('utf8');
      }
    };
  }

  // Base64 encoding/decoding
  global.atob = str => Buffer.from(str, 'base64').toString('binary');
  global.btoa = str => Buffer.from(str, 'binary').toString('base64');

  // Crypto API
  global.crypto = {
    getRandomValues: jest.fn(array => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      generateKey: jest.fn().mockResolvedValue({}),
      importKey: jest.fn().mockResolvedValue({}),
      exportKey: jest.fn().mockResolvedValue({}),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      verify: jest.fn().mockResolvedValue(true),
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    }
  };

  // Storage APIs
  global.localStorage = localStorage;
  global.sessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0
  };

  // Setup Chrome extension API for service worker
  setupChromeExtensionAPI();
};

// Full Chrome extension API for service worker context
const setupChromeExtensionAPI = () => {
  // Port communication setup with integration support
  const listeners = [];
  const pendingPorts = [];

  global.chrome = {
    runtime: {
      id: 'kajibbejlbohfaggdiogboambcijhkke',
      sendMessage: jest.fn(),
      getURL: jest.fn(path => `chrome-extension://mock-id/${path}`),
      getManifest: jest.fn(() => ({
        oauth2: {client_id: '123'},
        version: '1.0.0',
        manifest_version: 3
      })),
      reload: jest.fn(),
      onInstalled: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onStartup: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onSuspend: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onConnect: {
        addListener(listener) {
          listeners.push(listener);
          while (pendingPorts.length) {
            listener(pendingPorts.shift());
          }
        },
        removeListener: jest.fn()
      },
      connect({name}) {
        const senderPort = Port.connect({name}, receiverPort => {
          if (!listeners.length) {
            pendingPorts.push(receiverPort);
            return;
          }
          listeners.forEach(listener => listener(receiverPort));
        });
        return senderPort;
      }
    },
    i18n: {
      getMessage: jest.fn(key => key),
      getUILanguage: jest.fn(() => 'en'),
      detectLanguage: jest.fn().mockResolvedValue({
        languages: [{language: 'en', percentage: 100}]
      })
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        clear: jest.fn().mockResolvedValue(),
        getBytesInUse: jest.fn().mockResolvedValue(0)
      },
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(),
        remove: jest.fn().mockResolvedValue(),
        clear: jest.fn().mockResolvedValue(),
        getBytesInUse: jest.fn().mockResolvedValue(0)
      },
      session: {
        set: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue({}),
        remove: jest.fn().mockResolvedValue(),
        getBytesInUse: jest.fn().mockResolvedValue(0)
      },
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    permissions: {
      contains: jest.fn().mockResolvedValue(true),
      request: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(true),
      getAll: jest.fn().mockResolvedValue({permissions: [], origins: []})
    },
    tabs: {
      query: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({id: 1}),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(),
      sendMessage: jest.fn().mockResolvedValue(),
      executeScript: jest.fn().mockResolvedValue(),
      insertCSS: jest.fn().mockResolvedValue(),
      onUpdated: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onRemoved: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    windows: {
      create: jest.fn().mockResolvedValue({id: 1}),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({}),
      getCurrent: jest.fn().mockResolvedValue({id: 1}),
      getAll: jest.fn().mockResolvedValue([]),
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onRemoved: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    action: {
      setBadgeText: jest.fn().mockResolvedValue(),
      setBadgeBackgroundColor: jest.fn().mockResolvedValue(),
      setIcon: jest.fn().mockResolvedValue(),
      setTitle: jest.fn().mockResolvedValue(),
      getBadgeText: jest.fn().mockResolvedValue(''),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    contextMenus: {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      removeAll: jest.fn().mockResolvedValue(),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    notifications: {
      create: jest.fn().mockResolvedValue('notification-id'),
      update: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(true),
      getAll: jest.fn().mockResolvedValue({}),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onClosed: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    alarms: {
      create: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      getAll: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(true),
      clearAll: jest.fn().mockResolvedValue(true),
      onAlarm: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },
    identity: {
      getAuthToken: jest.fn().mockResolvedValue('mock-token'),
      removeCachedAuthToken: jest.fn().mockResolvedValue(),
      launchWebAuthFlow: jest.fn().mockResolvedValue('https://redirect.url'),
      getRedirectURL: jest.fn(path => `https://mock-id.chromiumapp.org/${path || ''}`)
    }
  };
};

// Cleanup function
export const cleanupServiceWorkerEnvironment = () => {
  delete global.self;
  delete global.fetch;
  delete global.crypto;
  delete global.atob;
  delete global.btoa;
  delete global.localStorage;
  delete global.sessionStorage;
  delete global.chrome;
};
